// src/components/AuthForm.tsx
import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail } from '@/hooks/useAuthActions';

export default function AuthForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'login' | 'signup'>('login');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'signup') {
            const { error } = await signUpWithEmail(email, password);
            if (error) alert(error.message);
            else alert('Check your email for confirmation (if enabled)');
        } else {
            const { error } = await signInWithEmail(email, password);
            if (error) alert(error.message);
        }
    };

    return (
        <form onSubmit={submit}>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" />
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="password" type="password" />
            <button type="submit">{mode === 'login' ? 'Sign in' : 'Sign up'}</button>
            <button type="button" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                Switch to {mode === 'login' ? 'Signup' : 'Login'}
            </button>
        </form>
    );
}
