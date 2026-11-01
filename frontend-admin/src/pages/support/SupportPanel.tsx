/**
 * Admin → Support: every message written on the Help page (app.testoza.com/help) or the
 * public /support page, with what we need to answer without asking back: the page they
 * came from, their screen, a screenshot, their account (tests made, joined when).
 *
 * Reply here and the writer gets it on their Help page, as a notification, and by email
 * once SMTP is set. WhatsApp and email buttons are there for a faster personal answer.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronRight, ImageIcon, Inbox, Mail, MessageSquare, Phone } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { initials, num, relative } from '../analytics/format';
import { ErrorState, usePersisted } from '../analytics/shared';
import { CARD, Chip, Empty, GroupedList, PILL_BTN, Segmented, Skeleton } from '../analytics/ui';
import { feedbackApi, supportApi, TOPIC_LABEL, type SupportMessage, type SupportView } from './api';
import ConversationSheet, { STATUS_CHIP } from './ConversationSheet';
import FeedbackPanel, { CountLabel } from './FeedbackPanel';
import SurveyPanel from './SurveyPanel';
import { surveyApi, surveyQueryKey } from './surveyApi';

const VIEWS: readonly SupportView[] = ['open', 'replied', 'resolved', 'all'];
const PAGE = 30;
/**
 * Messages = Help page conversations; Feedback = notes about TestoZa itself (FeedbackPanel);
 * Survey 1.0 = the survey at app.testoza.com/survey/v1, no name needed (SurveyPanel).
 */
type Section = 'messages' | 'feedback' | 'survey';
const SECTIONS: readonly Section[] = ['messages', 'feedback', 'survey'];



