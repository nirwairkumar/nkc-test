/**
 * Admin → Email → Settings: the broadcast connection (Amazon SES, set on the server as
 * BROADCAST_SMTP_*; this form only replaces it until the next restart), the sending limits
 * (read-only: set on the server so they can't be loosened from here), and the do-not-email list.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { istDate } from '../analytics/format';
import { Chip } from '../analytics/ui';
import { emailApi, errorText, type Overview, type Suppression } from './api';
import { Confirm, Field, Group, INPUT, PRIMARY_BTN, SOFT_BTN, WideSheet } from './parts';

const REASON: Record<Suppression['reason'], { label: string; tone: 'rose' | 'amber' | 'slate' }> = {
    unsubscribed: { label: 'Unsubscribed', tone: 'rose' },
    bounced: { label: 'Address doesn’t exist', tone: 'amber' },
    stopped: { label: 'Stopped by us', tone: 'slate' },
};

export default function SettingsSheet({ open, onOpenChange, overview }: { open: boolean; onOpenChange: (o: boolean) => void; overview?: Overview }) {
    const qc = useQueryClient();
    const smtp = useQuery({ queryKey: ['email', 'smtp'], queryFn: emailApi.smtpStatus, enabled: open });
    const [form, setForm] = useState({ host: 'email-smtp.ap-southeast-2.amazonaws.com', port: 587, user: '', password: '', from_name: 'TestoZa Team' });
    useEffect(() => {
        if (smtp.data) setForm((f) => ({ ...f, host: smtp.data.host || f.host, port: smtp.data.port || f.port, user: smtp.data.user || f.user, from_name: smtp.data.from_name || f.from_name }));
    }, [smtp.data]);

    const save = useMutation({
        mutationFn: () => emailApi.saveSmtp({ ...form, use_ssl: form.port === 465 }),
        onSuccess: () => {
            toast.success('Connected. Send yourself a test to be sure.');
            setForm((f) => ({ ...f, password: '' }));
            qc.invalidateQueries({ queryKey: ['email'] });
        },
        onError: (e) => toast.error(errorText(e)),
    });

    const [q, setQ] = useState('');
    const list = useQuery({ queryKey: ['email', 'suppressions', q], queryFn: () => emailApi.suppressions(q), enabled: open });
    const [stopEmail, setStopEmail] = useState('');
    const [again, setAgain] = useState<string | null>(null);
    const stop = useMutation({
        mutationFn: () => emailApi.suppress(stopEmail.trim()),
        onSuccess: () => { toast.success(`We won’t email ${stopEmail.trim()} again`); setStopEmail(''); qc.invalidateQueries({ queryKey: ['email'] }); },
        onError: (e) => toast.error(errorText(e)),
    });
    const resume = useMutation({
        mutationFn: (email: string) => emailApi.unsuppress(email),
        onSuccess: (_r, email) => { toast.success(`${email} can get emails again`); qc.invalidateQueries({ queryKey: ['email'] }); },
        onError: (e) => toast.error(errorText(e)),
    });

    const l = overview?.limits;
    const s = smtp.data;
    const configured = s?.configured ?? overview?.smtp.configured;
    const service = s?.service ?? overview?.smtp.service;

    return (
        <WideSheet open={open} onOpenChange={onOpenChange} width="narrow" title="Email settings" subtitle="Connection, limits and who we never email">
            <div className="space-y-6">
                <Group title="Connection"
                    footer="Broadcasts go out through their own service, so a bad send can’t hurt help replies or submission emails. The owner sets it on the server (BROADCAST_SMTP_*). The form below replaces it only until the server restarts.">
                    <div className="mb-4 space-y-2 text-[14px]">
                        <div className="flex items-center gap-2">
                            {configured ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />}
                            <span className="font-medium text-slate-900">
                                {configured ? `Broadcasts send through ${service || 'the mail server'}` : 'Broadcasts aren’t connected'}
                            </span>
                        </div>
                        {configured && s?.from_email && <p className="pl-7 text-[13px] text-slate-500">From {s.from_email}{s.separate ? '' : ' · shared with the platform’s own emails'}</p>}
                        {s?.automatic && (
                            <p className="pl-7 text-[13px] text-slate-500">
                                Help replies and submission emails: {s.automatic.configured ? s.automatic.service : 'not connected'}
                            </p>
                        )}
                        {s && service === 'Amazon SES' && (
                            <p className={`pl-7 text-[13px] ${s.bounce_reports ? 'text-slate-500' : 'text-amber-700'}`}>
                                {s.bounce_reports
                                    ? 'Bounces and spam reports from SES are added to the never-email list below.'
                                    : 'Bounce and spam reports aren’t connected yet (SES_SNS_TOPIC_ARN on the server). Keep sends small until they are.'}
                            </p>
                        )}
                    </div>
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
                        <div className="grid grid-cols-[1fr_96px] gap-3">
                            <Field label="Server"><input className={INPUT} value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} /></Field>
                            <Field label="Port"><input type="number" className={INPUT} value={form.port} onChange={(e) => setForm({ ...form, port: Number(e.target.value) || 587 })} /></Field>
                        </div>
                        <Field label="SMTP username"><input className={INPUT} value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} autoComplete="username" /></Field>
                        <Field label="SMTP password">
                            <input type="password" className={INPUT} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                                autoComplete="new-password" placeholder={configured ? 'Saved. Type a new one to replace it' : 'SES → SMTP settings → Create SMTP credentials'} />
                        </Field>
                        <button type="submit" className={PRIMARY_BTN} disabled={!form.password || save.isPending}>{save.isPending ? 'Saving…' : 'Save and connect'}</button>
                    </form>
                </Group>

                <Group title="Limits" footer="Set on the server by the owner (EMAIL_COOLDOWN_DAYS, EMAIL_MONTHLY_CAP, EMAIL_HOURLY_LIMIT, EMAIL_DAILY_LIMIT). They protect our name with Gmail and Outlook.">
                    <ul className="space-y-2.5 text-[14px]">
                        {[
                            [`One email per person every ${l?.cooldown_days ?? 7} days`, 'Nobody hears from us twice in a week.'],
                            [`At most ${l?.monthly_cap ?? 3} per person in 30 days`, 'Even if they move through stages quickly.'],
                            ['Never the same email twice', 'Checked for every person, forever.'],
                            [`${l?.hourly_limit ?? 40} an hour, ${l?.daily_limit ?? 200} a day`, `${l?.sent_last_hour ?? 0} sent in the last hour, ${l?.sent_last_day ?? 0} in the last 24 hours.`],
                        ].map(([a, b]) => (
                            <li key={a} className="flex gap-3">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                                <span><span className="font-medium text-slate-900">{a}</span><span className="block text-[13px] text-slate-500">{b}</span></span>
                            </li>
                        ))}
                    </ul>
                </Group>

                <Group title={`Never email (${list.data?.total ?? 0})`}
                    footer="People land here when they unsubscribe, when their address bounces, or when you stop them. Only put someone back if they asked.">
                    <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (stopEmail.includes('@')) stop.mutate(); }}>
                        <input type="email" className={INPUT} value={stopEmail} onChange={(e) => setStopEmail(e.target.value)}
                            placeholder="Stop emailing an address…" aria-label="Address to stop emailing" />
                        <button type="submit" className={SOFT_BTN} disabled={!stopEmail.includes('@') || stop.isPending}>Stop</button>
                    </form>
                    <input type="search" className={`${INPUT} mb-2 h-9 bg-slate-100 ring-0`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search the list" />
                    <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                        {(list.data?.rows ?? []).map((s) => (
                            <li key={s.email} className="flex items-center gap-3 py-2">
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[14px] text-slate-900">{s.email}</span>
                                    <span className="text-[12px] text-slate-500">{istDate(s.created_at)}{s.note ? ` · ${s.note}` : ''}</span>
                                </span>
                                <Chip tone={REASON[s.reason].tone}>{REASON[s.reason].label}</Chip>
                                <button type="button" onClick={() => setAgain(s.email)} className="shrink-0 text-[13px] font-semibold text-sky-700 hover:underline">Email again</button>
                            </li>
                        ))}
                        {list.data && list.data.rows.length === 0 && <li className="py-4 text-center text-[13px] text-slate-500">Nobody yet.</li>}
                    </ul>
                </Group>
            </div>

            <Confirm open={!!again} onOpenChange={(o) => !o && setAgain(null)} title="Email this address again?"
                message={<>Only do this if <strong>{again}</strong> asked to hear from us again.</>} confirm="Email again"
                onConfirm={() => again && resume.mutate(again)} />
        </WideSheet>
    );
}
