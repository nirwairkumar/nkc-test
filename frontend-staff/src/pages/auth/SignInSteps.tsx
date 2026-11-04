/**
 * The steps between "password accepted" and the dashboard:
 *   change_password → setup_2fa → (dashboard)        first sign-in
 *   verify_2fa → (dashboard)                         every later sign-in
 */
import { Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import QrImage from '@/components/QrImage';
import { Button, CodeInput, Field, Skeleton } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import AuthLayout from './AuthLayout';
import PasswordForm from './PasswordForm';

function StartOver() {
    const { signOut } = useSession();
    return (
        <button type="button" onClick={() => void signOut()} className="font-semibold text-slate-600 underline-offset-2 hover:underline">
            Start over
        </button>
    );
}

function CodeForm({ submitLabel, onVerified }: { submitLabel: string; onVerified: () => Promise<void> }) {
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const verify = async (value: string) => {
        if (value.length !== 6 || busy) return;
        setBusy(true);
        setError(null);
        try {
            await api('/staff/auth/2fa/verify', { method: 'POST', body: { code: value } });
            await onVerified();
        } catch (err) {
            setError(errorMessage(err));
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); void verify(code); }} className="space-y-4" noValidate>
            {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[14px] text-rose-700" role="alert">{error}</p>}
            <Field label="6-digit code" id="code">
                <CodeInput id="code" value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} />
            </Field>
            <Button type="submit" size="lg" className="w-full" busy={busy} disabled={code.length !== 6}>
                {submitLabel}
            </Button>
        </form>
    );
}

function ChangePasswordStep() {
    const { me, refresh } = useSession();
    return (
        <AuthLayout
            step={{ at: 1, of: 2 }}
            title="Choose your password"
            subtitle={<>Hi {me?.account.full_name.split(' ')[0]}. Replace the temporary password with one only you know.</>}
            footer={<StartOver />}
        >
            <PasswordForm
                loginId={me?.account.login_id ?? ''}
                currentLabel="Temporary password"
                submitLabel="Save and continue"
                onDone={refresh}
            />
        </AuthLayout>
    );
}

function SetupTwoStep() {
    const { refresh } = useSession();
    const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const asked = useRef(false);

    const start = async () => {
        setError(null);
        try {
            setSetup(await api<{ secret: string; uri: string }>('/staff/auth/2fa/setup', { method: 'POST' }));
        } catch (err) {
            setError(errorMessage(err));
        }
    };

    useEffect(() => {
        // Once per visit (React dev mode runs effects twice; two secrets would mismatch).
        if (asked.current) return;
        asked.current = true;
        void start();
    }, []);

    return (
        <AuthLayout
            step={{ at: 2, of: 2 }}
            title="Set up 2-step sign-in"
            subtitle="Each time you sign in you’ll also type a 6-digit code from your phone. A stolen password alone can’t get in."
            footer={<><StartOver /> · Lost your phone later? Your admin can reset this.</>}
        >
            <ol className="space-y-5">
                <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[13px] font-bold text-white">1</span>
                    <p className="pt-0.5 text-[14px] leading-relaxed text-slate-700">
                        On your phone, install <b>Google Authenticator</b> or <b>Microsoft Authenticator</b> (free, from the app store).
                    </p>
                </li>
                <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[13px] font-bold text-white">2</span>
                    <div className="min-w-0 flex-1 text-[14px] leading-relaxed text-slate-700">
                        <p>In the app tap <b>+</b>, then <b>Scan a QR code</b>, and point the camera here:</p>
                        <div className="mt-3 flex justify-center">
                            {error ? (
                                <div className="text-center">
                                    <p className="text-[14px] text-rose-700">{error}</p>
                                    <Button variant="secondary" size="sm" className="mt-2" onClick={() => void start()}>Try again</Button>
                                </div>
                            ) : setup ? <QrImage value={setup.uri} /> : <Skeleton className="h-52 w-52 rounded-2xl" />}
                        </div>
                        {setup && (
                            <details className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5">
                                <summary className="cursor-pointer text-[13px] font-semibold text-slate-600">Can’t scan? Type this key instead</summary>
                                <p className="mt-2 select-all break-all font-mono text-[15px] font-semibold tracking-wider text-slate-900">
                                    {setup.secret.match(/.{1,4}/g)?.join(' ')}
                                </p>
                                <p className="mt-1 text-[12px] text-slate-500">Account: TestoZa Team. Type: time based.</p>
                            </details>
                        )}
                    </div>
                </li>
                <li className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[13px] font-bold text-white">3</span>
                    <div className="min-w-0 flex-1">
                        <p className="mb-3 pt-0.5 text-[14px] leading-relaxed text-slate-700">Type the 6-digit code the app shows for <b>TestoZa Team</b>.</p>
                        <CodeForm submitLabel="Turn on and continue" onVerified={refresh} />
                    </div>
                </li>
            </ol>
        </AuthLayout>
    );
}

function VerifyTwoStep() {
    const { refresh, me } = useSession();
    return (
        <AuthLayout
            title="Enter your code"
            subtitle={<>Open your authenticator app and type the 6-digit code for <b>TestoZa Team</b>{me ? ` (${me.account.login_id})` : ''}.</>}
            footer={<><StartOver /> · Lost your phone? Ask your admin to reset 2-step.</>}
        >
            <div className="mb-5 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Smartphone className="h-7 w-7" aria-hidden="true" />
                </span>
            </div>
            <CodeForm submitLabel="Sign in" onVerified={refresh} />
        </AuthLayout>
    );
}

export default function SignInSteps() {
    const { me } = useSession();
    if (me?.next === 'change_password') return <ChangePasswordStep />;
    if (me?.next === 'setup_2fa') return <SetupTwoStep />;
    return <VerifyTwoStep />;
}
