/**
 * Survey 1.0 (app.testoza.com/survey/v1, pages/survey/SurveyV1Page.tsx): why educators who
 * made a test didn't send it, or didn't send more. One main reason, then one follow-up.
 *
 * The backend keeps the same questions with the fix behind every answer
 * (backend/app/routers/survey.py) and checks the keys and the routing: keep the two in step.
 * Answers are anonymous; read in admin → Support → Survey 1.0.
 */
import apiClient from '@/lib/apiClient';

export type QuestionKind = 'single' | 'multi' | 'text' | 'name' | 'email' | 'phone';

export interface SurveyOption {
    key: string;
    label: string;
    /** Where this answer leads, when it isn't the question's own `next`. */
    next?: string | null;
}

export interface SurveyQuestion {
    id: string;
    kind: QuestionKind;
    title: string;
    required: boolean;
    options?: SurveyOption[];
    /** null = the survey ends after this question. */
    next?: string | null;
    placeholder?: string;
}

export type SurveyAnswers = Record<string, string | string[]>;

const o = (key: string, label: string, next?: string | null): SurveyOption =>
    next === undefined ? { key, label } : { key, label, next };

export const SURVEY_V1: SurveyQuestion[] = [
    {
        id: 'status', kind: 'single', required: true,
        title: 'What happened with the test you made?',
        options: [
            o('not_sent', "I haven't sent it to my students yet", 'reason_not_sent'),
            o('sent_some', 'I sent it to some students', 'reason_sent'),
            o('whole_class', 'My whole class wrote it', 'reason_sent'),
            o('own_practice', "I made it for my own practice (I'm a student)", 'anything'),
            o('looking', 'I was just looking around', 'anything'),
        ],
    },
    {
        id: 'reason_not_sent', kind: 'single', required: true,
        title: 'What is the ONE main reason you haven’t sent it?',
        options: [
            o('not_due', "My class wasn't writing a test yet", 'timing'),
            o('paper', "My students write on paper, or don't have phones", 'paper_phones'),
            o('unclear', "I wasn't sure how it works for students", 'unclear'),
            o('trust', "I didn't trust it for a real exam", 'trust'),
            o('making', 'Making or fixing the test took too long', 'making'),
            o('permission', 'I need permission from my owner or school', 'permission'),
            o('broke', "Something didn't work when I tried it", 'broke'),
            o('else', 'Something else', 'anything'),
        ],
    },
    {
        id: 'reason_sent', kind: 'single', required: true,
        title: 'What stopped you giving it to more students, or giving another test?',
        options: [
            o('nothing', "Nothing, I'm giving more tests", 'anything'),
            o('no_test_due', 'No new test was due yet', 'anything'),
            o('phones', "Some students don't have phones or internet", 'paper_phones'),
            o('broke', 'Something went wrong during the exam', 'broke'),
            o('cheating', 'I worried about cheating, or saw it happen', 'trust'),
            o('results', "The results didn't show what I needed", 'results'),
            o('making', 'Making each test takes too long', 'making'),
            o('permission', "My owner or school didn't approve", 'permission'),
            o('else', 'Something else', 'anything'),
        ],
    },
    {
        id: 'timing', kind: 'single', required: true, next: 'anything',
        title: 'When your class’s test day came, what happened?',
        options: [
            o('not_yet', "The day hasn't come yet"),
            o('forgot', 'I forgot I had made it on TestoZa'),
            o('lost', "I couldn't find my test again"),
            o('paper', 'I gave it on paper instead'),
            o('other_app', 'I used Google Forms or another app', 'timing_app'),
        ],
    },
    {
        id: 'timing_app', kind: 'text', required: false, next: 'anything',
        title: 'Which app did you use, and what did it do better?',
        placeholder: 'e.g. Google Forms. My students already knew it.',
    },
    {
        id: 'paper_phones', kind: 'single', required: true, next: 'paper_time',
        title: 'How many of your students could write a test on a phone at home in the evening?',
        options: [o('all_most', 'All or most'), o('half', 'About half'), o('few', 'Few or none')],
    },
    {
        id: 'paper_time', kind: 'single', required: true, next: 'anything',
        title: 'In a paper test, what takes you the most time?',
        options: [
            o('making', 'Making the paper'),
            o('checking', 'Checking the copies'),
            o('marks', 'Writing marks and telling parents'),
        ],
    },
    {
        id: 'unclear', kind: 'single', required: true, next: 'anything',
        title: 'What were you unsure about?',
        options: [
            o('link', 'Where to find the link to send'),
            o('signup', 'Whether students need to sign up'),
            o('student_view', 'What my students would see'),
            o('go_live', 'What the “go live” screen meant'),
            o('stop_change', 'Whether I could stop or change it after sending'),
        ],
    },
    {
        id: 'trust', kind: 'single', required: true, next: 'anything',
        title: 'What worried you most?',
        options: [
            o('searching', 'Students searching answers on Google or other apps'),
            o('sharing', 'Students sharing answers with each other'),
            o('impersonation', 'Someone else writing it for a student'),
            o('site_down', 'The site stopping or slowing during the exam'),
            o('marks_wrong', 'Marks or the answer key being wrong'),
        ],
    },
    {
        id: 'making', kind: 'single', required: true, next: 'anything',
        title: 'What took the most time?',
        options: [
            o('ai_wrong', 'Fixing questions the AI read wrong', 'ai_issue'),
            o('typing', 'Typing questions myself'),
            o('settings_marks', 'Setting marks, time or sections'),
            o('find_setting', 'Finding the setting I wanted'),
        ],
    },
    {
        id: 'ai_issue', kind: 'single', required: false, next: 'anything',
        title: 'When the AI got it wrong, what was it mostly?',
        options: [
            o('formulas', 'Formulas'),
            o('diagrams', 'Diagrams or pictures'),
            o('options', 'Options missing or mixed up'),
            o('answer_key', 'Wrong answer key'),
            o('language', 'Hindi or other language text'),
        ],
    },
    {
        id: 'permission', kind: 'single', required: true, next: 'anything',
        title: 'What would your owner or school need to see to say yes?',
        options: [
            o('cost', 'What it costs'),
            o('trial', 'A trial with one class first'),
            o('report', 'A report they can show parents'),
            o('others_use', 'That other schools use it'),
            o('data_safe', 'That student data is safe'),
        ],
    },
    {
        id: 'broke', kind: 'multi', required: true, next: 'broke_detail',
        title: 'What went wrong?',
        options: [
            o('link', "The link didn't open"),
            o('stuck_start', 'Stuck before the test started'),
            o('timer', 'Timer was wrong'),
            o('submit', "Couldn't submit"),
            o('marks', 'Marks were wrong'),
            o('media', "Formulas, diagrams or pictures didn't show"),
            o('phone_hard', 'Hard to use on a phone'),
            o('results_missing', "Couldn't find the results"),
        ],
    },
    {
        id: 'broke_detail', kind: 'text', required: false, next: 'anything',
        title: 'What exactly happened?',
        placeholder: "e.g. On question 5 the picture didn't load on my student's phone",
    },
    {
        id: 'results', kind: 'single', required: true, next: 'anything',
        title: 'What did you need that wasn’t there?',
        options: [
            o('register', 'Marks by roll number, like my register'),
            o('rank', 'A rank list'),
            o('parents', "Each parent getting their child's result"),
            o('question_analysis', 'Which questions the class got wrong'),
            o('tab_switch', 'Who switched apps'),
            o('excel', 'Excel or printout'),
        ],
    },
    {
        id: 'anything', kind: 'text', required: false, next: 'name',
        title: 'Anything else? Tell us what happened.',
        placeholder: 'In your own words',
    },
    // "Want us to get back to you?": three small optional boxes on the last screen.
    { id: 'name', kind: 'name', required: false, next: 'email', title: 'Name', placeholder: 'Name' },
    { id: 'email', kind: 'email', required: false, next: 'whatsapp', title: 'Email', placeholder: 'Email' },
    { id: 'whatsapp', kind: 'phone', required: false, next: null, title: 'Phone / WhatsApp', placeholder: 'Phone / WhatsApp' },
];

