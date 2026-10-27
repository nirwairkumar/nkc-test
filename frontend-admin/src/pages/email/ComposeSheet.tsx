/**
 * Review and send one email: who gets it (and why the rest won't), the text, a live
 * preview as a real person, a test to yourself, then the send with live progress.
 * Opened from the Playbook (a library email) or People (an email written once).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Send } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { num } from '../analytics/format';
import { Chip } from '../analytics/ui';
import { emailApi, errorText, type AudienceFilter, type EmailDraft, type Overview, type Stage, type TemplateSummary, type Who } from './api';
import { audienceLabel, sendTimeHint, SKIP_ORDER, STAGE, STAGES, STATUS, WHO, WHOS, WHO_TONE } from './model';
import { BodyEditor, ChoiceChips, Confirm, EmailPreview, Field, Group, INPUT, PRIMARY_BTN, SOFT_BTN, WideSheet } from './parts';
import PeoplePicker from './PeoplePicker';
import { SendProgress, useSender } from './sender';

/** The whole audience is listed with tick boxes. The backend takes at most 200 per request (AudienceRequest). */
const LIST_LIMIT = 200;

export interface ComposeStart {
    template?: TemplateSummary | null;
    filter?: AudienceFilter;
}

const EMPTY: EmailDraft = {
    subject: '',
    preheader: '',
    body: 'Hi {first_name|there},\n\n\n\n[[Open TestoZa]](https://app.testoza.com/dashboard)\n\nNirwair\nTestoZa',
};

