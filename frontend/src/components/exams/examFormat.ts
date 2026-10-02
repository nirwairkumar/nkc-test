import { useEffect, useRef, useState } from 'react';
import type { IdentityMode, Phase, ResultsRelease } from '@/lib/examSessionsApi';

/* Wording shared by the teacher and student exam screens. */

export const IDENTITY_LABEL: Record<IdentityMode, string> = {
    name: 'Name only',
    roll: 'Roll number',
    roll_pin: 'Roll number + PIN',
};

export const IDENTITY_HINT: Record<IdentityMode, string> = {
    name: 'Quickest. Good for a class quiz. Candidates type their own name.',
    roll: 'For weekly tests. The name fills in from your batch list.',
    roll_pin: 'For mocks that go to parents. Like JEE/NEET: roll number + a 4-digit PIN.',
};

export const RELEASE_LABEL: Record<ResultsRelease, string> = {
    on_end: 'When the exam ends',
    immediate: 'Right after each candidate submits',
    manual: 'When I release them',
};

export const PHASE_LABEL: Record<Phase, string> = {
    scheduled: 'Scheduled',
    lobby: 'Lobby open',
    live: 'Live',
    ended: 'Ended',
};

/**
 * Strong and weak topics by share of marks: strong at 60% or more, needs practice below
 * 50%. A topic is never in both, and topics with one question are too thin to judge.
 */
export function topicSplit<T extends { score: number; max: number; total: number }>(topics: T[]) {
    const scored = topics.filter(t => t.total >= 2 && t.max > 0).map(t => ({ t, share: t.score / t.max }));
    return {
        strong: scored.filter(x => x.share >= 0.6).sort((a, b) => b.share - a.share).slice(0, 3).map(x => x.t),
        weak: scored.filter(x => x.share < 0.5).sort((a, b) => a.share - b.share).slice(0, 3).map(x => x.t),
    };
}

/** JEE-style percentile: the share of students who scored the same or less. */
export function percentile(score: number, allScores: number[]): number {
    if (!allScores.length) return 0;
    return Math.round((allScores.filter(s => s <= score).length / allScores.length) * 100);
}

export const fullDate = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** 75 -> "1:15", 3725 -> "1:02:05". */
export function clock(seconds: number): string {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export function minutesText(seconds: number): string {
    const m = Math.round(seconds / 60);
    if (m < 1) return 'less than a minute';
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return m % 60 ? `${h} hr ${m % 60} min` : `${h} hr`;
}

export const timeOnly = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';

export function dayTime(iso: string | null | undefined, now: Date = new Date()): string {
    if (!iso) return '';
    const date = new Date(iso);
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
    const t = timeOnly(iso);
    if (diff === 0) return `Today, ${t}`;
    if (diff === 1) return `Tomorrow, ${t}`;
    if (diff === -1) return `Yesterday, ${t}`;
    return `${date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}, ${t}`;
}

/**
 * The server's clock, ticking every second. Students' phones are often minutes off,
 * so every countdown is measured against the time the server last reported.
 */
export function useServerClock(serverTimeIso: string | null | undefined, tickMs = 1000) {
    const skew = useRef(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (serverTimeIso) skew.current = new Date(serverTimeIso).getTime() - Date.now();
    }, [serverTimeIso]);

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), tickMs);
        return () => window.clearInterval(id);
    }, [tickMs]);

    return now + skew.current;
}

/** Poll `fn` every `ms` while the tab is visible (and once when it becomes visible). */
export function usePoll(fn: () => void, ms: number, enabled = true) {
    const saved = useRef(fn);
    saved.current = fn;
    useEffect(() => {
        if (!enabled) return;
        const tick = () => { if (document.visibilityState === 'visible') saved.current(); };
        const id = window.setInterval(tick, ms);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(id);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [ms, enabled]);
}
