/**
 * Sign in with the login ID + password your admin gave you. There is no sign-up and no
 * Google button on purpose: only the owner creates staff accounts (admin → Team).
 */
import React, { useState } from 'react';
import { Button, Field, INPUT, PasswordInput } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useSession } from '@/lib/session';
import AuthLayout from './AuthLayout';

export default function LoginPage() {
    const { refresh, notice } = useSession();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loginId.trim() || !password) return;
        setBusy(true);
        setError(null);
        try {
            await api('/staff/auth/login', { method: 'POST', body: { login_id: loginId.trim().toLowerCase(), password } });
            setPassword('');
            await refresh();
        } catch (err) {
            setError(errorMessage(err));
            setPassword('');
        } finally {
            setBusy(false);
        }
    };

    return (
        <AuthLayout
            title="Sign in"
            subtitle="Use the login ID and password from your admin."
            footer={<>Forgot your password or lost your phone? Ask your admin to reset it. We never send reset links by email.</>}
        >
            {(error || notice) && (
                <p className={`mb-4 rounded-xl px-3.5 py-2.5 text-[14px] ${error ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`} role="alert">
                    {error || notice}
                </p>
            )}
            <form onSubmit={submit} className="space-y-4" noValidate>
                <Field label="Login ID" id="login-id">
                    <input
                        id="login-id"
                        className={INPUT}
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value.replace(/\s/g, ''))}
                        autoComplete="username"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={64}
                        placeholder="priya.s"
                        autoFocus
                    />
                </Field>
                <Field label="Password" id="password">
                    <PasswordInput
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        maxLength={128}
                    />
                </Field>
                <Button type="submit" size="lg" className="w-full" busy={busy} disabled={!loginId.trim() || !password}>
                    Continue
                </Button>
            </form>
        </AuthLayout>
    );
}
