/**
 * Admin → Support → Survey 1.0 API (backend: app/routers/survey.py `/survey/admin/{survey}`,
 * SQL: supabase/migrations/20261028120000_survey_responses.sql).
 *
 * The backend sends the questions with the fix behind every answer, so this panel has no
 * copy of the survey to keep in step.
 */
import apiClient from '@/lib/apiClient';

export interface SurveyOptionDef {
    key: string;
    label: string;
    /** What we build or change if this answer wins. */
    fix: string;
    /** The fix is mostly making something that already exists visible. */
    exists: boolean;
    /** Nothing to build ("the day hasn't come yet", "nothing stopped me"). */
    noop: boolean;
    next?: string | null;
}

export interface SurveyQuestionDef {
    id: string;
    /** name, email and phone are the optional "get back to you" boxes on the last screen. */
    kind: 'single' | 'multi' | 'text' | 'name' | 'email' | 'phone';
    title: string;
    short: string;
    required: boolean;
    next?: string | null;
    options?: SurveyOptionDef[];
}

export type SurveyAnswerValue = string | string[];

export interface SurveyRow {
    id: string;
    created_at: string;
    status?: string | null;
    reason?: string | null;
    answers: Record<string, SurveyAnswerValue>;
    whatsapp?: string | null;
    context?: { device?: string; ref?: string } | null;
}

export interface SurveyResults {
    survey: string;
    title: string;
    link: string;
    questions: SurveyQuestionDef[];
    total: number;
    /** More answers exist than were loaded (1,000). */
    capped: boolean;
    answered: Record<string, number>;
    counts: Record<string, Record<string, number>>;
    rows: SurveyRow[];
}

export const SURVEY_KEY = 'v1';
export const surveyQueryKey = (key = SURVEY_KEY) => ['support', 'survey', key] as const;

export const surveyApi = {
    get: async (key = SURVEY_KEY): Promise<SurveyResults> => (await apiClient.get(`/survey/admin/${key}`)).data,
};

/** Where an answer leads (same rule as the page and the backend). */
function nextOf(q: SurveyQuestionDef, value: SurveyAnswerValue | undefined): string | null {
    if (q.kind === 'single' && typeof value === 'string') {
        const opt = q.options?.find((o) => o.key === value);
        if (opt && opt.next !== undefined) return opt.next ?? null;
    }
    return q.next ?? null;
}

/** The questions one person answered, in the order they saw them (jsonb doesn't keep order). */
export function pathOf(questions: SurveyQuestionDef[], answers: Record<string, SurveyAnswerValue>): SurveyQuestionDef[] {
    const byId = new Map(questions.map((q) => [q.id, q]));
    const out: SurveyQuestionDef[] = [];
    const seen = new Set<string>();
    let id: string | null = questions[0]?.id ?? null;
    while (id && !seen.has(id)) {
        seen.add(id);
        const q = byId.get(id);
        if (!q) break;
        if (answers[id] !== undefined) out.push(q);
        id = nextOf(q, answers[id]);
    }
    return out;
}

export const isContact = (q: SurveyQuestionDef) => q.kind === 'name' || q.kind === 'email' || q.kind === 'phone';

/** The optional contact a person left (any of the three may be missing). */
export function contactOf(r: SurveyRow): { name?: string; email?: string; phone?: string } | null {
    const pick = (v: SurveyAnswerValue | undefined) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
    const c = { name: pick(r.answers.name), email: pick(r.answers.email), phone: pick(r.answers.whatsapp) || r.whatsapp || undefined };
    return c.name || c.email || c.phone ? c : null;
}

export function answerText(q: SurveyQuestionDef, value: SurveyAnswerValue | undefined): string {
    if (value === undefined) return '';
    const label = (k: string) => q.options?.find((o) => o.key === k)?.label ?? k;
    if (Array.isArray(value)) return value.map(label).join(', ');
    return q.options ? label(value) : value;
}
