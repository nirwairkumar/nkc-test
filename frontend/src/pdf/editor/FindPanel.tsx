/**
 * Find & replace across the whole document. Replacements become ordinary text
 * edits, so they keep the PDF's own font like any other edit.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CaseSensitive, Replace, WholeWord, X } from 'lucide-react';
import { toast } from 'sonner';
import type { TextEdit } from '../engine/edits';
import { blockTextRects } from '../engine/layout';
import { useEditor, type SearchMatch } from './EditorContext';
import { slotKey } from './PageView';
import { textEditId } from './store';

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function FindPanel({ onClose }: { onClose: () => void }) {
    const { session, state, dispatch, reports, search, setSearch } = useEditor();
    const [query, setQuery] = useState(search.query);
    const [replace, setReplace] = useState('');
    const [matchCase, setMatchCase] = useState(false);
    const [whole, setWhole] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => inputRef.current?.focus(), []);

    const pageKeys = useMemo(() => state.slots.filter((s) => s.src >= 0).map(slotKey), [state.slots]);

    const currentText = (page: string, blockId: string, original: string) => {
        const e = state.edits.find((x) => x.id === textEditId(page, blockId)) as TextEdit | undefined;
        return e ? e.text : original;
    };

    const re = useMemo(() => {
        if (!query) return null;
        const body = escapeRe(query);
        return new RegExp(whole ? `(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])` : body, matchCase ? 'gu' : 'giu');
    }, [query, matchCase, whole]);

    // Recompute matches whenever the query or the document changes.
    useEffect(() => {
        if (!re) {
            setSearch({ query: '', matches: [], active: 0 });
            return;
        }
        const t = setTimeout(() => {
            const matches: SearchMatch[] = [];
            for (const page of pageKeys) {
                const blocks = session.analyze(page)?.text.blocks ?? [];
                for (const b of blocks) {
                    const text = currentText(page, b.id, b.text);
                    const edited = text !== b.text;
                    for (const m of text.matchAll(re)) {
                        const start = m.index ?? 0;
                        const end = start + m[0].length;
                        const plan = reports.get(page)?.plans.get(textEditId(page, b.id));
                        const rects = edited ? [plan?.bbox ?? b.bbox] : blockTextRects(b, Array.from(text.slice(0, start)).length, Array.from(text.slice(0, end)).length);
                        matches.push({ page, blockId: b.id, start, end, rects });
                    }
                }
            }
            setSearch({ query, matches, active: 0 });
        }, 120);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [re, state.edits, pageKeys]);

    useEffect(() => () => setSearch({ query: '', matches: [], active: 0 }), [setSearch]);

    const go = (i: number) => {
        const n = search.matches.length;
        if (!n) return;
        const active = ((i % n) + n) % n;
        setSearch({ ...search, active });
        const m = search.matches[active];
        document.querySelector(`[data-page-key="${m.page}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    const applyReplacements = (targets: SearchMatch[]) => {
        // Block ids contain '|', so group by the edit id rather than a joined string.
        const byBlock = new Map<string, SearchMatch[]>();
        for (const m of targets) {
            const k = textEditId(m.page, m.blockId);
            byBlock.set(k, [...(byBlock.get(k) ?? []), m]);
        }
        const edits: TextEdit[] = [];
        let skipped = 0;
        let applied = 0;
        for (const ms of byBlock.values()) {
            const { page, blockId } = ms[0];
            const block = session.analyze(page)?.text.blocks.find((b) => b.id === blockId);
            if (!block || !block.editable) {
                skipped += ms.length;
                continue;
            }
            applied += ms.length;
            const id = textEditId(page, blockId);
            const existing = state.edits.find((e) => e.id === id) as TextEdit | undefined;
            let text = existing ? existing.text : block.text;
            for (const m of [...ms].sort((a, b) => b.start - a.start)) text = text.slice(0, m.start) + replace + text.slice(m.end);
            edits.push({ ...(existing ?? { kind: 'text', id, page, blockId }), text } as TextEdit);
        }
        if (edits.length) dispatch({ type: 'upsertMany', edits });
        return { count: applied, skipped };
    };

    const total = search.matches.length;

    return (
        <div
            className="w-[min(380px,calc(100vw-24px))] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)]"
            onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
            }}
        >
            <div className="flex items-center gap-1.5">
                <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') go(search.active + (e.shiftKey ? -1 : 1));
                    }}
                    placeholder="Find in document"
                    aria-label="Find"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button type="button" aria-label="Match case" title="Match case" aria-pressed={matchCase} onClick={() => setMatchCase(!matchCase)} className={`flex h-9 w-9 items-center justify-center rounded-lg ${matchCase ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <CaseSensitive className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Whole word" title="Whole word" aria-pressed={whole} onClick={() => setWhole(!whole)} className={`flex h-9 w-9 items-center justify-center rounded-lg ${whole ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'}`}>
                    <WholeWord className="h-4 w-4" />
                </button>
                <button type="button" aria-label="Close find" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="mt-2 flex items-center gap-1.5">
                <input
                    value={replace}
                    onChange={(e) => setReplace(e.target.value)}
                    placeholder="Replace with"
                    aria-label="Replace with"
                    className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                    type="button"
                    disabled={!total}
                    onClick={() => {
                        const m = search.matches[search.active];
                        if (m) applyReplacements([m]);
                    }}
                    className="h-9 rounded-lg px-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                >
                    Replace
                </button>
                <button
                    type="button"
                    disabled={!total}
                    onClick={() => {
                        const { count, skipped } = applyReplacements(search.matches);
                        toast.success(`Replaced ${count} ${count === 1 ? 'match' : 'matches'}${skipped ? ` · ${skipped} in text that can't be edited` : ''}`);
                    }}
                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-[13px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                    <Replace className="h-3.5 w-3.5" /> All
                </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>{query ? (total ? `${search.active + 1} of ${total}` : 'No matches') : 'Search all pages'}</span>
                <div className="flex gap-1">
                    <button type="button" aria-label="Previous match" disabled={!total} onClick={() => go(search.active - 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40">
                        <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Next match" disabled={!total} onClick={() => go(search.active + 1)} className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-slate-100 disabled:opacity-40">
                        <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
