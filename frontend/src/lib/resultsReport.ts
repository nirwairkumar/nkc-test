import { isNumericalCorrect } from '@/utils/numericalAnswer';
import { multiPartialScore } from '@/utils/multiCorrect';
import {
    ScoredAttempt, TestResultSummary, WEAK_PCT, readStudent, summariseByTest, toAttemptRow,
} from '@/lib/teacherDashboardApi';

/**
 * The results report for one test (/analytics/full?testId=…): rank list, how the class did,
 * and how each question went.
 *
 * Who counts is decided by the dashboard's rules (summariseByTest): the creator's own runs
 * never count, and a conducted test only counts its exam attempts. Marks come from the
 * server's score; per-question numbers are worked out here with the same marking rules as
 * the Results panel's Excel file (and backend scoring.py).
 */

export type AnswerStatus = 'correct' | 'partial' | 'wrong' | 'skipped';

export interface ReportRow extends ScoredAttempt {
    /** Shared by candidates with the same marks, wrong and skipped answers. */
    rank: number;
    correct: number;
    /** Seconds from start to submit, when the start time is known. */
    seconds: number | null;
    /** Everything else they typed on the start form, as one line. */
    details: string;
    /** The attempt as the server sent it (answers, metadata), for the answer sheet. */
    raw: any;
}

export interface ReportOption {
    key: string;
    text: string;
    isCorrect: boolean;
    /** Candidates who picked this option. */
    picked: number;
}

export interface ReportQuestion {
    number: number;
    section: string | null;
    type: string;
    text: string;
    image?: string;
    options: ReportOption[];
    answerText: string;
    correct: number;
    partial: number;
    wrong: number;
    skipped: number;
    /** Share of all candidates who got it fully right, 0–100. */
    pctCorrect: number;
    /** The wrong option most candidates fell for, if one stands out. */
    trap: ReportOption | null;
}

export interface Report {
    summary: TestResultSummary | null;
    rows: ReportRow[];
    questions: ReportQuestion[];
    sections: { name: string; questions: number; pctCorrect: number }[];
    /** Candidates per fifth of the marks: 0–19%, 20–39% … 80–100%. */
    spread: { label: string; from: number; count: number }[];
    medianPct: number | null;
    passing: { marks: number; passed: number } | null;
    maxMarks: number;
    /** The creator's own runs of this test, left out of everything. */
    ownRuns: number;
}

/* ── Marking ─────────────────────────────────────────────────────────────── */

/** "4", 4 or "1/3" → number. */
export function toMarks(value: unknown, fallback: number): number {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value === 'number') return isNaN(value) ? fallback : value;
    const s = String(value).trim();
    if (s.includes('/')) {
        const [a, b] = s.split('/').map(parseFloat);
        if (!isNaN(a) && !isNaN(b) && b !== 0) return a / b;
    }
    const n = parseFloat(s);
    return isNaN(n) ? fallback : n;
}

interface PaperQuestion {
    q: any;
    section: string | null;
    marks: number;
    negative: number;
}

/** Every question in paper order, with the marks it carries. */
export function paperQuestions(test: any): PaperQuestion[] {
    const testMarks = toMarks(test?.marks_per_question, 4);
    const testNeg = toMarks(test?.negative_marks, 0);
    const own = (q: any, marks: number, negative: number, section: string | null): PaperQuestion => ({
        q,
        section,
        marks: toMarks(q?.marks, marks),
        negative: toMarks(q?.negativeMarks, negative),
    });
    if (test?.enable_section_mode && Array.isArray(test.sections) && test.sections.length > 0) {
        return test.sections.flatMap((sec: any) => {
            const m = toMarks(sec.marks_per_question, testMarks);
            const n = toMarks(sec.negative_marks, testNeg);
            return (sec.questions || []).map((q: any) => own(q, m, n, sec.name || null));
        });
    }
    return (test?.questions || []).map((q: any) => own(q, testMarks, testNeg, null));
}

const isBlank = (a: unknown) => a === undefined || a === null || a === '' || (Array.isArray(a) && a.length === 0);

export function answerOf(answers: any, q: any): unknown {
    if (!answers || typeof answers !== 'object' || q?.id === undefined) return undefined;
    return answers[q.id] ?? answers[String(q.id)];
}