export const SURVEY_Q: Record<string, SurveyQuestion> = Object.fromEntries(SURVEY_V1.map((q) => [q.id, q]));

/** The last screen holds all of these together. */
export const FINAL_STEP = 'final';
const FINAL_IDS = ['anything', 'name', 'email', 'whatsapp'];

/** Where the survey goes after this answer (same rule as `_next` in survey.py). */
export function nextQuestion(q: SurveyQuestion, value: string | string[] | undefined): string | null {
    if (q.kind === 'single' && typeof value === 'string') {
        const opt = q.options?.find((x) => x.key === value);
        if (opt && opt.next !== undefined) return opt.next;
    }
    return q.next ?? null;
}

export const isAnswered = (q: SurveyQuestion, v: string | string[] | undefined) =>
    Array.isArray(v) ? v.length > 0 : typeof v === 'string' && v.trim() !== '';

/**
 * The screens this person sees, in order, from their answers so far. It stops at a
 * required question that has no answer yet, because what comes after depends on it.
 */
export function stepsFor(answers: SurveyAnswers): string[] {
    const steps: string[] = [];
    const seen = new Set<string>();
    let id: string | null = SURVEY_V1[0].id;
    while (id && !seen.has(id)) {
        seen.add(id);
        if (FINAL_IDS.includes(id)) {
            steps.push(FINAL_STEP);
            break;
        }
        steps.push(id);
        const q = SURVEY_Q[id];
        if (q.required && !isAnswered(q, answers[id])) break;
        id = nextQuestion(q, answers[id]);
    }
    return steps;
}

