/**
 * Small shared pieces for Admin → Manage Tests: what state a test is in, how to say it,
 * and the one-line facts that identify it.
 */
import { CalendarClock, CircleCheck, Globe, Link2, Lock, Radio } from 'lucide-react';
import React from 'react';
import { cn } from '@/lib/utils';
import { num } from '../analytics/format';
import { Chip } from '../analytics/ui';
import type { TestRow, Visibility } from './api';

export const VISIBILITY: Record<Visibility, { label: string; hint: string; icon: React.ElementType }> = {
    public: { label: 'Public', hint: 'Listed on TestoZa; anyone can find and take it.', icon: Globe },
    unlisted: { label: 'Link only', hint: 'Anyone with the link can take it; not listed.', icon: Link2 },
    private: { label: 'Private', hint: 'Only the creator can open it.', icon: Lock },
};

/** The tile on the left of a row: live exams first, then how the test can be reached. */
export function StateIcon({ t, size = 'md' }: { t: Pick<TestRow, 'status' | 'visibility'>; size?: 'md' | 'lg' }) {
    const box = size === 'lg' ? 'h-12 w-12 rounded-[14px]' : 'h-10 w-10 rounded-xl';
    const icon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
    if (t.status === 'live') {
        return (
            <span className={cn(box, 'relative flex shrink-0 items-center justify-center bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/15')}>
                <Radio className={icon} aria-hidden="true" />
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" aria-hidden="true" />
            </span>
        );
    }
    if (t.status === 'scheduled') {
        return (
            <span className={cn(box, 'flex shrink-0 items-center justify-center bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-600/15')}>
                <CalendarClock className={icon} aria-hidden="true" />
            </span>
        );
    }
    const V = VISIBILITY[t.visibility]?.icon || Lock;
    return (
        <span className={cn(box, 'flex shrink-0 items-center justify-center bg-slate-100 text-slate-500')}>
            {t.status === 'ended' ? <CircleCheck className={icon} aria-hidden="true" /> : <V className={icon} aria-hidden="true" />}
        </span>
    );
}

/** Chips that say what is special about a test. Ordinary tests get none. */
export function StateChips({ t }: { t: TestRow }) {
    return (
        <>
            {t.status === 'live' && (
                <Chip tone="emerald" title={t.writing_now > 0 ? 'Active in the last 3 minutes' : undefined}>
                    {t.writing_now > 0 ? `Live · ${t.writing_now} writing` : 'Live exam'}
                </Chip>
            )}
            {t.status === 'scheduled' && <Chip tone="sky">Scheduled</Chip>}
            {t.status === 'ended' && <Chip>Exam ended</Chip>}
            {t.is_example && <Chip tone="amber" title="The example test every new account gets">Example</Chip>}
            {t.is_cloned && <Chip tone="violet">Copy</Chip>}
            {t.reports_open > 0 && <Chip tone="rose">{t.reports_open} report{t.reports_open === 1 ? '' : 's'}</Chip>}
        </>
    );
}

/** "#M568 · 15 Qs · 19 min · 40 marks" */
export function factsLine(t: Pick<TestRow, 'custom_id' | 'questions' | 'minutes' | 'marks' | 'sections'>): string {
    return [
        t.custom_id ? `#${t.custom_id}` : null,
        `${num(t.questions)} Q${t.questions === 1 ? '' : 's'}`,
        t.minutes ? `${t.minutes} min` : null,
        t.marks ? `${Number(t.marks)} marks` : null,
        t.sections && t.sections > 1 ? `${t.sections} sections` : null,
    ].filter(Boolean).join(' · ');
}

export const pctText = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${Math.round(Number(v))}%`);

export function initialsOf(name: string | null | undefined): string {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Small round creator picture, or their initials. */
export function CreatorAvatar({ name, url, size = 'sm' }: { name?: string; url?: string; size?: 'sm' | 'md' }) {
    const box = size === 'md' ? 'h-10 w-10 text-[13px]' : 'h-5 w-5 text-[9px]';
    if (url) return <img src={url} alt="" className={cn(box, 'shrink-0 rounded-full object-cover ring-1 ring-slate-900/[0.06]')} />;
    return (
        <span className={cn(box, 'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-700 font-bold text-white')}>
            {initialsOf(name)}
        </span>
    );
}
