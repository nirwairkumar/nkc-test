import React, { useState } from 'react';
import { IMEInput, type IMEInputHandle } from '@/components/ui/IMEInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertTriangle, Camera, Check, CheckCircle2, Cloud, GripVertical, ImageIcon, Loader2, Monitor, Plus,
    Sigma, Trash2, Undo2, Upload, X, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { type FieldMode, resolveTyping, useSecondLanguage } from '@/lib/typingLanguages';
import {
    type QuestionState, QUESTION_TYPE_LABELS, hasAnswer, imageFileToSrc, processImageUrl, sanitizeNumericalMark,
} from './builderUtils';
import { LanguageSwitch } from './LanguageSwitch';

/* ── shared bits ──────────────────────────────────────────────────────────── */

export interface PhotoBanner {
    answerSource: 'marked' | 'answer_key' | 'none';
    answerLabel: string;
    others: number;
}

const FIELD =
    'rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-900/[0.07] transition-[background-color,box-shadow] ' +
    'focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-500/45';
const BARE_TEXTAREA =
    'w-full resize-none border-0 bg-transparent shadow-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ' +
    'placeholder:text-slate-400 text-slate-900';
const TOOL_BTN =
    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-[background-color,transform] ' +
    'motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';
/** Small quiet buttons in the strip under the question text (photo, picture, maths). */
const STRIP_BTN =
    'inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold transition-[background-color,color,transform] ' +
    'motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';
const ICON_BTN =
    'flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 cursor-pointer';