export default function ComposeSheet({ start, overview, onClose }: { start: ComposeStart | null; overview?: Overview; onClose: () => void }) {
    const open = !!start;
    const template = start?.template ?? null;
    const { user } = useAuth();

    const templates = useQuery({ queryKey: ['email', 'templates'], queryFn: emailApi.templates, enabled: open && !!template, staleTime: 60_000 });
    const [draft, setDraft] = useState<EmailDraft>(EMPTY);
    const [filter, setFilter] = useState<AudienceFilter>({});
    const [fromEmail, setFromEmail] = useState('');
    const [fromName, setFromName] = useState('');
    const [previewAs, setPreviewAs] = useState<string | null>(null);
    // Picked by hand for this send: added by search, and unticked.
    const [addIds, setAddIds] = useState<string[]>([]);
    const [skipIds, setSkipIds] = useState<string[]>([]);
    const [testTo, setTestTo] = useState('');
    const [testing, setTesting] = useState(false);
    const [confirm, setConfirm] = useState(false);
    const [campaign, setCampaign] = useState<{ id: string; planned: number } | null>(null);
    const [creating, setCreating] = useState(false);
    const sender = useSender(campaign?.id ?? null);

    // Fresh state each time the sheet opens.
    useEffect(() => {
        if (!start) return;
        setFilter(start.filter ?? {});
        setCampaign(null);
        setPreviewAs(null);
        setAddIds([]);
        setSkipIds([]);
        setDraft(template ? { subject: template.subject, preheader: template.preheader, body: '' } : EMPTY);
    }, [start]); // eslint-disable-line react-hooks/exhaustive-deps

    // The library body arrives with the templates list.
    const tplBody = templates.data?.templates.find((t) => t.key === template?.key)?.body;
    useEffect(() => {
        if (template && tplBody !== undefined) setDraft((d) => (d.body ? d : { ...d, body: tplBody }));
    }, [tplBody, template]);

    useEffect(() => {
        if (!overview) return;
        setFromEmail((v) => v || overview.defaults.from_email);
        setFromName((v) => v || overview.defaults.from_name);
    }, [overview]);
    useEffect(() => setTestTo((v) => v || user?.email || ''), [user?.email]);

    const baseFilter: AudienceFilter = template ? { template: template.key } : { ...filter };
    // The list shows the unticked too (so they can be ticked again); only the send leaves them out.
    const audFilter: AudienceFilter = addIds.length ? { ...baseFilter, add_ids: addIds } : baseFilter;
    const aud = useQuery({
        queryKey: ['email', 'audience', 'compose', audFilter],
        queryFn: () => emailApi.audience({ ...audFilter, show: 'all' }, LIST_LIMIT),
        enabled: open,
        placeholderData: keepPreviousData,
        staleTime: 15_000,
    });
    const rows = useMemo(() => aud.data?.rows ?? [], [aud.data]);
    const skip = useMemo(() => new Set(skipIds), [skipIds]);
    // Unticked people who would otherwise get it; the server counts the same way at send time.
    const leftOut = rows.filter((r) => r.status === 'ready' && skip.has(r.id)).length;
    const ready = Math.max(0, (aud.data?.ready ?? 0) - leftOut);
    const added = rows.filter((r) => r.added).length;
    const people = useMemo(
        () => rows.filter((r) => r.status === 'ready' && !skip.has(r.id)).slice(0, 25)
            .map((r) => ({ id: r.id, label: r.full_name || r.email })),
        [rows, skip],
    );

    const toggle = (id: string) => setSkipIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const setMany = (ids: string[], ticked: boolean) =>
        setSkipIds((s) => (ticked ? s.filter((x) => !ids.includes(x)) : Array.from(new Set([...s, ...ids]))));
    const addPerson = (id: string) => {
        setAddIds((a) => (a.includes(id) ? a : [...a, id]));
        setSkipIds((s) => s.filter((x) => x !== id));
    };
    const removeAdded = (id: string) => {
        setAddIds((a) => a.filter((x) => x !== id));
        setSkipIds((s) => s.filter((x) => x !== id));
    };

    const label = [
        audienceLabel(baseFilter, template),
        added ? `+${added} added` : '',
        leftOut ? `${leftOut} unticked` : '',
    ].filter(Boolean).join(' · ');
    const sending = sender.state.phase !== 'idle';
    const hint = sendTimeHint();
    const variables = overview?.variables ?? {};
    const canSend = !!draft.subject.trim() && !!draft.body.trim() && ready > 0 && !!overview?.smtp.configured;

    const close = () => {
        if (sender.state.phase === 'sending' || sender.state.phase === 'waiting') void sender.pause();
        onClose();
    };

    const sendTest = async () => {
        setTesting(true);
        try {
            await emailApi.test({ ...draft, to: testTo.trim(), user_id: previewAs, from_email: fromEmail, from_name: fromName });
            toast.success(`Test sent to ${testTo.trim()}. Open it on your phone and tap every link.`);
        } catch (e) {
            toast.error(errorText(e));
        } finally {
            setTesting(false);
        }
    };

    const go = async () => {
        setCreating(true);
        try {
            const unticked = rows.filter((r) => skip.has(r.id)).map((r) => r.id);
            const c = await emailApi.createCampaign({
                ...draft, template_key: template?.key ?? null, name: template?.name,
                filter: unticked.length ? { ...audFilter, skip_ids: unticked } : audFilter,
                audience_label: label, from_email: fromEmail, from_name: fromName,
            });
            setCampaign({ id: c.id, planned: c.planned });
            sender.start(c.id, c.planned);
        } catch (e) {
            toast.error(errorText(e));
        } finally {
            setCreating(false);
        }
    };

    const set = (k: keyof EmailDraft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

    return (
        <WideSheet
            open={open}
            onOpenChange={(o) => !o && close()}
            title={template ? template.name : 'New email'}
            subtitle={label}
            footer={sending ? undefined : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2 sm:ml-auto">
                        <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Send a test to"
                            className={cn(INPUT, 'h-11 min-w-0 flex-1 rounded-full sm:w-56')} placeholder="you@testoza.com" />
                        <button type="button" className={SOFT_BTN} disabled={testing || !testTo.includes('@') || !draft.subject.trim()} onClick={sendTest}>
                            {testing ? 'Sending…' : 'Send me a test'}
                        </button>
                    </div>
                    <button type="button" className={PRIMARY_BTN} disabled={!canSend || creating} onClick={() => setConfirm(true)}>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {ready > 0 ? `Send to ${num(ready)} ${ready === 1 ? 'person' : 'people'}` : 'Nobody to send to'}
                    </button>
                </div>
            )}
        >
            {sending && campaign ? (
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-3xl bg-white ring-1 ring-slate-900/[0.06]">
                        <SendProgress state={sender.state} planned={campaign.planned} hourlyLimit={overview?.limits.hourly_limit}
                            onPause={sender.pause} onResume={sender.resume} onClose={close} />
                    </div>
                    <p className="mt-3 px-2 text-center text-[13px] text-slate-500">
                        “{draft.subject}” · {label}
                    </p>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-5">
                        {!overview?.smtp.configured && (
                            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-inset ring-amber-600/20">
                                Email isn’t connected yet. Close this, open <strong>Settings</strong> and add the Zoho app password.
                            </div>
                        )}

                        {hint && (
                            <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-900 ring-1 ring-inset ring-amber-600/20">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{hint}
                            </p>
                        )}

                        {/* ── Who ── */}
                        <Group title="Who gets it">
                            {template ? (
                                <TemplateRules t={template} />
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <p className="mb-1.5 text-[13px] font-medium text-slate-600">Stage</p>
                                        <ChoiceChips<Stage> ariaLabel="Stage" value={filter.stages ?? []} onChange={(v) => setFilter((f) => ({ ...f, stages: v }))}
                                            options={STAGES.map((s) => ({ value: s.key, label: s.short, title: s.label }))} anyLabel="Any stage" />
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-[13px] font-medium text-slate-600">Group</p>
                                        <ChoiceChips<Who> ariaLabel="Group" value={filter.whos ?? []} onChange={(v) => setFilter((f) => ({ ...f, whos: v }))}
                                            options={WHOS.map((w) => ({ value: w.key, label: w.plural, title: w.hint }))} anyLabel="Everyone" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Joined">
                                            <select className={INPUT} value={filter.joined_within ?? ''}
                                                onChange={(e) => setFilter((f) => ({ ...f, joined_within: e.target.value ? Number(e.target.value) : null }))}>
                                                <option value="">Any time</option>
                                                <option value="7">Last 7 days</option>
                                                <option value="30">Last 30 days</option>
                                                <option value="90">Last 90 days</option>
                                            </select>
                                        </Field>
                                        <Field label="Last seen">
                                            <select className={INPUT} value={filter.quiet_for ?? ''}
                                                onChange={(e) => setFilter((f) => ({ ...f, quiet_for: e.target.value ? Number(e.target.value) : null }))}>
                                                <option value="">Any time</option>
                                                <option value="7">7+ days ago</option>
                                                <option value="21">21+ days ago</option>
                                                <option value="60">60+ days ago</option>
                                            </select>
                                        </Field>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">{aud.data ? num(ready) : '–'}</p>
                                        <p className="mt-1 text-[13px] text-slate-500">
                                            will get it{aud.data ? ` · ${num(aud.data.total)} in this audience` : ''}
                                            {added ? ` · ${num(added)} added` : ''}{leftOut ? ` · ${num(leftOut)} unticked` : ''}
                                        </p>
                                    </div>
                                </div>
                                {aud.data && (
                                    <ul className="mt-3 space-y-1">
                                        {SKIP_ORDER.filter((k) => aud.data.skipped[k] > 0).map((k) => (
                                            <li key={k} className="flex items-center justify-between gap-3 text-[13px]">
                                                <span className="text-slate-600">{STATUS[k].long}</span>
                                                <span className="font-semibold tabular-nums text-slate-900">{num(aud.data.skipped[k])}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {aud.error && !aud.data ? (
                                    <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-[13px] text-rose-800 ring-1 ring-inset ring-rose-600/20">
                                        Couldn’t load the people for this email: {errorText(aud.error)}{' '}
                                        <button type="button" className="font-semibold underline" onClick={() => aud.refetch()}>Try again</button>
                                    </p>
                                ) : aud.data && rows.length > 0 && !rows.some((r) => 'added' in r) ? (
                                    <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900 ring-1 ring-inset ring-amber-600/20">
                                        To tick people and add anyone by search, run
                                        <span className="font-mono text-[12px]"> 20261028150000_email_pick_people.sql </span>
                                        in Supabase once.
                                    </p>
                                ) : aud.data && (
                                    <PeoplePicker
                                        rows={rows}
                                        skip={skip}
                                        onToggle={toggle}
                                        onSetMany={setMany}
                                        addIds={addIds}
                                        onAdd={addPerson}
                                        onRemoveAdded={removeAdded}
                                        more={Math.max(0, aud.data.total - rows.length)}
                                    />
                                )}
                            </div>
                        </Group>

                        {/* ── What ── */}
                        <Group title="The email" footer={template ? 'Changes here are for this send only. To change the email for good, edit it in Library.' : undefined}>
                            <div className="space-y-3">
                                <Field label="Subject" right={`${draft.subject.length} / 50`}
                                    hint={draft.subject.length > 50 ? 'Phones cut subjects after about 40–50 characters.' : undefined}>
                                    <input className={INPUT} value={draft.subject} onChange={set('subject')} placeholder="One clear promise, under 50 characters" />
                                </Field>
                                <Field label="Preview text" hint="The grey line after the subject in the inbox.">
                                    <input className={INPUT} value={draft.preheader} onChange={set('preheader')} placeholder="Adds to the subject, doesn’t repeat it" />
                                </Field>
                                {template && templates.isLoading ? (
                                    <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
                                ) : (
                                    <BodyEditor value={draft.body} onChange={(body) => setDraft((d) => ({ ...d, body }))} variables={variables} />
                                )}
                            </div>
                        </Group>

                        {/* ── From ── */}
                        <Group title="From" footer={`Replies go to ${overview?.defaults.reply_to ?? 'support@testoza.com'}, where the team reads them.`}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Name people see">
                                    <input className={INPUT} value={fromName} onChange={(e) => setFromName(e.target.value)} />
                                </Field>
                                <Field label="Address">
                                    <select className={INPUT} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)}>
                                        {(overview?.defaults.senders ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </Group>
                    </div>

                    <div className="lg:sticky lg:top-0 lg:self-start">
                        <h3 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Preview</h3>
                        <EmailPreview draft={draft} userId={previewAs} templateKey={template?.key} fromName={fromName}
                            people={people} onPickPerson={setPreviewAs} />
                    </div>
                </div>
            )}

            <Confirm
                open={confirm}
                onOpenChange={setConfirm}
                title={`Send to ${num(ready)} ${ready === 1 ? 'person' : 'people'}?`}
                message={<>“{draft.subject}” goes out now, at most {overview?.limits.hourly_limit ?? 40} an hour. None of them will get another email from us for {overview?.limits.cooldown_days ?? 7} days.</>}
                confirm="Send"
                onConfirm={go}
            />
        </WideSheet>
    );
}

function TemplateRules({ t }: { t: TemplateSummary }) {
    const rules = [
        t.min_days_joined > 0 ? `${t.min_days_joined}+ days after they joined` : '',
        t.min_days_quiet > 0 ? `${t.min_days_quiet}+ days after their last visit` : '',
        t.track && t.step > 1 ? `${t.wait_days} days after email ${t.step - 1} of this series` : '',
    ].filter(Boolean);
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {t.audiences.map((a) => <Chip key={a} tone={WHO_TONE[a]}>{WHO[a]?.plural ?? a}</Chip>)}
                {t.stages.map((s) => <Chip key={s}>{STAGE[s]?.label ?? s}</Chip>)}
                {t.track && <Chip tone="sky">Email {t.step} of its series</Chip>}
            </div>
            {rules.length > 0 && <p className="text-[13px] text-slate-500">Goes {rules.join(', ')}.</p>}
            {t.why && <p className="text-[13px] leading-snug text-slate-600">{t.why}</p>}
        </div>
    );
}
