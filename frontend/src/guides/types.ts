/**
 * Guides: long-form pages on testoza.com (e.g. testoza.com/best-online-test-platform)
 * that live in the codebase rather than the blog.
 *
 * Like src/blog/articles, everything under src/guides is plain, dependency-free
 * TypeScript. The React page renders from it, and the Cloudflare worker
 * (infrastructure/cloudflare-worker/worker.js in the root repo) imports the same
 * files to give crawlers the full text, head tags and JSON-LD. Keep it free of
 * React, path aliases ("@/…") and browser APIs, or the worker build breaks.
 */
import type { ArticleFaq, ArticleSourceGroup } from '../blog/articles/types';

export type { ArticleFaq as GuideFaq, ArticleSourceGroup as GuideSourceGroup };

/** Interactive parts of a guide. The React page renders them; crawlers get `fallbackHtml`. */
export type GuideWidget =
    // best-online-test-platform
    | 'live-exam'
    | 'results-rings'
    // cbt-exam-software
    | 'omr-to-cbt'
    | 'marking-lab'
    | 'exam-day'
    // jee-mock-test-platform
    | 'notation-table'
    | 'ai-before-after'
    | 'sypad-playground'
    | 'partial-marks'
    | 'batch-report'
    // ai-test-generator
    | 'mode-compare'
    | 'settings-lab'
    | 'review-screen'
    | 'material-picker'
    | 'time-saved'
    // neet-online-test-software
    | 'neet-time-planner'
    | 'neet-exam-demo'
    | 'neet-ai-import'
    | 'neet-batch-audit'
    | 'neet-score-lab'
    | 'neet-student-result'
    // moodle-alternative
    | 'moodle-audit'
    | 'moodle-support'
    | 'moodle-exam-room'
    | 'moodle-marking'
    // how-to-conduct-online-exam
    | 'conduct-planner'
    | 'conduct-new-exam'
    | 'conduct-rules'
    | 'conduct-exam-day'
    | 'conduct-checklist'
    // hindi-online-test-maker
    | 'hindi-typing'
    | 'hindi-unicode-check'
    | 'hindi-ai-language'
    | 'hindi-exam-screen'
    // prevent-cheating-in-online-exams
    | 'cheat-methods'
    | 'cheat-sandbox'
    | 'cheat-copy-check'
    | 'cheat-planner'
    // math-test-maker
    | 'math-paste'
    | 'math-ai-import'
    | 'math-sypad'
    | 'math-notation'
    | 'math-numerical'
    | 'math-exam'
    | 'math-options'
    // chemistry-question-paper-maker
    | 'chem-paste'
    | 'chem-ai-import'
    | 'chem-sypad'
    | 'chem-notation'
    | 'chem-numerical'
    | 'chem-exam'
    | 'chem-options'
    // jee-advanced-mock-test-software
    | 'jadv-marking'
    | 'jadv-papers'
    | 'jadv-numerical'
    | 'jadv-exam'
    | 'jadv-options';

/** A piece of a guide body. `html` is trusted, hand-written markup. */
export type GuideBlock = { type: 'html'; html: string } | { type: 'widget'; widget: GuideWidget; fallbackHtml: string };

export interface GuideSection {
    /** Anchor id, also used by the section navigation. */
    id: string;
    title: string;
    /** Short label for the section navigation. */
    tocLabel: string;
    /** Small label above the heading. */
    kicker?: string;
    blocks: GuideBlock[];
}

export interface GuideMeta {
    slug: string;
    /** Path on testoza.com, e.g. "/best-online-test-platform". */
    path: string;
    /** The on-page headline (H1). */
    title: string;
    /** Title for search results and the browser tab, without the site name. */
    seoTitle: string;
    /** Meta description (under 160 characters). */
    description: string;
    /** Standfirst under the headline. */
    dek: string;
    author: string;
    /** ISO dates (Asia/Kolkata midday, so they never shift a day). */
    datePublished: string;
    dateModified: string;
    readMinutes: number;
    cover: { src: string; alt: string; width: number; height: number };
    keywords: string[];
    /** The main call to action (hero button, floating button, crawler link). Defaults to the AI test generator. */
    cta?: { label: string; href: string };
}

export interface Guide {
    meta: GuideMeta;
    body: {
        intro: GuideBlock[];
        /** The quotable short answer (plain text), shown in a box and used as the JSON-LD abstract. */
        answer: string;
        sections: GuideSection[];
        faqs: ArticleFaq[];
        /** Heading of the closing section. Defaults to "Start with one real test". */
        closingTitle?: string;
        closing: GuideBlock[];
        sources: ArticleSourceGroup[];
    };
}
