import React, { useEffect, useRef, useState } from 'react';
import { Plus, UserRound, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { TestSettings } from '@/lib/testsApi';
import {
    CANDIDATE_INPUTS_TITLE,
    CandidateInput,
    cleanInputs,
    inputFields,
    inputsOn,
    suggestLabel,
    switchInputs,
    withInputs,
} from '@/lib/candidateInputs';

interface Props {
    settings: TestSettings;
    onChange: (next: TestSettings, notice?: string) => void;
    /** No plan: fields stay visible but read-only, and any touch calls onLocked. */
    locked?: boolean;
    onLocked?: () => void;
}

const SAVE_AFTER_TYPING_MS = 700;

/**
 * The live-exam card's view of the test's candidate inputs (settings.start_form): what a
 * candidate fills in before starting. Same data as Settings → Candidate inputs, so an edit
 * in either place shows up in the other.
 */
export default function CandidateInputsLine({ settings, onChange, locked = false, onLocked }: Props) {
    const on = inputsOn(settings);
    const saved = inputFields(settings);
    const savedKey = JSON.stringify(saved);

    const [draft, setDraft] = useState<CandidateInput[]>(saved);
    const [focusIdx, setFocusIdx] = useState<number | null>(null);

    const rowRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const latest = useRef({ settings, savedKey, saved });
    latest.current = { settings, savedKey, saved };
    const pending = useRef<{ timer: number; fields: CandidateInput[] } | null>(null);

    // Follow edits made elsewhere (Settings panel, another save), but never yank text
    // out from under a teacher who is typing in this row.
    useEffect(() => {
        if (rowRef.current?.contains(document.activeElement)) return;
        setDraft(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedKey]);

    useEffect(() => {
        if (focusIdx === null) return;
        inputRefs.current[focusIdx]?.focus();
        setFocusIdx(null);
    }, [focusIdx]);

    const commit = (fields: CandidateInput[]) => {
        if (pending.current) {
            window.clearTimeout(pending.current.timer);
            pending.current = null;
        }
        const { settings: current, savedKey: currentKey, saved: currentSaved } = latest.current;
        // A half-cleared first field is a rename in progress, not a removal.
        const withFirst = fields.map((f, i) =>
            i === 0 && !f.label.trim() ? { ...f, label: currentSaved[0]?.label || 'Name' } : f,
        );
        const clean = cleanInputs(withFirst);
        if (clean.length === 0 || JSON.stringify(clean) === currentKey) return;
        onChange(withInputs(current, clean));
    };

    const commitSoon = (fields: CandidateInput[]) => {
        if (pending.current) window.clearTimeout(pending.current.timer);
        pending.current = {
            fields,
            timer: window.setTimeout(() => commit(fields), SAVE_AFTER_TYPING_MS),
        };
    };

    // Leaving the page mid-word still saves the word.
    useEffect(() => () => {
        if (pending.current) commit(pending.current.fields);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Only Name so far: offer a second, empty box that reads "Roll No" until filled in.
    const shown = draft.length > 1 ? draft : [...draft, { label: '', required: true }];
    const blankIdx = shown.findIndex((f, i) => i > 0 && !f.label.trim());

    const edit = (idx: number, patch: Partial<CandidateInput>, now = false) => {
        if (locked) return onLocked?.();
        const next = shown.map((f, i) => (i === idx ? { ...f, ...patch } : f));
        setDraft(next);
        if (now) commit(next);
        else commitSoon(next);
    };

    const remove = (idx: number) => {
        if (locked) return onLocked?.();
        const next = draft.filter((_, i) => i !== idx);
        setDraft(next);
        commit(next);
    };

    const add = () => {
        if (locked) return onLocked?.();
        if (blankIdx !== -1) return setFocusIdx(blankIdx);
        setDraft([...shown, { label: '', required: true }]);
        setFocusIdx(shown.length);
    };

    const toggle = (next: boolean) => {
        if (locked) return onLocked?.();
        const { settings: updated, notice } = switchInputs(latest.current.settings, next);
        onChange(updated, notice);
    };

    // Focus left the row: drop empty extra boxes and put a cleared Name back.
    const onRowBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        if (rowRef.current?.contains(e.relatedTarget as Node | null)) return;
        const tidy = draft
            .filter((f, i) => i === 0 || f.label.trim())
            .map((f, i) => (i === 0 && !f.label.trim() ? { ...f, label: saved[0]?.label || 'Name' } : f));
        setDraft(tidy);
        commit(tidy);
    };

    let blanksSoFar = 0;

    return (
        <>
            <div className="mb-1.5 mt-3 flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-slate-500">
                    {CANDIDATE_INPUTS_TITLE}<span className="hidden sm:inline"> — what candidates fill in before starting</span>
                </p>
                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
                    <span>{on ? 'On' : 'Off'}</span>
                    <Switch
                        checked={on}
                        onCheckedChange={toggle}
                        aria-label={`${CANDIDATE_INPUTS_TITLE} ${on ? 'on' : 'off'}`}
                        className="h-5 w-9 data-[state=checked]:bg-sky-600 [&>span]:h-4 [&>span]:w-4 [&>span[data-state=checked]]:translate-x-4"
                    />
                </label>
            </div>

            {on ? (
                <div
                    ref={rowRef}
                    onBlur={onRowBlur}
                    className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1.5 pl-3"
                >
                    <UserRound className="mr-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                    {shown.map((field, idx) => {
                        const blank = !field.label.trim();
                        const placeholder = idx === 0 ? 'Name' : suggestLabel(shown, blank ? blanksSoFar++ : 0);
                        const isGhost = idx === 1 && draft.length <= 1;
                        const width = Math.min(Math.max(blank ? placeholder.length : field.label.length, 3), 22) + 1;
                        return (
                            <div
                                key={idx}
                                className={`group flex h-8 items-center rounded-lg pl-2.5 pr-1 transition-shadow focus-within:ring-2 focus-within:ring-sky-500/40 ${
                                    blank && idx > 0
                                        ? 'border border-dashed border-slate-300 bg-white/60'
                                        : 'bg-white shadow-sm ring-1 ring-slate-900/5'
                                }`}
                            >
                                <input
                                    ref={el => { inputRefs.current[idx] = el; }}
                                    value={field.label}
                                    readOnly={locked}
                                    onFocus={locked ? onLocked : undefined}
                                    onChange={e => edit(idx, { label: e.target.value })}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            add();
                                        }
                                    }}
                                    placeholder={placeholder}
                                    aria-label={idx === 0 ? 'First input (default)' : `Input ${idx + 1}`}
                                    style={{ width: `${width}ch` }}
                                    className="min-w-0 bg-transparent text-[13px] font-medium text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => edit(idx, { required: !field.required }, !blank)}
                                    aria-pressed={field.required}
                                    aria-label={`${field.label || placeholder} ${field.required ? 'required' : 'optional'}`}
                                    title={field.required ? 'Required — click to make optional' : 'Optional — click to make required'}
                                    className={`flex h-6 w-5 items-center justify-center rounded text-[17px] font-bold leading-none transition-colors cursor-pointer ${
                                        field.required ? 'text-red-500 hover:text-red-600' : 'text-slate-300 hover:text-slate-500'
                                    }`}
                                >
                                    *
                                </button>
                                {idx > 0 && !isGhost && (
                                    <button
                                        type="button"
                                        onClick={() => remove(idx)}
                                        aria-label={`Remove ${field.label || 'input'}`}
                                        title="Remove"
                                        className="flex h-6 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:text-red-500 cursor-pointer"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        );
                    })}
                    <button
                        type="button"
                        onClick={add}
                        aria-label="Add another input"
                        title="Add another input"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5 transition-colors hover:bg-sky-50 hover:text-sky-700 cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    <span className="ml-auto hidden pr-2 text-[11px] text-slate-400 sm:inline">
                        <span className="font-bold text-red-500">*</span> = required, tap to change
                    </span>
                </div>
            ) : (
                <div className="flex h-11 items-center gap-2 rounded-xl bg-slate-100 px-3 text-[13px] text-slate-500">
                    <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Off — candidates start without entering their name.</span>
                </div>
            )}
        </>
    );
}