/** Picture strip under a question or option: paste a link, upload, snip the screen, or send to the cloud. */
function ImagePicker({
    compact, onSet, onClose, onSnip, onCloud,
}: {
    compact?: boolean;
    onSet: (src: string) => void;
    onClose: () => void;
    onSnip?: () => void;
    onCloud?: (e: React.MouseEvent) => void;
}) {
    const [busy, setBusy] = useState(false);
    const upload = async (file?: File) => {
        if (!file) return;
        setBusy(true);
        try {
            const src = await imageFileToSrc(file);
            if (src) onSet(src);
            else toast.error('Could not upload that picture. Please try another one.');
        } catch {
            toast.error('Could not upload that picture. Please check your internet and try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-1.5', compact && 'mt-1.5')}>
            <ImageIcon className="ml-1.5 h-4 w-4 shrink-0 text-slate-400" />
            <input
                type="url"
                placeholder="Paste a picture link"
                aria-label="Picture link"
                className="h-8 min-w-[120px] flex-1 bg-transparent px-1 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                onPaste={e => {
                    const text = e.clipboardData.getData('text').trim();
                    if (text) { e.preventDefault(); onSet(processImageUrl(text)); }
                }}
                onKeyDown={e => {
                    const v = e.currentTarget.value.trim();
                    if (e.key === 'Enter' && v) { e.preventDefault(); onSet(processImageUrl(v)); }
                }}
                onBlur={e => { const v = e.currentTarget.value.trim(); if (v) onSet(processImageUrl(v)); }}
            />
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 text-[13px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/[0.06] hover:bg-slate-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }} />
            </label>
            {onSnip && (
                <button type="button" onClick={onSnip} title="Paste a screen snip (Win+Shift+S, then Ctrl+V)" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm ring-1 ring-slate-900/[0.06] hover:bg-sky-50">
                    <Monitor className="h-3.5 w-3.5" />
                </button>
            )}
            {onCloud && (
                <button type="button" onClick={onCloud} title="Put a picture inside the text (cloud upload)" className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sky-700 shadow-sm ring-1 ring-slate-900/[0.06] hover:bg-sky-50">
                    <Cloud className="h-3.5 w-3.5" />
                </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close picture options" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700">
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

function MarkField({ label, value, onChange, tone }: { label: string; value: string; onChange: (v: string) => void; tone: 'plus' | 'minus' }) {
    return (
        <label
            className="flex h-7 items-center gap-1 rounded-full bg-slate-100 pl-2 pr-0.5 text-[11.5px] font-medium text-slate-500 sm:pl-2.5"
            title={tone === 'plus' ? 'Marks for a right answer' : 'Marks taken away for a wrong answer'}
        >
            <span className="hidden sm:inline">{label}</span>
            <span className="flex h-6 items-center rounded-full bg-white px-1 shadow-sm ring-1 ring-slate-900/[0.06]">
                <span className={cn('text-[12px] font-bold', tone === 'plus' ? 'text-emerald-600' : 'text-red-600')}>{tone === 'plus' ? '+' : '−'}</span>
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="0"
                    aria-label={label}
                    className={cn('w-7 bg-transparent text-center text-[13px] font-bold tabular-nums focus:outline-none', tone === 'plus' ? 'text-slate-900' : 'text-red-600')}
                />
            </span>
        </label>
    );
}

/* ── passage (comprehension) pieces ───────────────────────────────────────── */

export function PassageHeader({
    value, typingMode, onChange, registerRef, refKey,
}: {
    value: string;
    typingMode: FieldMode;
    onChange: (v: string) => void;
    registerRef: (key: string, el: IMEInputHandle | null) => void;
    refKey: string;
}) {
    const typing = resolveTyping(typingMode, useSecondLanguage());
    return (
        <div className="mt-1 rounded-t-2xl border border-b-0 border-violet-200 bg-violet-50/70 p-3 sm:p-4">
            <p className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold text-violet-800">
                <FileText className="h-4 w-4" /> Passage — every question below it uses this text
            </p>
            <div className={cn(FIELD, 'bg-white')}>
                <IMEInput
                    as="textarea"
                    ref={(el: IMEInputHandle | null) => registerRef(refKey, el)}
                    typingMode={typing}
                    value={value}
                    onChange={onChange}
                    data-sypad-label="Passage"
                    livePreview
                    data-sypad-target={refKey}
                    placeholder="Write or paste the passage here…"
                    className={cn(BARE_TEXTAREA, 'min-h-[80px] p-3 text-[16px] leading-relaxed')}
                />
            </div>
        </div>
    );
}

export function PassageFooter({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="mb-1 flex justify-center rounded-b-2xl border border-t-0 border-violet-200 bg-violet-50/70 px-4 py-2">
            <button
                type="button"
                onClick={onAdd}
                className={cn(TOOL_BTN, 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-600/20 hover:bg-violet-50')}
            >
                <Plus className="h-4 w-4" /> Add another question to this passage
            </button>
        </div>
    );
}

/* ── the card ─────────────────────────────────────────────────────────────── */

interface QuestionCardProps {
    q: QuestionState;
    number: number;
    /** Stable key for this question's text boxes (Sy Pad target, cloud upload target). */
    refKey: string;
    update: (fn: (q: QuestionState) => QuestionState) => void;
    onRemove: () => void;
    canRemove: boolean;
    isInGroup: boolean;
    isEndOfGroup: boolean;
    registerRef: (key: string, el: IMEInputHandle | null) => void;
    onOpenSyPad: (key: string) => void;
    onCloudUpload: (e: React.MouseEvent, key: string) => void;
    onSnip: (apply: (dataUrl: string) => void) => void;
    onFillFromPhoto: () => void;
    onTypingModeUsed: (mode: FieldMode) => void;
    photoBanner?: PhotoBanner | null;
    onUndoPhoto?: () => void;
    onDismissPhotoBanner?: () => void;
    drag?: {
        onDragStart: (e: React.DragEvent) => void;
        onDragOver: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => void;
        isDragging: boolean;
    };
}

export function QuestionCard({
    q, number, refKey, update, onRemove, canRemove, isInGroup, isEndOfGroup, registerRef, onOpenSyPad,
    onCloudUpload, onSnip, onFillFromPhoto, onTypingModeUsed, photoBanner, onUndoPhoto, onDismissPhotoBanner, drag,
}: QuestionCardProps) {
    const [showImagePicker, setShowImagePicker] = useState(false);
    const [optionPicker, setOptionPicker] = useState<string | null>(null);
    const typing = resolveTyping(q.typingMode, useSecondLanguage());

    const type = q.type || 'single';
    const optionKeys = Object.keys(q.options || {}).sort();
    const isEmpty = !q.question?.trim() && !q.image;
    const needsAnswer = !isEmpty && !hasAnswer(q);
    const label = `Question ${number}`;

    const set = <K extends keyof QuestionState>(field: K, value: QuestionState[K]) =>
        update(prev => ({ ...prev, [field]: value }));

    const changeType = (next: string) => update(prev => {
        const n = { ...prev };
        if (next === 'comprehension') {
            // "Passage" makes this question the first of a passage group
            n.type = 'single';
            n.correctAnswer = '';
            if (!n.groupId) n.groupId = Math.random().toString(36).slice(2, 11);
        } else {
            n.type = next as QuestionState['type'];
            if (next.startsWith('single')) n.correctAnswer = '';
            else if (next === 'multiple') n.correctAnswer = [];
            else if (next === 'numerical') n.correctAnswer = { min: 0, max: 0, exactMatch: false, exactAnswers: '' };
        }
        return n;
    });

    const setOption = (key: string, value: string) =>
        update(prev => ({ ...prev, options: { ...prev.options, [key]: value } }));

    const setOptionImage = (key: string, src: string | null) => update(prev => {
        const images = { ...(prev.optionImages || {}) };
        if (src) images[key] = src; else delete images[key];
        return { ...prev, optionImages: images };
    });

    const addOption = () => update(prev => {
        const keys = Object.keys(prev.options).sort();
        const next = keys.length ? String.fromCharCode(keys[keys.length - 1].charCodeAt(0) + 1) : 'A';
        return { ...prev, options: { ...prev.options, [next]: '' } };
    });

    const removeOption = (key: string) => update(prev => {
        const options = { ...prev.options };
        delete options[key];
        const images = prev.optionImages ? { ...prev.optionImages } : undefined;
        if (images) delete images[key];
        let correctAnswer = prev.correctAnswer;
        if (prev.type === 'multiple' && Array.isArray(correctAnswer)) correctAnswer = correctAnswer.filter((k: string) => k !== key);
        else if (correctAnswer === key) correctAnswer = '';
        return { ...prev, options, optionImages: images, correctAnswer };
    });

    const toggleAnswer = (key: string) => update(prev => {
        if (prev.type === 'multiple') {
            const current: string[] = Array.isArray(prev.correctAnswer) ? [...prev.correctAnswer] : [];
            const at = current.indexOf(key);
            if (at > -1) current.splice(at, 1); else current.push(key);
            return { ...prev, correctAnswer: current.sort() };
        }
        return { ...prev, correctAnswer: key };
    });

    const setNumerical = (patch: Record<string, unknown>) =>
        update(prev => ({ ...prev, correctAnswer: { min: 0, max: 0, exactAnswers: '', ...(prev.correctAnswer || {}), ...patch } }));

    const numeric = (q.correctAnswer && typeof q.correctAnswer === 'object' && !Array.isArray(q.correctAnswer)) ? q.correctAnswer : {};

    return (
        <article
            data-question-card={number === 1 ? 'true' : undefined}
            draggable={!!drag}
            onDragStart={drag ? e => {
                if (!(e.target as HTMLElement).closest('.drag-handle')) { e.preventDefault(); return; }
                drag.onDragStart(e);
            } : undefined}
            onDragOver={drag?.onDragOver}
            onDrop={drag ? e => { e.stopPropagation(); drag.onDrop(e); } : undefined}
            className={cn(
                'relative min-w-0 bg-white transition-[box-shadow,opacity]',
                isInGroup
                    ? cn('border-x border-t border-violet-200', isEndOfGroup && 'border-b-0')
                    : 'rounded-2xl ring-1 ring-slate-900/[0.07] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-18px_rgba(15,23,42,0.22)]',
                drag?.isDragging && 'opacity-60 ring-2 ring-dashed ring-sky-400',
            )}
        >
            {/* Header: which question, its type and marks · language and delete on the right */}
            <header className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 px-3 pt-2.5 sm:gap-x-2 sm:px-4">
                {drag && (
                    <span className="drag-handle -ml-1 flex h-7 w-5 cursor-grab items-center justify-center rounded-md text-slate-300 hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing" title="Drag to move">
                        <GripVertical className="h-4 w-4" />
                    </span>
                )}
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-slate-900">{label}</h3>
                {isInGroup && (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-violet-700">Passage</span>
                )}
                <Select value={type} onValueChange={changeType}>
                    <SelectTrigger
                        aria-label="Question type"
                        className="h-7 w-auto gap-1 rounded-full border-0 bg-slate-100 px-2.5 text-[12.5px] font-semibold text-slate-700 focus:ring-2 focus:ring-sky-500/40 focus:ring-offset-0"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="single">{QUESTION_TYPE_LABELS.single}</SelectItem>
                        <SelectItem value="multiple">{QUESTION_TYPE_LABELS.multiple}</SelectItem>
                        <SelectItem value="numerical">{QUESTION_TYPE_LABELS.numerical}</SelectItem>
                        {!isInGroup && <SelectItem value="comprehension">{QUESTION_TYPE_LABELS.comprehension}</SelectItem>}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                    <MarkField label="Marks" tone="plus" value={String(q.marks ?? '')} onChange={v => set('marks', sanitizeNumericalMark(v))} />
                    <MarkField label="Wrong" tone="minus" value={String(q.negativeMarks ?? '')} onChange={v => set('negativeMarks', sanitizeNumericalMark(v))} />
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <LanguageSwitch value={q.typingMode} onChange={m => { set('typingMode', m); onTypingModeUsed(m); }} />
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={!canRemove}
                        title={canRemove ? 'Delete this question' : 'A test needs at least one question'}
                        aria-label="Delete question"
                        className={cn(ICON_BTN, 'hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30')}
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </header>

            <div className="space-y-2 px-3 pb-3 pt-2 sm:px-4">
                {/* Filled-from-photo result */}
                {photoBanner && (
                    <div className={cn(
                        'flex items-start gap-3 rounded-xl px-3 py-2.5 text-[13.5px] leading-snug ring-1 ring-inset animate-in fade-in slide-in-from-top-1 duration-300',
                        photoBanner.answerSource === 'none' ? 'bg-amber-50 text-amber-900 ring-amber-600/20' : 'bg-emerald-50 text-emerald-900 ring-emerald-600/20',
                    )}>
                        {photoBanner.answerSource === 'none'
                            ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                            : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
                        <div className="min-w-0 flex-1 space-y-0.5">
                            <p className="font-semibold">Filled from your photo — please read it once.</p>
                            <p>
                                {photoBanner.answerSource === 'marked' && <>Answer <strong>{photoBanner.answerLabel}</strong> was marked in the photo, so it is ticked below.</>}
                                {photoBanner.answerSource === 'answer_key' && <>The photo says the answer is <strong>{photoBanner.answerLabel}</strong>, so it is ticked below.</>}
                                {photoBanner.answerSource === 'none' && <>No answer was marked in the photo. Tap the correct option below.</>}
                            </p>
                            {photoBanner.others > 0 && (
                                <p className="text-slate-600">
                                    The photo had {photoBanner.others} more question{photoBanner.others === 1 ? '' : 's'}. To add them all, use <strong>Import from PDF or photos</strong> at the top.
                                </p>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {onUndoPhoto && (
                                <button type="button" onClick={onUndoPhoto} className="inline-flex h-8 items-center gap-1 rounded-full bg-white/80 px-2.5 text-[13px] font-semibold text-slate-800 hover:bg-white">
                                    <Undo2 className="h-3.5 w-3.5" /> Undo
                                </button>
                            )}
                            {onDismissPhotoBanner && (
                                <button type="button" onClick={onDismissPhotoBanner} aria-label="Dismiss" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white/70">
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Question text, with its tools in a quiet strip along the bottom of the box */}
                <div className={FIELD}>
                    <IMEInput
                        as="textarea"
                        ref={(el: IMEInputHandle | null) => registerRef(refKey, el)}
                        typingMode={typing}
                        placeholder="Type your question here…"
                        value={q.question}
                        onChange={(val: string) => set('question', val)}
                        data-sypad-label={label}
                        livePreview
                        data-sypad-target={refKey}
                        aria-label={`${label} text`}
                        className={cn(BARE_TEXTAREA, 'min-h-[52px] px-3 pb-1 pt-2.5 text-[16px] leading-relaxed sm:px-3.5')}
                    />
                    <div className="flex flex-wrap items-center gap-0.5 px-1.5 pb-1.5">
                        <button
                            type="button"
                            onClick={onFillFromPhoto}
                            className={cn(STRIP_BTN, isEmpty
                                ? 'bg-sky-600 text-white shadow-[0_4px_12px_-6px_rgba(2,132,199,0.9)] hover:bg-sky-700'
                                : 'text-sky-700 hover:bg-sky-100/70')}
                            title="Photo of a printed or handwritten question — we type it for you"
                        >
                            <Camera className="h-3.5 w-3.5" /> Fill from photo
                        </button>
                        {!q.image && (
                            <button
                                type="button"
                                onClick={() => setShowImagePicker(v => !v)}
                                aria-pressed={showImagePicker}
                                className={cn(STRIP_BTN, showImagePicker ? 'bg-slate-900/[0.07] text-slate-800' : 'text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-800')}
                            >
                                <ImageIcon className="h-3.5 w-3.5" /> Picture
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => onOpenSyPad(refKey)}
                            className={cn(STRIP_BTN, 'sy-pad-trigger text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-800')}
                            title="Fractions, powers, chemical formulas, tables"
                        >
                            <Sigma className="h-3.5 w-3.5" /> Maths &amp; symbols
                        </button>
                    </div>
                </div>

                {/* Question picture */}
                {q.image ? (
                    <div className="group/img relative w-fit">
                        <img src={q.image} alt={`${label} picture`} className="max-h-48 w-auto rounded-xl bg-slate-50 object-contain p-1.5 ring-1 ring-slate-900/[0.07]" />
                        <button
                            type="button"
                            onClick={() => set('image', '')}
                            aria-label="Remove picture"
                            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-900/10 hover:bg-red-50 hover:text-red-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : showImagePicker && (
                    <ImagePicker
                        onSet={src => { set('image', src); setShowImagePicker(false); }}
                        onClose={() => setShowImagePicker(false)}
                        onSnip={() => onSnip(src => { set('image', src); setShowImagePicker(false); })}
                        onCloud={e => onCloudUpload(e, refKey)}
                    />
                )}

                {/* Answer */}
                {type === 'numerical' ? (
                    <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-900/[0.06]">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[12.5px] font-semibold text-slate-500">Correct answer</p>
                            <div role="radiogroup" className="flex w-fit rounded-full bg-slate-200/70 p-0.5 text-[12px] font-semibold">
                                {([[false, 'A range of values'], [true, 'Exact value(s)']] as const).map(([exact, text]) => (
                                    <button
                                        key={String(exact)}
                                        type="button"
                                        role="radio"
                                        aria-checked={!!numeric.exactMatch === exact}
                                        onClick={() => setNumerical({ exactMatch: exact })}
                                        className={cn('h-6 rounded-full px-3 transition-all', !!numeric.exactMatch === exact ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                                    >
                                        {text}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {numeric.exactMatch ? (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="e.g. 100, 150, 200"
                                    aria-label="Correct number(s)"
                                    value={numeric.exactAnswers || ''}
                                    onChange={e => setNumerical({ exactAnswers: e.target.value })}
                                    className="h-9 w-full max-w-xs rounded-lg bg-white px-3 font-mono text-[16px] font-bold text-slate-900 ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45 sm:text-[15px]"
                                />
                                <p className="text-[12px] text-slate-500">Separate with commas. Any of these is marked correct.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                                {(['min', 'max'] as const).map(end => (
                                    <label key={end} className="text-left">
                                        <span className="mb-0.5 block pl-0.5 text-[12px] text-slate-500">{end === 'min' ? 'Lowest correct' : 'Highest correct'}</span>
                                        <input
                                            type="number"
                                            step="any"
                                            value={numeric[end] ?? ''}
                                            onChange={e => {
                                                const v = parseFloat(e.target.value);
                                                setNumerical({ [end]: isNaN(v) ? 0 : v });
                                            }}
                                            className="h-9 w-28 rounded-lg bg-white px-3 text-center font-mono text-[16px] font-bold text-slate-900 ring-1 ring-slate-900/10 focus:outline-none focus:ring-2 focus:ring-sky-500/45 sm:text-[15px]"
                                        />
                                    </label>
                                ))}
                                <p className="pb-2 text-[12px] text-slate-500">For one exact answer, put the same number in both boxes.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <ul className="space-y-1.5">
                            {optionKeys.map(key => {
                                const selected = type === 'multiple'
                                    ? Array.isArray(q.correctAnswer) && q.correctAnswer.includes(key)
                                    : q.correctAnswer === key;
                                const optRef = `${refKey}-opt-${key}`;
                                return (
                                    <li
                                        key={key}
                                        className={cn(
                                            'group/option flex items-start gap-2 rounded-xl p-1 pr-1 ring-1 ring-inset transition-[background-color,box-shadow] sm:gap-2.5',
                                            selected ? 'bg-emerald-50/80 ring-emerald-500/45' : 'bg-white ring-slate-900/[0.09] hover:ring-slate-900/15',
                                            'focus-within:ring-2 focus-within:ring-sky-500/40',
                                        )}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleAnswer(key)}
                                            aria-pressed={selected}
                                            aria-label={selected ? `Option ${key} is correct` : `Mark option ${key} as correct`}
                                            title={selected ? 'Correct answer' : 'Mark as correct'}
                                            className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center text-[14px] font-bold transition-all motion-safe:active:scale-95',
                                                type === 'multiple' ? 'rounded-[10px]' : 'rounded-full',
                                                selected
                                                    ? 'bg-emerald-500 text-white shadow-[0_4px_10px_-4px_rgba(16,185,129,0.8)]'
                                                    : 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-900/[0.06] hover:bg-slate-200',
                                            )}
                                        >
                                            {selected ? <Check className="h-4 w-4" strokeWidth={3} /> : key}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                            <IMEInput
                                                ref={(el: IMEInputHandle | null) => registerRef(optRef, el)}
                                                as="textarea"
                                                typingMode={typing}
                                                placeholder={`Option ${key}`}
                                                value={q.options[key]}
                                                onChange={(val: string) => setOption(key, val)}
                                                data-sypad-label={`${label} · Option ${key}`}
                                                livePreview
                                                data-sypad-target={optRef}
                                                aria-label={`${label} option ${key}`}
                                                rows={1}
                                                className={cn(BARE_TEXTAREA, 'min-h-[32px] px-1 py-1 text-[16px] leading-normal sm:text-[15px]')}
                                            />
                                            {q.optionImages?.[key] ? (
                                                <div className="group/optimg relative mb-1 mt-1 w-fit">
                                                    <img src={q.optionImages[key]} alt={`Option ${key} picture`} className="h-20 w-auto rounded-lg bg-white object-contain ring-1 ring-slate-900/[0.07]" />
                                                    <button
                                                        type="button"
                                                        onClick={() => setOptionImage(key, null)}
                                                        aria-label="Remove picture"
                                                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-900/10 hover:bg-red-50 hover:text-red-600"
                                                    >
                                                        <X className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            ) : optionPicker === key && (
                                                <ImagePicker
                                                    compact
                                                    onSet={src => { setOptionImage(key, src); setOptionPicker(null); }}
                                                    onClose={() => setOptionPicker(null)}
                                                    onSnip={() => onSnip(src => { setOptionImage(key, src); setOptionPicker(null); })}
                                                    onCloud={e => onCloudUpload(e, optRef)}
                                                />
                                            )}
                                        </div>
                                        {selected && (
                                            <span className="mt-1.5 hidden shrink-0 text-[12px] font-semibold text-emerald-700 sm:inline">Correct</span>
                                        )}
                                        <div className="flex shrink-0 items-center opacity-100 transition-opacity sm:opacity-0 sm:group-hover/option:opacity-100 sm:group-focus-within/option:opacity-100">
                                            {!q.optionImages?.[key] && (
                                                <button type="button" onClick={() => setOptionPicker(p => (p === key ? null : key))} className={ICON_BTN} title="Add a picture to this option" aria-label={`Add picture to option ${key}`}>
                                                    <ImageIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button type="button" onClick={() => removeOption(key)} className={cn(ICON_BTN, 'hover:bg-red-50 hover:text-red-600')} title="Remove this option" aria-label={`Remove option ${key}`}>
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
                            <button
                                type="button"
                                onClick={addOption}
                                className={cn(TOOL_BTN, '-ml-1 px-2.5 text-sky-700 hover:bg-sky-50')}
                            >
                                <Plus className="h-4 w-4" /> Add option
                            </button>
                            {needsAnswer ? (
                                <p className="flex items-center gap-1 text-[12.5px] font-medium text-amber-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    {type === 'multiple' ? 'Tick every correct answer' : 'Tap the letter of the correct answer'}
                                </p>
                            ) : (
                                <p className="text-[12.5px] text-slate-400">
                                    {type === 'multiple' ? 'Tick every correct answer' : 'Tap a letter to mark it correct'}
                                </p>
                            )}
                        </div>
                        {type === 'multiple' && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-900/[0.06]">
                                <p className="text-[12.5px] font-semibold text-slate-500">Partial marks</p>
                                <div role="radiogroup" aria-label="Partial marks" className="flex w-fit rounded-full bg-slate-200/70 p-0.5 text-[12px] font-semibold">
                                    {([['proportional', 'Proportional'], ['per_option', 'JEE Advanced']] as const).map(([mode, text]) => {
                                        const on = (q.partialMarking ?? 'proportional') === mode;
                                        return (
                                            <button
                                                key={mode}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                onClick={() => set('partialMarking', mode)}
                                                className={cn('h-6 rounded-full px-3 transition-all', on ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
                                            >
                                                {text}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="w-full text-[12px] leading-snug text-slate-500">
                                    {q.partialMarking === 'per_option'
                                        ? '+1 for each correct option picked. Full marks only for all of them; any wrong option gets the Wrong mark.'
                                        : 'Marks × correct options picked ÷ all correct options. Any wrong option gets the Wrong mark.'}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}
