import { LogOut, ShieldCheck } from 'lucide-react';
import React from 'react';
import { useToast } from '@/components/Toast';
import { Button, CARD, Chip, PageTitle, cx } from '@/components/ui';
import { dateOnly } from '@/lib/format';
import { useSession } from '@/lib/session';
import PasswordForm from './auth/PasswordForm';

export default function AccountPage() {
    const { me, signOut } = useSession();
    const toast = useToast();
    if (!me) return null;

    const rows: [string, React.ReactNode][] = [
        ['Name', me.account.full_name],
        ['Login ID', me.account.login_id],
        ['Role', me.account.role_label],
        ['2-step sign-in', <Chip tone="emerald"><ShieldCheck className="h-3 w-3" /> On</Chip>],
        ['Access until', me.account.expires_at ? dateOnly(me.account.expires_at) : 'No end date'],
        ['This session ends', `${new Date(me.session_expires_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })} (or after ${me.idle_minutes} idle minutes)`],
    ];

    return (
        <>
            <PageTitle title="My account" action={<Button variant="danger" onClick={() => void signOut('You signed out.')}><LogOut className="h-4 w-4" /> Sign out</Button>} />
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="space-y-5">
                    <ul className={cx(CARD, 'divide-y divide-slate-100')}>
                        {rows.map(([k, v]) => (
                            <li key={k} className="flex items-center justify-between gap-4 px-4 py-3">
                                <span className="text-[13px] text-slate-500">{k}</span>
                                <span className="text-right text-[14px] font-medium text-slate-900">{v}</span>
                            </li>
                        ))}
                    </ul>
                    <div className={cx(CARD, 'p-4')}>
                        <p className="text-[13px] font-semibold text-slate-900">What you can open</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                            {me.permissions.length
                                ? me.permissions.map((p) => <Chip key={p} tone="indigo">{me.catalog[p]?.label ?? p}</Chip>)
                                : <span className="text-[13px] text-slate-500">Nothing yet.</span>}
                        </div>
                        <p className="mt-3 text-[12px] leading-relaxed text-slate-500">
                            Only your admin can change this. Lost your phone? Ask them to reset 2-step.
                        </p>
                    </div>
                </section>
                <section className={cx(CARD, 'p-5')}>
                    <h2 className="text-[16px] font-semibold text-slate-900">Change password</h2>
                    <p className="mb-4 mt-1 text-[13px] text-slate-500">Your other signed-in devices will be signed out.</p>
                    <PasswordForm
                        loginId={me.account.login_id}
                        currentLabel="Current password"
                        submitLabel="Change password"
                        onDone={() => toast('Password changed.')}
                    />
                </section>
            </div>
        </>
    );
}
