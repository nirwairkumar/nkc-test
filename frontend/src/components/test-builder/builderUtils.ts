import type { Question } from '@/lib/testsApi';
import type { PhotoQuestion } from '@/lib/photoQuestionApi';

export interface QuestionState extends Omit<Question, 'correctAnswer' | 'options'> {
    options: { [key: string]: string };
    correctAnswer: any;
    typingMode: 'en' | 'hi';
}

export const DEFAULT_QUESTION: QuestionState = {
    id: 1,
    type: 'single',
    question: '',
    passageContent: '',
    groupId: '',
    options: { A: '', B: '', C: '', D: '' },
    correctAnswer: '',

    typingMode: 'en',
    marks: '1',
    negativeMarks: '0'
};

export const QUESTION_TYPE_LABELS: Record<string, string> = {
    single: 'Single correct',
    multiple: 'Multiple correct',
    numerical: 'Numerical answer',
    comprehension: 'Passage / case study',
};

/** Digits and one decimal point only — marks can't be negative or text. */
export const sanitizeNumericalMark = (val: string): string => {
    let sanitized = val.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    return sanitized;
};

/** Google Drive share links → direct image links. */
export const processImageUrl = (url: string) => {
    if (!url) return url;
    const match = url.match(/drive\.google\.com\/file\/d\/([-_\w]+)/);
    if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    const openMatch = url.match(/drive\.google\.com\/open\?id=([-_\w]+)/);
    if (openMatch && openMatch[1]) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
    return url;
};

export const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

const CLOUDINARY_CLOUD = 'dma0h19mk';
const CLOUDINARY_PRESET = 'TestoZa_cloudinary';

export async function uploadImageToCloudinary(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await res.json().catch(() => null);
    return data?.secure_url ?? null;
}

/**
 * Small pictures are stored inline (as before); anything bigger than `inlineLimit`
 * goes to the image cloud instead of being rejected.
 */
export async function imageFileToSrc(file: File, inlineLimit = 50 * 1024): Promise<string | null> {
    if (!file.type.startsWith('image/')) return null;
    if (file.size <= inlineLimit) return readFileAsDataUrl(file);
    return uploadImageToCloudinary(file);
}

const hasText = (v: unknown) => typeof v === 'string' && v.trim().length > 0;

/**
 * What still stops this question from being saved, in plain words — or null when it is ready.
 * Mirrors the checks TestBuilder runs on save.
 */
export function questionIssue(q: QuestionState): string | null {
    if (!hasText(q.question) && !q.image) return 'Question is empty';
    if (q.type === 'numerical') {
        const ans = q.correctAnswer;
        if (!ans || typeof ans !== 'object') return 'Set the correct number';
        if (ans.exactMatch) return hasText(ans.exactAnswers) ? null : 'Add the correct number(s)';
        if (ans.min === undefined || ans.max === undefined) return 'Set the lowest and highest correct value';
        if (Number(ans.min) > Number(ans.max)) return 'Lowest value is bigger than the highest';
        return null;
    }
    for (const key of Object.keys(q.options || {}).sort()) {
        if (!hasText(q.options[key]) && !q.optionImages?.[key]) return `Option ${key} is empty`;
    }
    if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
        return 'Choose the correct answer';
    }
    return null;
}

export function hasAnswer(q: QuestionState): boolean {
    if (q.type === 'numerical') return !!q.correctAnswer && typeof q.correctAnswer === 'object';
    return Array.isArray(q.correctAnswer) ? q.correctAnswer.length > 0 : !!q.correctAnswer;
}

/** Replaces a question's content with what was read from a photo, keeping its marks and place. */
export function applyPhotoResult(q: QuestionState, r: PhotoQuestion): QuestionState {
    const next: QuestionState = {
        ...q,
        question: r.question,
        type: r.type,
        typingMode: r.language === 'hi' ? 'hi' : q.typingMode,
        optionImages: undefined,
        image: r.image || q.image,
    };
    if (r.type === 'numerical') {
        next.options = Object.keys(q.options || {}).length ? Object.fromEntries(Object.keys(q.options).map(k => [k, ''])) : { ...DEFAULT_QUESTION.options };
        const a = r.correctAnswer as { min: number; max: number } | null;
        next.correctAnswer = a && typeof a === 'object' && !Array.isArray(a)
            ? { min: a.min, max: a.max, exactMatch: false, exactAnswers: '' }
            : { min: 0, max: 0, exactMatch: false, exactAnswers: '' };
    } else {
        next.options = Object.keys(r.options).length ? { ...r.options } : { ...DEFAULT_QUESTION.options };
        if (r.type === 'multiple') {
            next.correctAnswer = Array.isArray(r.correctAnswer) ? r.correctAnswer : r.correctAnswer ? [r.correctAnswer] : [];
        } else {
            next.correctAnswer = typeof r.correctAnswer === 'string' ? r.correctAnswer : '';
        }
    }
    return next;
}
