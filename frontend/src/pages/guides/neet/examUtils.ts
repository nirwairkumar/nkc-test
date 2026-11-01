/** Helpers shared by the NEET guide's product replicas (ExamScreen, ResultsScreen, the demos). */
import { useEffect, type RefObject } from 'react';

export type PillState = 'nv' | 'na' | 'ans' | 'rev' | 'revans';

export const isAnswered = (s: PillState) => s === 'ans' || s === 'revans';
export const isMarked = (s: PillState) => s === 'rev' || s === 'revans';

/** TestPage's formatTime. */
export const formatExamTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export interface ResultSection {
    name: string;
    totalQ: number;
    correct: number;
    wrong: number;
    skipped: number;
    marksPer?: number;
    negative?: number;
}

export const sectionScore = (s: ResultSection) => (s.marksPer ?? 4) * s.correct - (s.negative ?? 1) * s.wrong;
export const sectionMax = (s: ResultSection) => (s.marksPer ?? 4) * s.totalQ;

/** Sets the `inert` attribute (React 18 has no prop for it), so hidden or decorative UI can't take focus. */
export function useInert(ref: RefObject<HTMLElement>, on: boolean) {
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (on) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    }, [ref, on]);
}
