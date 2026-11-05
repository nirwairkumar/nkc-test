/**
 * Email → Library: every ready-made email. With "Write and send emails": edit the words or the
 * rules, duplicate, restore a built-in to its original text, archive, or write a new one.
 * Without it: read each email and its preview. Every change is in the owner's activity log.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Copy, Plus, RotateCcw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Button, Skeleton, cx } from '@/components/ui';
import { relative } from '@/lib/format';
import { emailApi, errorText, type Overview, type Rule, type Stage, type Template, type TemplateSummary, type Who } from './api';
import { BodyEditor, ChoiceChips, Confirm, EmailPreview, FormField, Group, INPUT, Sheet } from './kit';
import { outsideLinks, RULES, STAGES, WHOS } from './model';
import TemplateList from './TemplateList';

export default function LibraryTab({ overview, canSend, onSend }: { overview?: Overview; canSend: boolean; onSend: (t: TemplateSummary) => void }) {
    const q = useQuery({ queryKey: ['email', 'templates'], queryFn: emailApi.templates, staleTime: 60_000 });
    const [showArchived, setShowArchived] = useState(false);
    const [open, setOpen] = useState<Template | 'new' | null>(null);

    const all = q.data?.templates ?? [];
    const summary = (t: Template): TemplateSummary => {
        const s = overview?.templates.find((x) => x.key === t.key);
        return { ...t, ready: s?.ready ?? 0, waiting: s?.waiting ?? 0, next_ready_at: s?.next_ready_at ?? null, sent: s?.sent ?? 0, last_sent_at: s?.last_sent_at ?? null };
    };
    const live = all.filter((t) => !t.archived);
    const archived = all.filter((t) => t.archived);
    const byStage = live.filter((t) => !t.rule);
    const groups: { title: string; items: Template[] }[] = [
        { title: 'Reminders', items: live.filter((t) => t.rule) },
        ...STAGES.map((s) => ({ title: s.label, items: byStage.filter((t) => t.stages.length === 1 && t.stages[0] === s.key) })),
        { title: 'For several stages', items: byStage.filter((t) => t.stages.length !== 1) },
        ...(showArchived ? [{ title: 'Archived', items: archived }] : []),
    ].filter((g) => g.items.length);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <p className="max-w-xl text-[13px] text-slate-600">
                    Emails with a number go out in order: a person gets 1, then 2 after a wait, and leaves the series by
                    themselves once they move to the next stage.
                </p>
                <div className="flex items-center gap-2">
                    {archived.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)}>
                            {showArchived ? 'Hide archived' : `Archived (${archived.length})`}
                        </Button>
                    )}
                    {canSend && (
                        <Button size="sm" onClick={() => setOpen('new')}><Plus className="h-4 w-4" aria-hidden="true" /> New template</Button>
                    )}
                </div>
            </div>

            {!q.data ? (
                <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
            ) : groups.map((g) => (
                <section key={g.title}>
                    <h2 className="mb-2 px-1 text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{g.title}</h2>
                    <TemplateList items={g.items.map(summary)} onOpen={(t) => setOpen(all.find((x) => x.key === t.key) ?? null)} />
                </section>
            ))}

            <TemplateSheet
                template={open}
                readOnly={!canSend}
                variables={q.data?.variables ?? overview?.variables ?? {}}
                fromName={overview?.defaults.from_name ?? 'TestoZa'}
                linkHosts={overview?.team.link_hosts ?? ['testoza.com', 'youtube.com', 'youtu.be']}
                onClose={() => setOpen(null)}
                onSend={(t) => { setOpen(null); onSend(summary(t)); }}
            />
        </div>
    );
}

type Draft = Pick<Template, 'name' | 'subject' | 'preheader' | 'body' | 'why' | 'track' | 'step' | 'wait_days' | 'stages' | 'audiences' | 'min_days_joined' | 'min_days_quiet' | 'rule'>;

const BLANK: Draft = {
    name: '', subject: '', preheader: '', why: '', track: null, step: 1, wait_days: 0, stages: [], audiences: ['educator', 'institution'],
    min_days_joined: 0, min_days_quiet: 0, rule: null,
    body: 'Hi {first_name|there},\n\n\n\n[[Open TestoZa]](https://app.testoza.com/dashboard)\n\nTeam\nTestoZa',
};

function TemplateSheet({ template, readOnly, variables, fromName, linkHosts, onClose, onSend }: {
    template: Template | 'new' | null;
    readOnly: boolean;
    variables: Record<string, { label: string; sample: string }>;
    fromName: string;
    linkHosts: string[];
    onClose: () => void;
    onSend: (t: Template) => void;
}) {
    const qc = useQueryClient();
    const toast = useToast();
    const isNew = template === 'new';
    const t = template && template !== 'new' ? template : null;
    const [d, setD] = useState<Draft>(BLANK);
    const [confirmRestore, setConfirmRestore] = useState(false);

    useEffect(() => {
        if (template === 'new') setD(BLANK);
        else if (template) setD({ ...template, rule: template.rule ?? null });
    }, [template]);

    const dirty = isNew || (t && (Object.keys(BLANK) as (keyof Draft)[]).some((k) => JSON.stringify(d[k] ?? null) !== JSON.stringify(t[k] ?? null)));
    const badLinks = outsideLinks(`${d.subject}\n\n${d.body}`, linkHosts);
    const done = (msg: string) => {
        toast(msg);
        void qc.invalidateQueries({ queryKey: ['email'] });
    };

    const save = useMutation({
        // An empty series name (not null) is how the server knows to clear it.
        mutationFn: () => {
            const { rule, ...rest } = d;
            const body: Partial<Template> = { ...rest, track: (rest.track ?? '') as string | null };
            if ((rule ?? null) !== (t?.rule ?? null)) body.rule = (rule ?? '') as Rule;
            return isNew ? emailApi.createTemplate(body) : emailApi.updateTemplate(t!.key, body);
        },
        onSuccess: () => { done(isNew ? 'Email added to the library' : 'Saved'); onClose(); },
        onError: (e) => toast(errorText(e), 'error'),
    });
    const act = useMutation({
        mutationFn: (what: 'duplicate' | 'restore' | 'archive' | 'unarchive') =>
            what === 'duplicate' ? emailApi.duplicateTemplate(t!.key)
                : what === 'restore' ? emailApi.restoreTemplate(t!.key)
                    : emailApi.updateTemplate(t!.key, { archived: what === 'archive' }),
        onSuccess: (_r, what) => {
            done({
                duplicate: t?.rule ? 'Copy made: find it under “Reminders”' : 'Copy made: find it under “For several stages”',
                restore: 'Back to the original text', archive: 'Archived: it won’t be offered or sent', unarchive: 'Back in the library',
            }[what]);
            onClose();
        },
        onError: (e) => toast(errorText(e), 'error'),
    });

    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
    const numInput = (k: 'step' | 'wait_days' | 'min_days_joined' | 'min_days_quiet', min = 0) => (
        <input type="number" min={min} disabled={readOnly} className={INPUT} value={d[k]} onChange={(e) => set(k, Math.max(min, Number(e.target.value) || min))} />
    );

    return (
        <Sheet
            open={!!template}
            onClose={onClose}
            title={isNew ? 'New template' : t?.name ?? ''}
            subtitle={t ? (t.is_builtin ? `Ready-made${t.edited ? ', edited' : ''}${t.updated_at ? ` · saved ${relative(t.updated_at)}` : ''}` : 'Written by the team') : 'Write once, send to anyone it fits'}
            footer={readOnly ? (
                <p className="text-[13px] text-slate-500">You can read the library. Editing and sending need “Write and send emails” from your admin.</p>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    {t && (
                        <>
                            <Button variant="secondary" onClick={() => act.mutate('duplicate')} disabled={act.isPending}>
                                <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Duplicate</span>
                            </Button>
                            {t.is_builtin && t.edited && (
                                <Button variant="secondary" onClick={() => setConfirmRestore(true)} disabled={act.isPending}>
                                    <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Restore original</span>
                                </Button>
                            )}
                            <Button variant="secondary" onClick={() => act.mutate(t.archived ? 'unarchive' : 'archive')} disabled={act.isPending}>
                                {t.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                <span className="hidden sm:inline">{t.archived ? 'Unarchive' : 'Archive'}</span>
                            </Button>
                        </>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {t && !t.archived && !dirty && (
                            <Button variant="secondary" onClick={() => onSend(t)}><Send className="h-4 w-4" /> Send…</Button>
                        )}
                        <Button busy={save.isPending} disabled={!dirty || !d.name.trim() || !d.subject.trim() || badLinks.length > 0} onClick={() => save.mutate()}>
                            {save.isPending ? 'Saving…' : isNew ? 'Add to library' : 'Save'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-5">
                    <Group title="The email">
                        <div className="space-y-3">
                            <FormField label="Name (only the team sees it)">
                                <input className={INPUT} disabled={readOnly} value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Exam season reminder" />
                            </FormField>
                            <FormField label="Subject" right={`${d.subject.length} / 50`}>
                                <input className={INPUT} disabled={readOnly} value={d.subject} onChange={(e) => set('subject', e.target.value)} />
                            </FormField>
                            <p className="px-1 text-[12px] leading-snug text-slate-500">
                                The inbox shows the first sentence under the subject, so make it the point of the email.
                            </p>
                            <BodyEditor value={d.body} onChange={(v) => set('body', v)} variables={variables} readOnly={readOnly} />
                            {badLinks.length > 0 && !readOnly && (
                                <p className="rounded-2xl bg-rose-50 px-4 py-3 text-[13px] leading-snug text-rose-800 ring-1 ring-inset ring-rose-600/20">
                                    The team site keeps links on testoza.com or YouTube. Take out: <strong>{badLinks.join(', ')}</strong>.
                                </p>
                            )}
                        </div>
                    </Group>

                    <Group title="Who it’s for" footer="Empty means any. An email only ever reaches people who match all of these.">
                        <div className="space-y-3">
                            <div>
                                <p className="mb-1.5 text-[13px] font-medium text-slate-600">Stage</p>
                                <ChoiceChips<Stage> ariaLabel="Stage" disabled={readOnly} value={d.stages} onChange={(v) => set('stages', v)} anyLabel="Any stage"
                                    options={STAGES.map((s) => ({ value: s.key, label: s.short, title: s.label }))} />
                            </div>
                            <div>
                                <p className="mb-1.5 text-[13px] font-medium text-slate-600">Group</p>
                                <ChoiceChips<Who> ariaLabel="Group" disabled={readOnly} value={d.audiences} onChange={(v) => set('audiences', v)} anyLabel="Everyone"
                                    options={WHOS.map((w) => ({ value: w.key, label: w.plural, title: w.hint }))} />
                            </div>
                            <div>
                                <p className="mb-1.5 text-[13px] font-medium text-slate-600">Only people who</p>
                                <ChoiceChips<Rule> ariaLabel="Only people who" disabled={readOnly} value={d.rule ? [d.rule] : []}
                                    onChange={(v) => set('rule', v.length ? v[v.length - 1] : null)} anyLabel="No extra rule"
                                    options={(Object.keys(RULES) as Rule[]).map((r) => ({ value: r, label: RULES[r].label, title: RULES[r].hint }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField label="Days after joining">{numInput('min_days_joined')}</FormField>
                                <FormField label="Days since last visit">{numInput('min_days_quiet')}</FormField>
                            </div>
                        </div>
                    </Group>

                    <Group title="Series" footer="Leave the series name empty for a one-off email. Emails of one series must have the same stage and group.">
                        <div className="grid grid-cols-3 gap-3">
                            <FormField label="Series name">
                                <input className={INPUT} disabled={readOnly} value={d.track ?? ''} onChange={(e) => set('track', e.target.value || null)} placeholder="none" />
                            </FormField>
                            <FormField label="Email number">{numInput('step', 1)}</FormField>
                            <FormField label="Days after the last">{numInput('wait_days')}</FormField>
                        </div>
                    </Group>

                    <Group title="Notes for the sender">
                        <textarea value={d.why} disabled={readOnly} onChange={(e) => set('why', e.target.value)} rows={3}
                            className={cx(INPUT, 'h-auto py-2 leading-snug')} placeholder="Why this email works, and anything to check before sending" />
                    </Group>
                </div>

                <div className="lg:sticky lg:top-0 lg:self-start">
                    <h3 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Preview with a sample teacher</h3>
                    <EmailPreview draft={{ subject: d.subject, preheader: d.preheader, body: d.body }} userId={null} templateKey={t?.key} fromName={fromName} />
                </div>
            </div>

            <Confirm open={confirmRestore} onClose={() => setConfirmRestore(false)} title="Restore the original?"
                message="Your edits to this email are replaced by the text it shipped with." confirm="Restore" destructive
                onConfirm={() => act.mutate('restore')} />
        </Sheet>
    );
}