/** Same rules as the Results panel's Excel file and backend scoring.py. */
export function gradeAnswer(q: any, answer: unknown, marks: number, negative: number): { status: AnswerStatus; score: number } {
    if (isBlank(answer)) return { status: 'skipped', score: 0 };
    const ca = q?.correctAnswer;
    const isMulti = q?.type === 'multiple' || Array.isArray(ca);
    if (isMulti) {
        const correctSet = new Set((Array.isArray(ca) ? ca : [ca]).map(String));
        const picked = Array.isArray(answer) ? answer.map(String) : [String(answer)];
        if (picked.length === correctSet.size && picked.every(v => correctSet.has(v))) return { status: 'correct', score: marks };
        if (picked.length > 0 && picked.every(v => correctSet.has(v))) {
            return { status: 'partial', score: multiPartialScore(q, picked.length, correctSet.size, marks) };
        }
        return { status: 'wrong', score: -negative };
    }
    if (q?.type === 'numerical') {
        let ok: boolean;
        if (ca && typeof ca === 'object') ok = isNumericalCorrect(ca, answer);
        else {
            const u = parseFloat(String(answer));
            const c = parseFloat(String(ca));
            ok = !isNaN(u) && !isNaN(c) ? u === c : String(answer).trim().toLowerCase() === String(ca).trim().toLowerCase();
        }
        return ok ? { status: 'correct', score: marks } : { status: 'wrong', score: -negative };
    }
    const ok = String(answer).trim().toLowerCase() === String(ca ?? '').trim().toLowerCase();
    return ok ? { status: 'correct', score: marks } : { status: 'wrong', score: -negative };
}

/** The answer key as a teacher would write it: "B", "A, C", "2.5", "2.4 to 2.6". */
export function answerText(q: any): string {
    const ca = q?.correctAnswer;
    if (ca === undefined || ca === null || ca === '') return '—';
    if (Array.isArray(ca)) return ca.map(String).sort().join(', ');
    if (typeof ca === 'object') {
        if (ca.exactMatch) return String(ca.exactAnswers ?? '—');
        if ('min' in ca && 'max' in ca) return String(ca.min) === String(ca.max) ? String(ca.min) : `${ca.min} to ${ca.max}`;
        return '—';
    }
    return String(ca);
}

/* ── The report ──────────────────────────────────────────────────────────── */

const median = (xs: number[]) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function secondsTaken(raw: any): number | null {
    const start = Date.parse(raw?.metadata?.startedAt || '');
    const end = Date.parse(raw?.created_at || '');
    if (isNaN(start) || isNaN(end) || end <= start) return null;
    const s = Math.round((end - start) / 1000);
    // Longer than a day is a start time from an earlier, unfinished sitting.
    return s > 24 * 3600 ? null : s;
}

function detailsLine(sf: Record<string, unknown> | null | undefined, shown: string): string {
    if (!sf || typeof sf !== 'object') return '';
    return Object.entries(sf)
        .map(([k, v]) => [k, typeof v === 'string' || typeof v === 'number' ? String(v).trim() : ''] as const)
        .filter(([, v]) => v && v !== shown)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');
}