export default function SupportPanel() {
    const [view, setView] = usePersisted<SupportView>('tz_admin_support_view', 'open', VIEWS);
    const [params, setParams] = useSearchParams();
    const [savedSection, setSavedSection] = usePersisted<Section>('tz_admin_support_section', 'messages', SECTIONS);
    // A feedback notification links ?tab=support&section=feedback&id=…
    const linkedFeedback = params.get('section') === 'feedback';
    // A survey notification links ?tab=support&section=survey
    const linkedSurvey = params.get('section') === 'survey';
    const section: Section = linkedFeedback ? 'feedback' : linkedSurvey ? 'survey' : savedSection;
    const setSection = (s: Section) => {
        setSavedSection(s);
        if (params.has('section') || params.has('id')) {
            params.delete('section');
            params.delete('id');
            setParams(params, { replace: true });
        }
    };
    const deepId = linkedFeedback || linkedSurvey ? null : params.get('id');
    const [openId, setOpenId] = useState<string | null>(deepId);

    // Same keys as the Support badge in AdminDashboard, so the counts share one request.
    const { data: waiting } = useQuery({
        queryKey: ['support', 'waiting'],
        queryFn: async () => (await supportApi.list({ view: 'open', limit: 1 })).counts.open,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
    const { data: unreadFeedback } = useQuery({
        queryKey: ['support', 'feedback', 'unread-count'],
        queryFn: async () => (await feedbackApi.list({ view: 'unread', limit: 1 })).counts.unread,
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
    // Same key as SurveyPanel, so the badge and the panel share one request.
    const { data: survey } = useQuery({
        queryKey: surveyQueryKey(),
        queryFn: () => surveyApi.get(),
        staleTime: 30_000,
        retry: false,
    });

    const list = useInfiniteQuery({
        queryKey: ['support', 'list', view],
        queryFn: ({ pageParam }) => supportApi.list({ view, limit: PAGE, offset: pageParam as number }),
        enabled: section === 'messages',
        initialPageParam: 0,
        getNextPageParam: (last, pages) => {
            const loaded = pages.reduce((a, pg) => a + pg.rows.length, 0);
            return loaded < last.total ? loaded : undefined;
        },
        placeholderData: keepPreviousData,
        staleTime: 15_000,
        refetchInterval: 60_000,
    });

    const rows = useMemo(() => list.data?.pages.flatMap((p) => p.rows) ?? [], [list.data]);
    const first = list.data?.pages[0];
    const open = rows.find((r) => r.id === openId) ?? null;

    // A notification link (?tab=support&id=…) opens that message; look in "All" if it isn't in this view.
    useEffect(() => {
        if (!deepId || !first || list.isPlaceholderData) return;
        if (!rows.some((r) => r.id === deepId) && view !== 'all') setView('all');
    }, [deepId, first, rows, view, setView, list.isPlaceholderData]);

    const close = () => {
        setOpenId(null);
        if (deepId) {
            params.delete('id');
            setParams(params, { replace: true });
        }
    };

    return (
        <div className="space-y-5 pb-10">
            <header>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Inbox</p>
                <h1 className="mt-1.5 !text-[28px] font-bold leading-[1.1] tracking-[-0.025em] text-slate-900 sm:!text-[34px]">Support</h1>
                <p className="mt-2 hidden text-[15px] text-slate-600 sm:block">
                    {section === 'messages'
                        ? 'Messages from the Help page. Answer fast: a reply within hours is what keeps a new teacher.'
                        : section === 'survey'
                            ? 'Survey 1.0 answers: why educators who made a test didn’t send it, sorted into what to fix.'
                            : 'What creators think of TestoZa: from the Feedback page in the app menu and right after they stop an exam.'}
                </p>
            </header>

            <Segmented<Section>
                ariaLabel="Support section"
                value={section}
                onChange={setSection}
                options={[
                    { value: 'messages', label: <CountLabel text="Messages" n={waiting} accent /> },
                    { value: 'feedback', label: <CountLabel text="Feedback" n={unreadFeedback} accent /> },
                    { value: 'survey', label: <CountLabel text="Survey 1.0" n={survey?.total} /> },
                ]}
            />

            {section === 'survey' ? (
                <SurveyPanel />
            ) : section === 'feedback' ? (
                <FeedbackPanel focusId={linkedFeedback ? params.get('id') : null} />
            ) : (<>

            {first && !first.emails_on && (
                <div className="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900 ring-1 ring-inset ring-amber-600/20">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        Emails are off until <span className="font-mono text-[12px]">SMTP_PASSWORD</span> is set. Replies still reach signed-in
                        users on their Help page and as a notification; for anyone else use the Email or WhatsApp buttons.
                    </span>
                </div>
            )}

            <div className="-mx-1 overflow-x-auto px-1 pb-0.5">
                <Segmented<SupportView>
                    ariaLabel="Messages"
                    value={view}
                    onChange={setView}
                    options={[
                        { value: 'open', label: <ViewLabel text="Waiting" n={first?.counts.open} accent /> },
                        { value: 'replied', label: <ViewLabel text="Replied" n={first?.counts.replied} /> },
                        { value: 'resolved', label: <ViewLabel text="Resolved" n={first?.counts.resolved} /> },
                        { value: 'all', label: <ViewLabel text="All" n={first?.counts.all} /> },
                    ]}
                />
            </div>

            {list.error && !list.data ? (
                <ErrorState error={list.error} onRetry={() => list.refetch()} />
            ) : !list.data ? (
                <div className={cn(CARD, 'space-y-3 p-4')}>{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : rows.length === 0 ? (
                <div className={CARD}>
                    <Empty icon={view === 'open' ? CheckCircle2 : Inbox} title={view === 'open' ? 'Nobody is waiting' : 'No messages here'}>
                        {view === 'open' && 'Every message has an answer.'}
                    </Empty>
                </div>
            ) : (
                <>
                    <GroupedList className={cn(list.isPlaceholderData && 'opacity-60')}>
                        {rows.map((m) => <Row key={m.id} m={m} onOpen={() => setOpenId(m.id)} />)}
                    </GroupedList>
                    {list.hasNextPage && (
                        <div className="flex justify-center">
                            <button type="button" className={PILL_BTN} onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
                                {list.isFetchingNextPage ? 'Loading…' : `Show more (${num((first?.total ?? 0) - rows.length)} left)`}
                            </button>
                        </div>
                    )}
                </>
            )}

            </>)}

            <ConversationSheet messageId={openId} preview={open} onClose={close} />
        </div>
    );
}

function ViewLabel({ text, n, accent }: { text: string; n?: number; accent?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            {text}
            {n !== undefined && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-semibold tabular-nums',
                    accent && n > 0 ? 'bg-amber-500 text-white' : 'bg-slate-900/[0.06] text-slate-500')}>
                    {n}
                </span>
            )}
        </span>
    );
}

function Avatar({ m }: { m: SupportMessage }) {
    if (m.account?.avatar_url) {
        return <img src={m.account.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]" />;
    }
    return (
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white',
            m.user_id ? 'from-sky-500 to-sky-700' : 'from-slate-300 to-slate-400')}>
            {initials(m.account?.full_name || m.name)}
        </span>
    );
}

function Row({ m, onOpen }: { m: SupportMessage; onOpen: () => void }) {
    const s = STATUS_CHIP[m.status || 'pending'] || STATUS_CHIP.pending;
    const last = m.thread?.[m.thread.length - 1];
    return (
        <li>
            <button type="button" onClick={onOpen}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                <Avatar m={m} />
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[14px] font-semibold text-slate-900">{m.account?.full_name || m.name}</span>
                        <Chip tone={s.tone}>{s.label}</Chip>
                        {m.topic && <Chip>{TOPIC_LABEL[m.topic] || m.topic}</Chip>}
                        {!m.user_id && <Chip title="Sent from the public /support page">Not signed in</Chip>}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[13px] leading-relaxed text-slate-600">
                        {last && last.author === 'user' ? <span className="font-medium text-slate-800">Wrote again: </span> : null}
                        {last && last.author === 'user' ? last.body : m.message}
                    </span>
                    <span className="mt-1 flex items-center gap-2 text-[12px] text-slate-400">
                        <span className="truncate">{m.email}</span>
                        {m.screenshot_url && <ImageIcon className="h-3.5 w-3.5 shrink-0" aria-label="Has a screenshot" />}
                        {m.phone && <Phone className="h-3.5 w-3.5 shrink-0" aria-label="Left a phone number" />}
                        {m.thread?.length > 0 && (
                            <span className="inline-flex shrink-0 items-center gap-0.5" title="Replies in this conversation">
                                <MessageSquare className="h-3.5 w-3.5" /> {m.thread.length}
                            </span>
                        )}
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[12px] text-slate-500">{relative(m.last_activity_at || m.created_at)}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                </span>
            </button>
        </li>
    );
}