/** Only the answers on the path taken; going back and changing course drops the old branch. */
export function answersToSend(answers: SurveyAnswers): SurveyAnswers {
    const ids = stepsFor(answers).flatMap((s) => (s === FINAL_STEP ? FINAL_IDS : [s]));
    const out: SurveyAnswers = {};
    for (const id of ids) {
        const v = answers[id];
        if (!isAnswered(SURVEY_Q[id], v)) continue;
        out[id] = typeof v === 'string' ? v.trim() : v;
    }
    return out;
}

/** Same check as the backend: digits, spaces, dashes, brackets, an optional +. */
export const isPhoneOk = (s: string) => s.trim() === '' || /^\+?[\d\s()-]{7,20}$/.test(s.trim());
export const isEmailOk = (s: string) => s.trim() === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());

function newId(): string {
    try {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    } catch { /* fall through */ }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

function device(): 'phone' | 'tablet' | 'computer' {
    const ua = navigator.userAgent || '';
    if (/iPad|Tablet/i.test(ua)) return 'tablet';
    if (/Mobi|Android|iPhone/i.test(ua)) return 'phone';
    return 'computer';
}

// ── Draft and sending ─────────────────────────────────────────────────────────

const DRAFT_KEY = 'tz_survey_v1_draft';
const SENT_KEY = 'tz_survey_v1_sent';

export interface SurveyDraft {
    answers: SurveyAnswers;
    /** Screen index; -1 = the welcome screen. */
    at: number;
    /** Made on the first send, so a retry is saved once. */
    id?: string;
}

export function loadDraft(): SurveyDraft | null {
    try {
        const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        return d && typeof d === 'object' && d.answers ? d : null;
    } catch {
        return null;
    }
}

export function saveDraft(d: SurveyDraft | null) {
    try {
        if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
        else localStorage.removeItem(DRAFT_KEY);
    } catch { /* private mode: the draft lives for this tab only */ }
}

export function wasSent(): boolean {
    try {
        return !!localStorage.getItem(SENT_KEY);
    } catch {
        return false;
    }
}

export function forgetSent() {
    try { localStorage.removeItem(SENT_KEY); } catch { /* ignore */ }
}

export async function sendSurvey(answers: SurveyAnswers, id?: string): Promise<string> {
    const responseId = id || newId();
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('utm_source') || undefined;
    await apiClient.post('/survey/v1', {
        id: responseId,
        answers: answersToSend(answers),
        context: { device: device(), ref },
    });
    try { localStorage.setItem(SENT_KEY, String(Date.now())); } catch { /* ignore */ }
    saveDraft(null);
    return responseId;
}

export { newId as newSurveyId };
