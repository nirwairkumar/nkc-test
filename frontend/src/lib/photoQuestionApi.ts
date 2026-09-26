import { getApiUrl } from '@/lib/getApiUrl';
import { tokenStorage } from '@/utils/tokenStorage';

export type PhotoQuestionType = 'single' | 'multiple' | 'numerical';

export interface PhotoQuestion {
    question: string;
    type: PhotoQuestionType;
    options: Record<string, string>;
    correctAnswer: string | string[] | { min: number; max: number } | null;
    /** Where the answer came from: a tick/circle on an option, a written "Ans:" line, or nowhere. */
    answerSource: 'marked' | 'answer_key' | 'none';
    language: 'en' | 'hi';
    otherQuestionsInPhoto: number;
    /** Cropped diagram from the photo, when there is one. */
    image?: string;
}

/** Phone photos are 3–12 MB; the model reads a 1600px JPEG just as well and it uploads in a second. */
async function shrinkPhoto(file: File, maxDim = 1600, quality = 0.85): Promise<File> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return file;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close?.();
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (!blob) return file;
        return new File([blob], (file.name || 'question').replace(/\.[^/.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    } catch {
        return file;
    }
}

function authHeaders(): Record<string, string> {
    const token = tokenStorage.getTokens().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(res: Response): Promise<string> {
    const data = await res.json().catch(() => null);
    if (res.status === 401) return 'Please sign in to read questions from photos.';
    if (res.status === 429) return data?.detail || 'Too many photos in a short time. Please wait a few minutes.';
    return data?.detail || `Could not read the photo (error ${res.status}).`;
}

/** Older backends only have the whole-paper importer: use it and keep the first question. */
async function readViaPaperImporter(base: string, photo: File, signal?: AbortSignal): Promise<PhotoQuestion> {
    const form = new FormData();
    form.append('files', photo);
    const res = await fetch(`${base}/ai/parse?mode=extract&languages=default`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
        signal,
    });
    if (!res.ok) throw new Error(await readError(res));
    const data = await res.json();
    const all: any[] = data?.questions?.length
        ? data.questions
        : (data?.sections || []).flatMap((s: any) => s?.questions || []);
    const q = all[0];
    if (!q) throw new Error('No question was found in this photo.');

    const options: Record<string, string> = {};
    if (q.options && typeof q.options === 'object') {
        Object.keys(q.options).sort().forEach(k => {
            const v = q.options[k];
            const text = v && typeof v === 'object' ? v.text : v;
            if (text != null && String(text).trim()) options[k.toUpperCase()] = String(text);
        });
    }
    const type: PhotoQuestionType = q.type === 'multiple' ? 'multiple'
        : q.type === 'numerical' || Object.keys(options).length === 0 ? 'numerical' : 'single';
    const answer = q.correctAnswer ?? null;

    return {
        question: String(q.question || q.questionText || ''),
        type,
        options: type === 'numerical' ? {} : options,
        correctAnswer: answer,
        answerSource: answer ? 'marked' : 'none',
        language: /[ऀ-ॿ]/.test(String(q.question || '')) ? 'hi' : 'en',
        otherQuestionsInPhoto: Math.max(0, all.length - 1),
        image: q.image || undefined,
    };
}

export async function readQuestionFromPhoto(
    file: File,
    opts: { expectedType?: PhotoQuestionType; signal?: AbortSignal } = {}
): Promise<PhotoQuestion> {
    const base = getApiUrl().replace(/\/$/, '');
    const photo = await shrinkPhoto(file);
    const form = new FormData();
    form.append('file', photo);
    const query = opts.expectedType ? `?expected_type=${opts.expectedType}` : '';

    const res = await fetch(`${base}/ai/read-question${query}`, {
        method: 'POST',
        headers: authHeaders(),
        body: form,
        signal: opts.signal,
    });

    if (res.status === 404 || res.status === 405) {
        return readViaPaperImporter(base, photo, opts.signal);
    }
    if (!res.ok) throw new Error(await readError(res));
    return res.json();
}