export function buildReport(test: any, rawAttempts: any[], creatorId: string | undefined): Report {
    const paper = paperQuestions(test);
    const maxMarks = Number(test?.total_max_marks) || paper.reduce((s, p) => s + p.marks, 0);
    const testForScoring = { ...test, total_max_marks: maxMarks };

    const ownRuns = creatorId ? rawAttempts.filter(a => a.user_id === creatorId).length : 0;
    const summary = summariseByTest([testForScoring], rawAttempts.map(toAttemptRow), creatorId).get(test.id) || null;
    const rawById = new Map(rawAttempts.map(a => [a.id, a]));

    // Ranks: equal marks, wrong and skipped answers share one, as in the WhatsApp rank list.
    let rank = 0;
    let prevKey = '';
    const rows: ReportRow[] = (summary?.ranked || []).map((a, i) => {
        const key = `${a.score}|${a.wrong}|${a.unattempted}`;
        if (key !== prevKey) rank = i + 1;
        prevKey = key;
        const raw = rawById.get(a.id);
        const stats = raw?.metadata?.stats || {};
        const counted = Number(stats.correctCount);
        const total = Number(stats.totalQuestions) || paper.length;
        const sf = raw?.metadata?.startFormData;
        // A name the start form didn't label as one: use its first answer.
        const firstTyped = sf && typeof sf === 'object'
            ? Object.values(sf).map(v => (typeof v === 'string' ? v.trim() : '')).find(Boolean) || null
            : null;
        const displayName = a.name ? a.displayName : (readStudent(sf).roll ? a.displayName : firstTyped || a.displayName);
        return {
            ...a,
            displayName,
            rank,
            correct: !isNaN(counted) && stats.correctCount !== undefined ? counted : Math.max(0, total - a.wrong - a.unattempted),
            seconds: secondsTaken(raw),
            details: detailsLine(sf, displayName),
            raw,
        };
    });

    // Questions: how the class answered each one.
    const questions: ReportQuestion[] = paper.map((p, idx) => {
        const opts = p.q?.options && typeof p.q.options === 'object' ? p.q.options : {};
        const ca = p.q?.correctAnswer;
        const correctKeys = new Set((Array.isArray(ca) ? ca : [ca]).filter(v => v !== undefined && v !== null).map(String));
        const options: ReportOption[] = p.q?.type === 'numerical' ? [] : Object.entries(opts).map(([key, text]) => ({
            key,
            text: String(text ?? ''),
            isCorrect: correctKeys.has(key),
            picked: 0,
        }));
        const byKey = new Map(options.map(o => [o.key, o]));
        const tally = { correct: 0, partial: 0, wrong: 0, skipped: 0 };
        rows.forEach(r => {
            const ans = answerOf(r.raw?.answers, p.q);
            tally[gradeAnswer(p.q, ans, p.marks, p.negative).status]++;
            (Array.isArray(ans) ? ans : isBlank(ans) ? [] : [ans]).forEach(v => {
                const o = byKey.get(String(v));
                if (o) o.picked++;
            });
        });
        const wrongOptions = options.filter(o => !o.isCorrect && o.picked > 0).sort((a, b) => b.picked - a.picked);
        const trap = wrongOptions[0] && wrongOptions[0].picked >= Math.max(2, tally.correct) ? wrongOptions[0] : null;
        return {
            number: idx + 1,
            section: p.section,
            type: p.q?.type || 'single',
            text: String(p.q?.question ?? p.q?.text ?? ''),
            image: p.q?.image,
            options,
            answerText: answerText(p.q),
            ...tally,
            pctCorrect: rows.length ? (tally.correct / rows.length) * 100 : 0,
            trap,
        };
    });

    const sectionNames = [...new Set(paper.map(p => p.section).filter((s): s is string => !!s))];
    const sections = sectionNames.map(name => {
        const qs = questions.filter(q => q.section === name);
        return { name, questions: qs.length, pctCorrect: qs.reduce((s, q) => s + q.pctCorrect, 0) / Math.max(1, qs.length) };
    });

    const pcts = rows.map(r => r.pct).filter((p): p is number => p !== null);
    const spread = [0, 20, 40, 60, 80].map(from => ({
        label: from === 80 ? '80–100%' : `${from}–${from + 19}%`,
        from,
        count: pcts.filter(p => (from === 0 ? p < 20 : from === 80 ? p >= 80 : p >= from && p < from + 20)).length,
    }));

    const passMarks = toMarks(test?.passing_marks, 0);
    return {
        summary,
        rows,
        questions,
        sections,
        spread,
        medianPct: median(pcts),
        passing: passMarks > 0 ? { marks: passMarks, passed: rows.filter(r => r.score >= passMarks).length } : null,
        maxMarks,
        ownRuns,
    };
}

export const needsHelp = (r: { pct: number | null }) => r.pct !== null && r.pct < WEAK_PCT;

export function durationText(seconds: number | null): string {
    if (seconds === null) return '—';
    if (seconds < 60) return `${seconds} s`;
    // Seconds only matter for a quick paper; past 10 minutes a teacher reads minutes.
    if (seconds < 600) return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
    const mins = Math.round(seconds / 60);
    return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

export const marksText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));
