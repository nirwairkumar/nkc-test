// Turns the backend's sparse progress events into an honest, smoothly moving
// progress value. The backend reports a milestone percent at the start of each
// step/batch; between milestones we ease toward the next one at the pace the
// completed steps actually took, and never past it. Everything is computed from
// wall-clock timestamps, so a hidden (timer-throttled) tab shows the right
// numbers the moment it becomes visible again.

import type { BackendStage, Question, StageKey, StageTimes, StreamProgress } from './types';

export const STAGE_ORDER: StageKey[] = ['upload', 'read', 'find', 'finish'];

export function stageKeyOf(stage: BackendStage): StageKey | 'done' | null {
    switch (stage) {
        case 'uploading': return 'upload';
        case 'analyzing': return 'read';
        case 'processing':
        case 'extracting': return 'find';
        case 'finalizing': return 'finish';
        case 'complete': return 'done';
        default: return null;
    }
}

/** Closes every stage before `next` that is still running and opens `next`. */
export function advanceStage(times: StageTimes, next: StageKey | 'done', now: number): StageTimes {
    const nextIdx = next === 'done' ? STAGE_ORDER.length : STAGE_ORDER.indexOf(next);
    const out: StageTimes = { ...times };
    STAGE_ORDER.forEach((key, idx) => {
        const t = out[key];
        if (idx < nextIdx && t && t.end === undefined) out[key] = { ...t, end: now };
    });
    if (next !== 'done' && !out[next]) out[next] = { start: now };
    return out;
}

export function stageMs(times: StageTimes, key: StageKey, now: number): number {
    const t = times[key];
    if (!t) return 0;
    return Math.max(0, (t.end ?? now) - t.start);
}

/** Seconds per stage in the shape AI history has always stored (`timing_steps`). */
export function stageSeconds(times: StageTimes, now: number) {
    const s = (key: StageKey) => Math.round(stageMs(times, key, now) / 100) / 10;
    return { uploading: s('upload'), analyzing: s('read'), extracting: s('find'), finalizing: s('finish') };
}

// ── What the backend has told us about the run so far ─────────────────────────

export interface PipelineInfo {
    pipeline?: string;
    totalPages?: number;
    textPages?: number;
    scannedPages?: number;
    /** Stateful mode: sequential chat turns over page chunks. */
    totalSteps?: number;
    step?: number;
    stepStartedAt?: number;
    stepDurations: number[];
    pageRange?: [number, number];
    /** Parallel mode: page batches that finish independently. */
    totalBatches?: number;
    batchesDone: number;
    batchDoneTimes: number[];
    batchesStartedAt?: number;
    questionsFound?: number;
}

export const emptyPipelineInfo = (): PipelineInfo => ({ stepDurations: [], batchesDone: 0, batchDoneTimes: [] });

