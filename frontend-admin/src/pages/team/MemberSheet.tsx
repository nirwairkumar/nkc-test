/**
 * Admin → Team → Add member / edit member.
 *
 * Creating shows the temporary password ONCE (the server keeps only a hash). The employee
 * changes it and sets up the 6-digit authenticator code at their first sign-in on
 * team.testoza.com. Suspend / reset / sign-out take effect on their next click.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, KeyRound, Loader2, LogOut, PauseCircle, PlayCircle, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { istDateTime, relative } from '../analytics/format';
import { CARD, Chip, IosSheet, PILL_BTN } from '../analytics/ui';
import ActivityLog, { deviceLabel } from './ActivityLog';
import { errorText, TEAM_URL, teamApi, type Catalog, type StaffAccount } from './api';

const IMPLIES: Record<string, string[]> = { 'support.reply': ['support.view'], 'support.contact': ['support.view'] };

const INPUT =
    'h-10 w-full rounded-xl bg-white px-3 text-[14px] text-slate-900 ring-1 ring-slate-900/[0.1] placeholder:text-slate-400 ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:bg-slate-100 disabled:text-slate-500';

/** ISO → "2026-12-31" in India time, for <input type="date">. */
const toDateInput = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) : '';
/** "2026-12-31" → the end of that day in India time. */
const fromDateInput = (d: string) => (d ? `${d}T23:59:59+05:30` : null);

function sameSet(a: string[], b: string[]) {
    return a.length === b.length && a.every((x) => b.includes(x));
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
            {children}
            {hint && <span className="mt-1 block text-[12px] text-slate-500">{hint}</span>}
        </label>
    );
}

function CopyRow({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
                <p className="text-[12px] text-slate-500">{label}</p>
                <p className="select-all truncate font-mono text-[16px] font-semibold tracking-wide text-slate-900">{value}</p>
            </div>
            <button
                type="button"
                className={PILL_BTN}
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(value);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                    } catch {
                        toast.error('Couldn’t copy. Select the text instead.');
                    }
                }}
            >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
}

function TempPasswordCard({ loginId, password, onDone }: { loginId: string; password: string; onDone: () => void }) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-600/20">
                <p className="text-[14px] font-semibold text-amber-900">Copy this now. It won’t be shown again.</p>
                <p className="mt-1 text-[13px] leading-relaxed text-amber-900/80">
                    Send the login ID and the password <b>separately</b> (for example, the ID on WhatsApp and the
                    password on a call). At first sign-in they choose their own password and set up the 6-digit code
                    on their phone.
                </p>
            </div>
            <div className={cn(CARD, 'divide-y divide-slate-100')}>
                <CopyRow label="Sign in at" value={TEAM_URL.replace('https://', '')} />
                <CopyRow label="Login ID" value={loginId} />
                <CopyRow label="Temporary password" value={password} />
            </div>
            <button type="button" onClick={onDone} className="h-11 w-full rounded-xl bg-slate-900 text-[14px] font-semibold text-white hover:bg-slate-800">
                Done
            </button>
        </div>
    );
}

/** A button that needs a second tap within 4 s, for actions that sign someone out. */
function ConfirmButton({ children, confirmLabel, onConfirm, danger, disabled, icon: Icon }: {
    children: React.ReactNode; confirmLabel: string; onConfirm: () => void; danger?: boolean; disabled?: boolean;
    icon: React.ElementType;
}) {
    const [armed, setArmed] = useState(false);
    useEffect(() => {
        if (!armed) return;
        const t = setTimeout(() => setArmed(false), 4000);
        return () => clearTimeout(t);
    }, [armed]);
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}
            className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left text-[14px] font-medium transition-colors disabled:opacity-50',
                armed ? (danger ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white') : danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-800 hover:bg-slate-50',
            )}
        >
            <Icon className="h-4 w-4 shrink-0" />
            {armed ? confirmLabel : children}
        </button>
    );
}

