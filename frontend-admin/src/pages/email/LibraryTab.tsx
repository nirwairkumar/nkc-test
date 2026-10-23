/**
 * Admin → Email → Library: every ready-made email. Edit the words or the rules,
 * duplicate, restore a built-in to its original text, archive, or write a new one.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Copy, Plus, RotateCcw, Send } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { relative } from '../analytics/format';
import { CARD, Chip, Skeleton } from '../analytics/ui';
import { emailApi, errorText, type Overview, type Stage, type Template, type TemplateSummary, type Who } from './api';
import TemplateList from './TemplateList';
import { STAGES, WHOS } from './model';
import { BodyEditor, ChoiceChips, Confirm, EmailPreview, Field, Group, INPUT, PRIMARY_BTN, SOFT_BTN, WideSheet } from './parts';

export default function LibraryTab({ overview, onSend }: { overview?: Overview; onSend: (t: TemplateSummary) => void }) {
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
    const groups: { title: string; items: Template[] }[] = [
        ...STAGES.map((s) => ({ title: s.label, items: live.filter((t) => t.stages.length === 1 && t.stages[0] === s.key) })),
        { title: 'For several stages', items: live.filter((t) => t.stages.length !== 1) },
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
                        <button type="button" onClick={() => setShowArchived((v) => !v)}
                            className="h-9 rounded-full px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-100">
                            {showArchived ? 'Hide archived' : `Archived (${archived.length})`}
                        </button>
                    )}
                    <button type="button" onClick={() => setOpen('new')}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-900 px-4 text-[13px] font-semibold text-white hover:bg-slate-800">
                        <Plus className="h-4 w-4" aria-hidden="true" /> New template
                    </button>
                </div>
            </div>

            {!q.data ? (
                <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40" />)}</div>
            ) : groups.map((g) => (
                <section key={g.title}>
                    <h2 className="mb-2 px-1 !text-[17px] font-semibold tracking-[-0.01em] text-slate-900">{g.title}</h2>
                    <TemplateList items={g.items.map(summary)} onOpen={(t) => setOpen(all.find((x) => x.key === t.key) ?? null)} />
                </section>
            ))}

            <TemplateSheet
                template={open}
                variables={q.data?.variables ?? overview?.variables ?? {}}
                fromName={overview?.defaults.from_name ?? 'TestoZa'}
                onClose={() => setOpen(null)}
                onSend={(t) => { setOpen(null); onSend(summary(t)); }}
            />
        </div>
    );
}

type Draft = Pick<Template, 'name' | 'subject' | 'preheader' | 'body' | 'why' | 'track' | 'step' | 'wait_days' | 'stages' | 'audiences' | 'min_days_joined' | 'min_days_quiet'>;

const BLANK: Draft = {
    name: '', subject: '', preheader: '', why: '', track: null, step: 1, wait_days: 0, stages: [], audiences: ['educator', 'institution'],
    min_days_joined: 0, min_days_quiet: 0,
    body: 'Hi {first_name|there},\n\n\n\n[[Open TestoZa]](https://app.testoza.com/dashboard)\n\nNirwair\nTestoZa',
};

function TemplateSheet({ template, variables, fromName, onClose, onSend }: {
    template: Template | 'new' | null;
    variables: Record<string, { label: string; sample: string }>;
    fromName: string;
    onClose: () => void;
    onSend: (t: Template) => void;
}) {
    const qc = useQueryClient();
    const isNew = template === 'new';
    const t = template && template !== 'new' ? template : null;
    const [d, setD] = useState<Draft>(BLANK);
    const [confirmRestore, setConfirmRestore] = useState(false);

    useEffect(() => {
        if (template === 'new') setD(BLANK);
        else if (template) setD({ ...template });
    }, [template]);

    const dirty = isNew || (t && (Object.keys(BLANK) as (keyof Draft)[]).some((k) => JSON.stringify(d[k]) !== JSON.stringify(t[k])));
    const done = (msg: string) => {
        toast.success(msg);
        qc.invalidateQueries({ queryKey: ['email'] });
    };

    const save = useMutation({
        // An empty series name (not null) is how the server knows to clear it.
        mutationFn: () => {
            const body = { ...d, track: (d.track ?? '') as string | null };
            return isNew ? emailApi.createTemplate(body) : emailApi.updateTemplate(t!.key, body);
        },
        onSuccess: () => { done(isNew ? 'Email added to the library' : 'Saved'); onClose(); },
        onError: (e) => toast.error(errorText(e)),
    });
    const act = useMutation({
        mutationFn: (what: 'duplicate' | 'restore' | 'archive' | 'unarchive') =>
            what === 'duplicate' ? emailApi.duplicateTemplate(t!.key)
                : what === 'restore' ? emailApi.restoreTemplate(t!.key)
                    : emailApi.updateTemplate(t!.key, { archived: what === 'archive' }),
        onSuccess: (_r, what) => {
            done({ duplicate: 'Copy made: find it under “For several stages”', restore: 'Back to the original text', archive: 'Archived: it won’t be offered or sent', unarchive: 'Back in the library' }[what]);
            onClose();
        },
        onError: (e) => toast.error(errorText(e)),
    });

    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
    const numInput = (k: 'step' | 'wait_days' | 'min_days_joined' | 'min_days_quiet', min = 0) => (
        <input type="number" min={min} className={INPUT} value={d[k]} onChange={(e) => set(k, Math.max(min, Number(e.target.value) || min))} />
    );

    return (
        <WideSheet
            open={!!template}
            onOpenChange={(o) => !o && onClose()}
            title={isNew ? 'New template' : t?.name ?? ''}
            subtitle={t ? (t.is_builtin ? `Ready-made${t.edited ? ', edited' : ''}${t.updated_at ? ` · saved ${relative(t.updated_at)}` : ''}` : 'Written by the team') : 'Write once, send to anyone it fits'}
            footer={
                <div className="flex flex-wrap items-center gap-2">
                    {t && (
                        <>
                            <button type="button" className={SOFT_BTN} onClick={() => act.mutate('duplicate')} disabled={act.isPending}>
                                <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Duplicate</span>
                            </button>
                            {t.is_builtin && t.edited && (
                                <button type="button" className={SOFT_BTN} onClick={() => setConfirmRestore(true)} disabled={act.isPending}>
                                    <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Restore original</span>
                                </button>
                            )}
                            <button type="button" className={SOFT_BTN} onClick={() => act.mutate(t.archived ? 'unarchive' : 'archive')} disabled={act.isPending}>
                                {t.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                                <span className="hidden sm:inline">{t.archived ? 'Unarchive' : 'Archive'}</span>
                            </button>
                        </>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {t && !t.archived && !dirty && (
                            <button type="button" className={SOFT_BTN} onClick={() => onSend(t)}><Send className="h-4 w-4" /> Send…</button>
                        )}
                        <button type="button" className={PRIMARY_BTN} disabled={!dirty || save.isPending || !d.name.trim() || !d.subject.trim()} onClick={() => save.mutate()}>
                            {save.isPending ? 'Saving…' : isNew ? 'Add to library' : 'Save'}
                        </button>
                    </div>
                </div>
            }
        >
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-5">
                    <Group title="The email">
                        <div className="space-y-3">
                            <Field label="Name (only the team sees it)">
                                <input className={INPUT} value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Exam season reminder" />
                            </Field>
                            <Field label="Subject" right={`${d.subject.length} / 50`}>
                                <input className={INPUT} value={d.subject} onChange={(e) => set('subject', e.target.value)} />
                            </Field>
                            <Field label="Preview text" hint="The grey line after the subject in the inbox.">
                                <input className={INPUT} value={d.preheader} onChange={(e) => set('preheader', e.target.value)} />
                            </Field>
                            <BodyEditor value={d.body} onChange={(v) => set('body', v)} variables={variables} />
                        </div>
                    </Group>

                    <Group title="Who it’s for" footer="Empty means any. An email only ever reaches people who match all of these.">
                        <div className="space-y-3">
                            <div>
                                <p className="mb-1.5 text-[13px] font-medium text-slate-600">Stage</p>
                                <ChoiceChips<Stage> ariaLabel="Stage" value={d.stages} onChange={(v) => set('stages', v)} anyLabel="Any stage"
                                    options={STAGES.map((s) => ({ value: s.key, label: s.short, title: s.label }))} />
                            </div>
                            <div>
                                <p className="mb-1.5 text-[13px] font-medium text-slate-600">Group</p>
                                <ChoiceChips<Who> ariaLabel="Group" value={d.audiences} onChange={(v) => set('audiences', v)} anyLabel="Everyone"
                                    options={WHOS.map((w) => ({ value: w.key, label: w.plural, title: w.hint }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Days after joining">{numInput('min_days_joined')}</Field>
                                <Field label="Days since last visit">{numInput('min_days_quiet')}</Field>
                            </div>
                        </div>
                    </Group>

                    <Group title="Series" footer="Leave the series name empty for a one-off email. Emails of one series must have the same stage and group.">
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Series name">
                                <input className={INPUT} value={d.track ?? ''} onChange={(e) => set('track', e.target.value || null)} placeholder="none" />
                            </Field>
                            <Field label="Email number">{numInput('step', 1)}</Field>
                            <Field label="Days after the last">{numInput('wait_days')}</Field>
                        </div>
                    </Group>

                    <Group title="Notes for the sender">
                        <textarea value={d.why} onChange={(e) => set('why', e.target.value)} rows={3}
                            className={cn(INPUT, 'h-auto py-2 leading-snug')} placeholder="Why this email works, and anything to check before sending" />
                    </Group>
                </div>

                <div className="lg:sticky lg:top-0 lg:self-start">
                    <h3 className="mb-1.5 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Preview with a sample teacher</h3>
                    <EmailPreview draft={{ subject: d.subject, preheader: d.preheader, body: d.body }} userId={null} templateKey={t?.key} fromName={fromName} />
                </div>
            </div>

            <Confirm open={confirmRestore} onOpenChange={setConfirmRestore} title="Restore the original?"
                message="Your edits to this email are replaced by the text it shipped with." confirm="Restore" destructive
                onConfirm={() => act.mutate('restore')} />
        </WideSheet>
    );
}
