/**
 * Review and send one email: who gets it (and why the rest won't), the text, a live preview as
 * a real person, a test to yourself, then the send with live progress. Same as admin
 * (frontend-admin/src/pages/email/ComposeSheet.tsx) plus the team site's limits, shown up front:
 * links only to testoza.com or YouTube, tests only to your login email or an @testoza.com address.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Send, ShieldAlert } from 'lucide-react';
import React, { useEffect, useId, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Button, Chip, cx } from '@/components/ui';
import { num } from '@/lib/format';
import { emailApi, errorText, type AudienceFilter, type EmailDraft, type Overview, type Stage, type TemplateSummary, type Who } from './api';
import { BodyEditor, ChoiceChips, Confirm, EmailPreview, FormField, Group, INPUT, Sheet } from './kit';
import { audienceLabel, outsideLinks, sendTimeHint, SKIP_ORDER, STAGE, STAGES, STATUS, WHO, WHOS, WHO_TONE } from './model';
import PeoplePicker from './PeoplePicker';
import { SendProgress, useSender } from './sender';

/** The whole audience is listed with tick boxes. The backend takes at most 200 per request. */
const LIST_LIMIT = 200;

export interface ComposeStart {
    template?: TemplateSummary | null;
    filter?: AudienceFilter;
}

const EMPTY: EmailDraft = {
    subject: '',
    preheader: '',
    body: 'Hi {first_name|there},\n\n\n\n[[Open TestoZa]](https://app.testoza.com/dashboard)\n\nTeam\nTestoZa',
};

/** Each From address remembers its own reply inbox on this device. */
const REPLY_KEY = 'tz_team_email_reply_to';
function savedReplies(): Record<string, string> {
    try {
        const v = JSON.parse(localStorage.getItem(REPLY_KEY) || '{}');
        return v && typeof v === 'object' ? v : {};
    } catch {
        return {};
    }
}
function rememberReply(from: string, reply: string) {
    if (!from) return;
    try { localStorage.setItem(REPLY_KEY, JSON.stringify({ ...savedReplies(), [from]: reply })); } catch { /* storage blocked */ }
}

