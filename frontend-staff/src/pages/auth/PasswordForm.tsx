/**
 * Change password: required at first sign-in (replaces the temporary one) and available
 * any time from Account. The server checks the same rules (app/core/staff_security.py).
 */
import { Check, Circle } from 'lucide-react';
import React, { useState } from 'react';
import { Button, Field, PasswordInput, cx } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
    return (
        <li className={cx('flex items-center gap-2 text-[13px]', ok ? 'text-emerald-700' : 'text-slate-500')}>
            {ok ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
            {children}
        </li>
    );
}

export default function PasswordForm({ loginId, currentLabel, submitLabel, onDone }: {
    loginId: string;
    currentLabel: string;
    submitLabel: string;
    onDone: () => void | Promise<void>;
}) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [again, setAgain] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const longEnough = next.length >= 12;
    const noId = !!next && !next.toLowerCase().includes(loginId.toLowerCase());
    const matches = !!next && next === again;
    const ok = longEnough && noId && matches && !!current;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ok) return;
        setBusy(true);
        setError(null);
        try {
            await api('/staff/auth/password', { method: 'POST', body: { current_password: current, new_password: next } });
            setCurrent('');
            setNext('');
            setAgain('');
            await onDone();
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[14px] text-rose-700" role="alert">{error}</p>}
            {/* Hidden username helps password managers save the right entry. */}
            <input type="text" name="username" autoComplete="username" value={loginId} readOnly hidden />
            <Field label={currentLabel} id="current-password">
                <PasswordInput id="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" maxLength={128} />
            </Field>
            <Field label="New password" id="new-password">
                <PasswordInput id="new-password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" maxLength={128} />
            </Field>
            <Field label="Type it again" id="new-password-again">
                <PasswordInput id="new-password-again" value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" maxLength={128} />
            </Field>
            <ul className="space-y-1 rounded-xl bg-slate-50 px-3.5 py-3">
                <Rule ok={longEnough}>At least 12 characters (a short sentence is easiest)</Rule>
                <Rule ok={noId}>Doesn’t contain your login ID</Rule>
                <Rule ok={matches}>Both boxes match</Rule>
            </ul>
            <Button type="submit" size="lg" className="w-full" busy={busy} disabled={!ok}>
                {submitLabel}
            </Button>
        </form>
    );
}