export function reducePipelineInfo(prev: PipelineInfo, p: StreamProgress): PipelineInfo {
    const info: PipelineInfo = { ...prev, stepDurations: prev.stepDurations, batchDoneTimes: prev.batchDoneTimes };
    const d = p.data || {};
    const msg = p.message || '';

    if (d.pipeline) info.pipeline = d.pipeline;
    if (typeof d.total_pages === 'number') info.totalPages = d.total_pages;
    if (typeof d.text_rich_pages === 'number') info.textPages = d.text_rich_pages;
    if (typeof d.image_only_pages === 'number') info.scannedPages = d.image_only_pages;
    if (typeof d.questions_found === 'number') info.questionsFound = d.questions_found;

    const totalSteps = d.total_steps ?? d.total_chunks;
    if (typeof totalSteps === 'number' && totalSteps > 0) info.totalSteps = totalSteps;
    if (typeof d.step === 'number' && d.step !== prev.step) {
        if (prev.step && prev.stepStartedAt) info.stepDurations = [...prev.stepDurations, p.at - prev.stepStartedAt];
        info.step = d.step;
        info.stepStartedAt = p.at;
    }
    const pages = msg.match(/pages?\s+(\d+)\s*(?:to|-|–)\s*(\d+)/i);
    if (pages) info.pageRange = [Number(pages[1]), Number(pages[2])];

    if (typeof d.total_batches === 'number' && d.total_batches > 0) {
        info.totalBatches = d.total_batches;
        if (!info.batchesStartedAt) info.batchesStartedAt = p.at;
    }
    const batch = msg.match(/batch\s+(\d+)\s*\/\s*(\d+)/i);
    if (batch && Number(batch[1]) > prev.batchesDone) {
        info.batchesDone = Number(batch[1]);
        info.totalBatches = Number(batch[2]);
        info.batchDoneTimes = [...prev.batchDoneTimes, p.at];
    }

    // A finished run closes the last step so the average stays honest.
    if ((p.stage === 'finalizing' || p.stage === 'complete') && prev.stepStartedAt && typeof d.step !== 'number') {
        info.stepDurations = [...prev.stepDurations, p.at - prev.stepStartedAt];
        info.stepStartedAt = undefined;
    }
    return info;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function batchInterval(info: PipelineInfo): number {
    const times = [info.batchesStartedAt ?? 0, ...info.batchDoneTimes].filter(Boolean);
    if (times.length < 2) return 0;
    return (times[times.length - 1] - times[0]) / (times.length - 1);
}

// ── Progress estimate ─────────────────────────────────────────────────────────

interface Segment {
    floor: number;
    ceil: number;
    tauMs: number;
    since: number;
}

/** The milestone we are at, the next one we are heading to, and the expected time to get there. */
export function progressSegment(p: StreamProgress, info: PipelineInfo, uploadBytes: number): Segment {
    const floor = Math.max(0, Math.min(100, p.percent || 0));
    const since = p.at;
    let ceil: number;
    let tauMs: number;

    switch (p.stage) {
        case 'uploading':
            ceil = Math.max(floor + 4, 10);
            tauMs = 3500 + (uploadBytes / (1024 * 1024)) * 700;
            break;
        case 'analyzing':
            ceil = floor < 20 ? 20 : 38;
            tauMs = floor < 20 ? 4000 : 6000;
            break;
        case 'processing':
        case 'extracting':
            if (info.totalSteps && info.step) {
                ceil = 40 + (Math.min(info.step, info.totalSteps) / info.totalSteps) * 50;
                tauMs = mean(info.stepDurations) || 45000;
            } else if (info.totalBatches) {
                const [from, to] = info.pipeline === 'vision' ? [45, 90] : [40, 80];
                ceil = from + (Math.min(info.batchesDone + 1, info.totalBatches) / info.totalBatches) * (to - from);
                tauMs = batchInterval(info) || 30000;
            } else if (p.stage === 'extracting') {
                ceil = Math.min(floor + 3, 90);
                tauMs = 15000;
            } else {
                ceil = floor < 40 ? 40 : 90;
                tauMs = floor < 40 ? 10000 : 90000;
            }
            break;
        case 'finalizing':
            ceil = 99;
            tauMs = 10000;
            break;
        case 'complete':
            return { floor: 100, ceil: 100, tauMs: 1, since };
        default:
            ceil = floor;
            tauMs = 1;
    }
    if (ceil <= floor) ceil = Math.min(floor + 2, 99);
    return { floor, ceil, tauMs, since };
}

/** Eases from floor toward ceil: ~90% of the way after one expected duration, never all the way. */
export function estimatePercent(seg: Segment, now: number): number {
    if (seg.floor >= 100) return 100;
    const t = Math.max(0, now - seg.since);
    const f = Math.min(0.95, 1 - Math.exp((-2.3 * t) / seg.tauMs));
    return seg.floor + (seg.ceil - seg.floor) * f;
}

const FINISH_MS = 8000;

/** Remaining time, only when enough of the run has finished to know the pace. */
export function estimateRemainingMs(p: StreamProgress, info: PipelineInfo, now: number): number | null {
    if (p.stage === 'complete') return 0;
    if (p.stage === 'finalizing') return null;
    if (info.totalSteps && info.step && info.stepDurations.length > 0) {
        const avg = mean(info.stepDurations);
        const inStep = now - (info.stepStartedAt ?? now);
        const thisStep = Math.max(avg - inStep, avg * 0.1);
        return thisStep + Math.max(0, info.totalSteps - info.step) * avg + FINISH_MS;
    }
    if (info.totalBatches && info.batchDoneTimes.length >= 2) {
        const every = batchInterval(info);
        const since = now - info.batchDoneTimes[info.batchDoneTimes.length - 1];
        return Math.max(every - since, every * 0.1) + Math.max(0, info.totalBatches - info.batchesDone - 1) * every + FINISH_MS;
    }
    return null;
}

// ── Copy ──────────────────────────────────────────────────────────────────────

const stripDots = (s: string) => s.replace(/(\.\.\.|…)\s*$/, '').trim();

/** Plain-language line for what is happening right now. */
export function describeProgress(p: StreamProgress | null, info: PipelineInfo, found: number): string {
    if (!p) return 'Connecting…';
    switch (p.stage) {
        case 'uploading':
            return /optimi[sz]ing/i.test(p.message) ? stripDots(p.message) : 'Uploading your file';
        case 'analyzing':
            if (info.totalPages && (info.textPages !== undefined || info.scannedPages !== undefined)) {
                const parts = [`${info.totalPages} page${info.totalPages === 1 ? '' : 's'}`];
                if (info.scannedPages) parts.push(`${info.scannedPages} scanned`);
                return `Found ${parts.join(' · ')}`;
            }
            return 'Reading your document';
        case 'processing':
        case 'extracting':
            if (info.totalSteps && info.step && info.pageRange) {
                return `Reading pages ${info.pageRange[0]}–${info.pageRange[1]}`;
            }
            if (info.totalBatches) {
                return info.batchesDone > 0
                    ? `${info.batchesDone} of ${info.totalBatches} page batches done`
                    : `Reading ${info.totalPages ? `${info.totalPages} pages` : 'pages'} in ${info.totalBatches} batches`;
            }
            if (/render/i.test(p.message)) return 'Preparing diagrams and scanned pages';
            return found > 0 ? `${found} question${found === 1 ? '' : 's'} so far` : 'AI is reading the pages';
        case 'finalizing':
            return 'Adding diagrams, answers and numbering';
        case 'complete':
            return 'All done';
        default:
            return stripDots(p.message || '');
    }
}

export function formatClock(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function formatDuration(ms: number): string {
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${String(Math.floor(s % 60)).padStart(2, '0')}s`;
}

export function formatRemaining(ms: number | null): string | null {
    if (ms === null) return null;
    if (ms < 45000) return 'Less than a minute left';
    if (ms < 90000) return 'About 1 minute left';
    return `About ${Math.round(ms / 60000)} minutes left`;
}

// ── Streamed question identity ────────────────────────────────────────────────

const optionText = (v: unknown) => (v && typeof v === 'object' ? String((v as { text?: string }).text ?? '') : String(v ?? ''));
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/**
 * Content fingerprint of a streamed question. Ids can't be used: every page
 * batch (and often every stateful step) numbers its questions from 1, so
 * de-duplicating by id silently dropped real questions from the live list.
 * Returns null for text too short to compare safely (e.g. "Refer to the diagram").
 */
export function questionFingerprint(q: Question): string | null {
    const text = squash(String(q?.question ?? ''));
    if (text.length < 20) return null;
    const opts = q.options ? Object.values(q.options).map(v => squash(optionText(v))).join('|') : '';
    return `${text}#${opts}`;
}