export default function ComposeSheet({ start, overview, onClose }: { start: ComposeStart | null; overview?: Overview; onClose: () => void }) {
    const open = !!start;
    const template = start?.template ?? null;
    const toast = useToast();

    const templates = useQuery({ queryKey: ['email', 'templates'], queryFn: emailApi.templates, enabled: open && !!template, staleTime: 60_000 });
    const [draft, setDraft] = useState<EmailDraft>(EMPTY);
    const [filter, setFilter] = useState<AudienceFilter>({});
    const [fromEmail, setFromEmail] = useState('');
    const [fromName, setFromName] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const replyId = useId();
    const [previewAs, setPreviewAs] = useState<string | null>(null);
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
        setTestTo((v) => v || overview.team.test_to || '');
    }, [overview]);

    // Replies: the team inbox unless this From address was given its own.
    const teamInbox = overview?.defaults.reply_to ?? 'support@testoza.com';
    useEffect(() => {
        if (fromEmail) setReplyTo(savedReplies()[fromEmail] ?? teamInbox);
    }, [fromEmail, teamInbox]);
    const replyAddr = replyTo.trim().toLowerCase();
    const replyDomain = replyAddr.split('@')[1] ?? '';
    const homeDomain = teamInbox.split('@')[1] ?? '';
    const replyValid = !replyAddr || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyAddr);
    const replyBlocked = replyValid && (overview?.defaults.send_only_domains ?? [])
        .some((d) => replyDomain === d || replyDomain.endsWith(`.${d}`));
    const replyOk = replyValid && !replyBlocked;
    const replyOutside = replyOk && !!replyAddr && replyDomain !== homeDomain && !replyDomain.endsWith(`.${homeDomain}`);
    const replyOwn = !!replyAddr && replyAddr !== teamInbox;
    const keepReply = () => replyOk && rememberReply(fromEmail, replyAddr || teamInbox);

    // The team site's own limits, checked here so nobody finds out only at "Send".
    const linkHosts = overview?.team.link_hosts ?? ['testoza.com', 'youtube.com', 'youtu.be'];
    const badLinks = useMemo(() => outsideLinks(`${draft.subject}\n\n${draft.body}`, linkHosts), [draft.subject, draft.body, linkHosts]);
    const testDomain = overview?.team.test_domain ?? 'testoza.com';
    const myAddress = overview?.team.test_to ?? null;
    const testAddr = testTo.trim().toLowerCase();
    const testAllowed = !!testAddr && (testAddr === myAddress || testAddr.endsWith(`@${testDomain}`));

    const baseFilter: AudienceFilter = template ? { template: template.key } : { ...filter };
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
    const todayRoom = Math.max(0, (overview?.limits.daily_limit ?? 200) - (overview?.limits.sent_last_day ?? 0));
    const hint = sendTimeHint();
    const variables = overview?.variables ?? {};
    const canSend = !!draft.subject.trim() && !!draft.body.trim() && ready > 0 && !!overview?.smtp.configured && replyOk && !badLinks.length;

    const close = () => {
        if (sender.state.phase === 'sending' || sender.state.phase === 'waiting') void sender.pause();
        onClose();
    };

    const sendTest = async () => {
        setTesting(true);
        try {
            await emailApi.test({ ...draft, to: testAddr, user_id: previewAs, from_email: fromEmail, from_name: fromName, reply_to: replyAddr || null });
            keepReply();
            toast(`Test sent to ${testAddr}. Open it on your phone, tap every link, and reply once to check where replies land.`);
        } catch (e) {
            toast(errorText(e), 'error');
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
                audience_label: label, from_email: fromEmail, from_name: fromName, reply_to: replyAddr || null,
            });
            keepReply();
            setCampaign({ id: c.id, planned: c.planned });
            sender.start(c.id, c.planned);
        } catch (e) {
            toast(errorText(e), 'error');
        } finally {
            setCreating(false);
        }
    };

    const set = (k: keyof EmailDraft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [k]: e.target.value }));

    return (
        <Sheet
            open={open}
            onClose={close}
            title={template ? template.name : 'New email'}
            subtitle={label}
            footer={sending ? undefined : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <p className="hidden min-w-0 flex-1 text-[12px] leading-snug text-slate-500 lg:block">
                        Tests go to {myAddress ? <><strong className="font-semibold text-slate-700">{myAddress}</strong> or </> : ''}an @{testDomain} address.
                    </p>
                    <div className="flex items-center gap-2">
                        <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} aria-label="Send a test to"
                            className={cx(INPUT, 'h-10 min-w-0 flex-1 sm:w-60', testAddr && !testAllowed && 'ring-rose-400')}
                            placeholder={myAddress ?? `you@${testDomain}`} title={`Your login email or an @${testDomain} address`} />
                        <Button variant="secondary" busy={testing} disabled={!testAllowed || !draft.subject.trim() || !replyOk || badLinks.length > 0} onClick={sendTest}>
                            {testing ? 'Sending…' : 'Send me a test'}
                        </Button>
                    </div>
                    <Button disabled={!canSend} busy={creating} onClick={() => setConfirm(true)}>
                        <Send className="h-4 w-4" aria-hidden="true" />
                        {ready > 0 ? `Send to ${num(ready)} ${ready === 1 ? 'person' : 'people'}` : 'Nobody to send to'}
                    </Button>
                </div>
            )}
        >
            {sending && campaign ? (
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-3xl bg-white ring-1 ring-slate-900/[0.06]">
                        <SendProgress state={sender.state} planned={campaign.planned} hourlyLimit={overview?.limits.hourly_limit}
                            onPause={sender.pause} onResume={sender.resume} onClose={close} />
                    </div>
                    <p className="mt-3 px-2 text-center text-[13px] text-slate-500">“{draft.subject}” · {label}</p>
                </div>
            ) : (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-5">
                        {!overview?.smtp.configured && (
                            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-900 ring-1 ring-inset ring-amber-600/20">
                                Email isn’t connected yet. The owner sets it up in admin; until then you can prepare emails but not send them.
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
                                        <FormField label="Joined">
                                            <select className={INPUT} value={filter.joined_within ?? ''}
                                                onChange={(e) => setFilter((f) => ({ ...f, joined_within: e.target.value ? Number(e.target.value) : null }))}>
                                                <option value="">Any time</option>
                                                <option value="7">Last 7 days</option>
                                                <option value="30">Last 30 days</option>
                                                <option value="90">Last 90 days</option>
                                            </select>
                                        </FormField>
                                        <FormField label="Last seen">
                                            <select className={INPUT} value={filter.quiet_for ?? ''}
                                                onChange={(e) => setFilter((f) => ({ ...f, quiet_for: e.target.value ? Number(e.target.value) : null }))}>
                                                <option value="">Any time</option>
                                                <option value="7">7+ days ago</option>
                                                <option value="21">21+ days ago</option>
                                                <option value="60">60+ days ago</option>
                                            </select>
                                        </FormField>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <p className="text-[32px] font-semibold leading-none tracking-[-0.02em] text-slate-900 tabular-nums">{aud.data ? num(ready) : '–'}</p>
                                <p className="mt-1 text-[13px] text-slate-500">
                                    will get it{aud.data ? ` · ${num(aud.data.total)} in this audience` : ''}
                                    {added ? ` · ${num(added)} added` : ''}{leftOut ? ` · ${num(leftOut)} unticked` : ''}
                                </p>
                                {aud.data && (
                                    <ul className="mt-3 space-y-1">
                                        {SKIP_ORDER.filter((k) => (aud.data.skipped?.[k] ?? 0) > 0).map((k) => (
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
                                ) : aud.data && (
                                    <PeoplePicker rows={rows} skip={skip} onToggle={toggle} onSetMany={setMany} addIds={addIds}
                                        onAdd={addPerson} onRemoveAdded={removeAdded} more={Math.max(0, aud.data.total - rows.length)} />
                                )}
                            </div>
                        </Group>

                        {/* ── What ── */}
                        <Group title="The email" footer={template ? 'Changes here are for this send only. To change the email for good, edit it in Library.' : undefined}>
                            <div className="space-y-3">
                                <FormField label="Subject" right={`${draft.subject.length} / 50`}
                                    hint={draft.subject.length > 50 ? 'Phones cut subjects after about 40–50 characters.' : undefined}>
                                    <input className={INPUT} value={draft.subject} onChange={set('subject')} placeholder="One clear promise, under 50 characters" />
                                </FormField>
                                <p className="px-1 text-[12px] leading-snug text-slate-500">
                                    The inbox shows your first sentence under the subject, so make it the point of the email.
                                    Emails go out as plain text-style mail so they land in Primary, not Promotions.
                                </p>
                                {template && templates.isLoading ? (
                                    <div className="h-72 animate-pulse rounded-2xl bg-slate-200/60" />
                                ) : (
                                    <BodyEditor value={draft.body} onChange={(body) => setDraft((d) => ({ ...d, body }))} variables={variables} />
                                )}
                                {badLinks.length > 0 && (
                                    <p className="flex items-start gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] leading-snug text-rose-800 ring-1 ring-inset ring-rose-600/20">
                                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                        <span>
                                            The team site sends links only to testoza.com or YouTube. Take out: <strong>{badLinks.join(', ')}</strong>.
                                            If it must stay, ask the owner to send this one from admin.
                                        </span>
                                    </p>
                                )}
                            </div>
                        </Group>

                        {/* ── From ── */}
                        <Group title="From" footer={!replyOk ? undefined : replyOwn
                            ? `Replies go to ${replyAddr}. Check that inbox exists, or replies bounce. Saved for ${fromEmail} on this device.`
                            : `Replies go to ${teamInbox}, where the team reads them.`}>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <FormField label="Name people see">
                                    <input className={INPUT} value={fromName} onChange={(e) => setFromName(e.target.value)} />
                                </FormField>
                                <FormField label="Address">
                                    <select className={INPUT} value={fromEmail} onChange={(e) => setFromEmail(e.target.value)}>
                                        {(overview?.defaults.senders ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </FormField>
                                <div className="sm:col-span-2">
                                    <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                                        <label htmlFor={replyId} className="text-[13px] font-medium text-slate-600">Replies go to</label>
                                        {replyOwn && (
                                            <button type="button" className="text-[12px] font-semibold text-indigo-700 hover:underline"
                                                onClick={() => { setReplyTo(teamInbox); rememberReply(fromEmail, teamInbox); }}>
                                                Use team inbox
                                            </button>
                                        )}
                                    </div>
                                    <input id={replyId} type="email" className={INPUT} value={replyTo} placeholder={teamInbox}
                                        autoComplete="off" spellCheck={false} inputMode="email"
                                        aria-invalid={!replyOk || undefined} aria-describedby={`${replyId}-hint`}
                                        onChange={(e) => setReplyTo(e.target.value)} onBlur={keepReply} />
                                    <p id={`${replyId}-hint`} className="mt-1 px-1 text-[12px] leading-snug empty:hidden">
                                        {!replyValid ? (
                                            <span className="font-medium text-rose-600">That doesn’t look like an email address.</span>
                                        ) : replyBlocked ? (
                                            <span className="font-medium text-rose-600">
                                                Nobody reads {replyDomain}: it only sends, so replies would bounce.
                                                Use an inbox someone checks, like {replyAddr.split('@')[0]}@{homeDomain}.
                                            </span>
                                        ) : replyOutside ? (
                                            <span className="text-amber-700">
                                                Spam filters trust a {homeDomain} reply address most. A personal Gmail or Yahoo here can push the email to Spam.
                                            </span>
                                        ) : null}
                                    </p>
                                </div>
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
                onClose={() => setConfirm(false)}
                title={`Send to ${num(ready)} ${ready === 1 ? 'person' : 'people'}?`}
                message={<>
                    “{draft.subject}” goes out now, up to {num(overview?.limits.hourly_limit ?? 40)} an hour.{' '}
                    {todayRoom < ready && <>{num(todayRoom)} can go today; the rest carry on after that, as long as this window stays open (or Resume from History).{' '}</>}
                    None of them will get another email from us for {overview?.limits.cooldown_days ?? 7} days. The owner sees that you sent it.
                </>}
                confirm="Send"
                onConfirm={go}
            />
        </Sheet>
    );
}

export function TemplateRules({ t }: { t: TemplateSummary }) {
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
