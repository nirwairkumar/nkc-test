// Shapes shared by the AI importer page and its processing / review views.
// They mirror the /ai/parse-stream and /ai/parse responses.

export interface Question {
    id: number;
    type: 'single' | 'multiple' | 'numerical' | string;
    question: string;
    image?: string | null;
    options?: { [key: string]: string | { text: string; image?: string | null } } | null;
    optionImages?: { [key: string]: string | null };
    correctAnswer?: string | string[] | { min: number; max: number } | null;
    needsAnswer?: boolean;
    marks?: number;
    negativeMarks?: number;
    diagramPage?: number | null;
    passageContent?: string;
    groupId?: string;
    page?: number;
}

export interface Section {
    id?: string;
    name?: string;
    attempt_control?: {
        enabled: boolean;
        mode?: string;
        max_attempts?: number;
    };
    questions?: Question[];
    marks_per_question?: number;
    negative_marks?: number;
    question_type?: string;
}

export interface ParseResponse {
    title?: string;
    description?: string;
    revision_notes?: string;
    questions: Question[];
    canConfirm?: boolean;
    unansweredCount?: number;
    totalPages?: number;
    processedPages?: number;
    enable_section_mode?: boolean;
    sections?: Section[];
    duration?: number;
    /** Set when the run finishes (and stored with AI history). */
    execution_time_seconds?: number;
    /** How marks were decided (backend ai_preview_importer/marking.py): teacher > paper > +1/0. */
    marking?: MarkingSummary;
}

export type MarkingSource = 'teacher' | 'paper' | 'default';

export interface MarkingSummary {
    /** The value every question shares, or null when it varies between questions. */
    marks: number | string | null;
    negativeMarks: number | string | null;
    marks_source: MarkingSource;
    negative_source: MarkingSource;
    varies: boolean;
}

export type ProcessMode = 'extract' | 'generate';

export type BackendStage = 'uploading' | 'analyzing' | 'processing' | 'extracting' | 'finalizing' | 'complete' | 'error';

/** One `progress` event, stamped with the time it reached the browser. */
export interface StreamProgress {
    stage: BackendStage;
    percent: number;
    message: string;
    data?: Record<string, unknown> & { pipeline?: string; quality_tier?: string; dpi?: number; warning?: boolean };
    at: number;
}

/** A question received live from the stream. `key` is unique even when the model repeats ids. */
export interface StreamedQuestion {
    key: string;
    question: Question;
    at: number;
}

/** The four rows the processing screen shows. */
export type StageKey = 'upload' | 'read' | 'find' | 'finish';

/** Wall-clock start/end (ms) of each stage, so hidden tabs never lose time. */
export type StageTimes = Partial<Record<StageKey, { start: number; end?: number }>>;

export interface ExtractionMeta {
    quality_tier?: string;
    dpi?: number;
    warning?: boolean;
}