export default function MemberSheet({ open, onOpenChange, catalog, member }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    catalog: Catalog | undefined;
    /** null = add a new member */
    member: StaffAccount | null;
}) {
    const qc = useQueryClient();
    const editing = !!member;
    const [fullName, setFullName] = useState('');
    const [loginId, setLoginId] = useState('');
    const [email, setEmail] = useState('');
    const [ends, setEnds] = useState('');
    const [role, setRole] = useState('Custom');
    const [perms, setPerms] = useState<string[]>([]);
    const [temp, setTemp] = useState<{ loginId: string; password: string } | null>(null);

    useEffect(() => {
        if (!open) return;
        setTemp(null);
        setFullName(member?.full_name ?? '');
        setLoginId(member?.login_id ?? '');
        setEmail(member?.contact_email ?? '');
        setEnds(toDateInput(member?.expires_at ?? null));
        setRole(member?.role_label ?? 'Support agent');
        setPerms(member?.permissions ?? catalog?.presets[0]?.permissions ?? []);
        // Keyed on the id, not the object: a list refresh after "Reset password" must not
        // wipe the temporary password off the screen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, member?.id, catalog]);

    const groups = useMemo(() => {
        const out: Record<string, Catalog['permissions']> = {};
        for (const p of catalog?.permissions ?? []) (out[p.group] ??= []).push(p);
        return out;
    }, [catalog]);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ['team'] });
    };

    const save = useMutation({
        mutationFn: async () => {
            const body = {
                full_name: fullName,
                contact_email: email.trim() || null,
                role_label: role,
                permissions: perms,
            };
            if (editing) {
                return teamApi.update(member!.id, {
                    ...body,
                    contact_email: email.trim(),
                    ...(ends ? { expires_at: fromDateInput(ends) } : { clear_expires_at: true }),
                });
            }
            return teamApi.create({ ...body, login_id: loginId.trim().toLowerCase(), expires_at: fromDateInput(ends) });
        },
        onSuccess: (res: any) => {
            refresh();
            if (res.temporary_password) {
                setTemp({ loginId: res.account.login_id, password: res.temporary_password });
            } else {
                toast.success('Saved. Takes effect on their next click.');
                onOpenChange(false);
            }
        },
        onError: (err) => toast.error(errorText(err)),
    });

    const act = useMutation({
        mutationFn: async (what: 'reset-password' | 'reset-2fa' | 'sign-out' | 'suspend' | 'reactivate' | 'remove') => {
            const id = member!.id;
            if (what === 'reset-password') return teamApi.resetPassword(id);
            if (what === 'reset-2fa') return teamApi.resetTwoStep(id);
            if (what === 'sign-out') return teamApi.signOut(id);
            const status = what === 'suspend' ? 'suspended' : what === 'remove' ? 'removed' : 'active';
            return teamApi.update(id, { status });
        },
        onSuccess: (res: any, what) => {
            refresh();
            if (res?.temporary_password) {
                setTemp({ loginId: member!.login_id, password: res.temporary_password });
                return;
            }
            const done: Record<string, string> = {
                'reset-2fa': 'Reset. They’ll scan a new QR code at their next sign-in.',
                'sign-out': 'Signed out everywhere.',
                suspend: 'Suspended and signed out.',
                reactivate: 'Reactivated.',
                remove: 'Removed. Their activity stays in the log.',
            };
            toast.success(done[what]);
            if (what === 'remove') onOpenChange(false);
        },
        onError: (err) => toast.error(errorText(err)),
    });

    const sessions = useQuery({
        queryKey: ['team', 'sessions', member?.id],
        queryFn: () => teamApi.sessions(member!.id),
        enabled: open && editing,
    });

    const toggle = (key: string, on: boolean) => {
        let next = on ? [...new Set([...perms, key, ...(IMPLIES[key] ?? [])])] : perms.filter((p) => p !== key);
        if (!on) {
            // Unticking "read" also unticks what needs it.
            const dependents = Object.entries(IMPLIES).filter(([, needs]) => needs.includes(key)).map(([k]) => k);
            next = next.filter((p) => !dependents.includes(p));
        }
        setPerms(next);
        const preset = catalog?.presets.find((p) => sameSet(p.permissions, next));
        setRole(preset ? preset.label : 'Custom');
    };

    // Say exactly what's missing instead of silently greying out the button.
    const id = loginId.trim().toLowerCase();
    const blocker = !fullName.trim()
        ? 'Type their name.'
        : editing
            ? null
            : !id
                ? 'Choose a login ID.'
                : !/^[a-z]/.test(id)
                    ? 'The login ID must start with a letter (a–z).'
                    : /[^a-z0-9._-]/.test(id)
                        ? 'The login ID can only use letters, numbers, dot (.), underscore (_) and dash (-). No @ or spaces.'
                        : id.length < 3
                            ? 'The login ID needs at least 3 characters.'
                            : null;
    const canSave = !blocker;
    const live = sessions.data?.rows.filter((s) => s.live) ?? [];

    return (
        <IosSheet
            open={open}
            onOpenChange={onOpenChange}
            title={temp ? 'Sign-in details' : editing ? member!.full_name : 'Add member'}
            subtitle={temp ? undefined : editing ? `@${member!.login_id} · signs in at team.testoza.com` : 'They sign in at team.testoza.com with a login ID, password and a 6-digit phone code.'}
        >
            {temp ? (
                <TempPasswordCard loginId={temp.loginId} password={temp.password} onDone={() => (editing ? setTemp(null) : onOpenChange(false))} />
            ) : (
                <div className="space-y-5 pb-6">
                    <section className={cn(CARD, 'space-y-4 p-4')}>
                        <Field label="Name">
                            <input className={INPUT} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} placeholder="e.g. Priya Sharma" />
                        </Field>
                        <Field
                            label="Login ID"
                            hint={editing ? 'Login IDs can’t be changed.' : '3–32 characters: letters, numbers, . _ - (starts with a letter). Not their email.'}
                        >
                            <input
                                className={INPUT}
                                value={loginId}
                                disabled={editing}
                                onChange={(e) => setLoginId(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                maxLength={32}
                                placeholder="e.g. priya.s"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                            />
                        </Field>
                        <Field label="Contact email (optional)" hint="For your records only. It is not used to sign in.">
                            <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. priya@gmail.com" />
                        </Field>
                        <Field label="Access ends (optional)" hint="The account switches itself off at the end of this day (India time). Use it for interns.">
                            <input className={INPUT} type="date" value={ends} onChange={(e) => setEnds(e.target.value)} />
                        </Field>
                    </section>

                    <section className={cn(CARD, 'p-4')}>
                        <p className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">Role</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(catalog?.presets ?? []).map((p) => (
                                <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => { setRole(p.label); setPerms(p.permissions); }}
                                    className={cn(
                                        'rounded-full px-3 py-1.5 text-[13px] font-semibold ring-1 transition-colors',
                                        role === p.label ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-900/[0.1] hover:bg-slate-50',
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                            <span className={cn('rounded-full px-3 py-1.5 text-[13px] font-semibold', role === 'Custom' ? 'bg-slate-900 text-white' : 'text-slate-400')}>
                                Custom
                            </span>
                        </div>

                        <div className="mt-4 space-y-4">
                            {Object.entries(groups).map(([group, items]) => (
                                <div key={group}>
                                    <p className="text-[13px] font-semibold text-slate-900">{group}</p>
                                    <div className="mt-1.5 space-y-1">
                                        {items.map((p) => (
                                            <label key={p.key} className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-900"
                                                    checked={perms.includes(p.key)}
                                                    onChange={(e) => toggle(p.key, e.target.checked)}
                                                />
                                                <span className="min-w-0">
                                                    <span className="block text-[14px] font-medium text-slate-900">{p.label}</span>
                                                    <span className="block text-[12px] leading-snug text-slate-500">{p.description}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {catalog?.never && (
                            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-[12px] leading-relaxed text-slate-500">
                                <b className="text-slate-700">Never available to staff:</b> {catalog.never.join(', ')}.
                            </p>
                        )}
                    </section>

                    <button
                        type="button"
                        disabled={!canSave || save.isPending}
                        onClick={() => save.mutate()}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[14px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {editing ? 'Save changes' : 'Add member and show password'}
                    </button>
                    {blocker && (
                        <p className="-mt-3 text-center text-[13px] font-medium text-amber-700" role="status">{blocker}</p>
                    )}

                    {editing && member && (
                        <>
                            <section>
                                <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Account</p>
                                <div className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                                    <ConfirmButton icon={KeyRound} confirmLabel="Tap again: new password + sign out" onConfirm={() => act.mutate('reset-password')} disabled={act.isPending}>
                                        Reset password
                                    </ConfirmButton>
                                    <ConfirmButton icon={ShieldOff} confirmLabel="Tap again: they’ll scan a new QR" onConfirm={() => act.mutate('reset-2fa')} disabled={act.isPending}>
                                        Reset 2-step (lost phone)
                                    </ConfirmButton>
                                    <ConfirmButton icon={LogOut} confirmLabel="Tap again to sign out everywhere" onConfirm={() => act.mutate('sign-out')} disabled={act.isPending || !member.live_sessions}>
                                        Sign out everywhere {member.live_sessions ? `(${member.live_sessions})` : ''}
                                    </ConfirmButton>
                                    {member.status === 'active' ? (
                                        <ConfirmButton icon={PauseCircle} danger confirmLabel="Tap again to suspend now" onConfirm={() => act.mutate('suspend')} disabled={act.isPending}>
                                            Suspend
                                        </ConfirmButton>
                                    ) : (
                                        <ConfirmButton icon={PlayCircle} confirmLabel="Tap again to reactivate" onConfirm={() => act.mutate('reactivate')} disabled={act.isPending}>
                                            Reactivate
                                        </ConfirmButton>
                                    )}
                                    <ConfirmButton icon={Trash2} danger confirmLabel="Tap again: remove for good" onConfirm={() => act.mutate('remove')} disabled={act.isPending}>
                                        Remove (keeps the activity log)
                                    </ConfirmButton>
                                </div>
                            </section>

                            <section>
                                <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">Signed in now</p>
                                <div className={cn(CARD, 'divide-y divide-slate-100 overflow-hidden')}>
                                    {live.length === 0 ? (
                                        <p className="px-4 py-3 text-[13px] text-slate-500">
                                            Not signed in. {member.last_login_at ? `Last sign-in ${relative(member.last_login_at)}.` : 'Never signed in.'}
                                        </p>
                                    ) : live.map((s) => (
                                        <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-medium text-slate-900">{deviceLabel(s.user_agent) || 'Unknown device'}</p>
                                                <p className="text-[12px] text-slate-500">{s.ip} · since {istDateTime(s.created_at)}</p>
                                            </div>
                                            <Chip tone="emerald">active {relative(s.last_seen_at)}</Chip>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <p className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Activity
                                </p>
                                <ActivityLog staffId={member.id} compact />
                            </section>
                        </>
                    )}
                </div>
            )}
        </IosSheet>
    );
}
