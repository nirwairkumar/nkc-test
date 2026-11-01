/**
 * Controls for the selected text block: edit it, shift it left/right/up/down,
 * or put it back where it was. The bar floats at the bottom of the document
 * view rather than beside the text, so it never hides the rows the text is
 * being lined up with (and moves to the top when the text itself is down there).
 */
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Move, PenLine, RotateCcw } from 'lucide-react';
import type { TextEdit } from '../engine/edits';
import { useEditor } from './EditorContext';
import { Divider, IconButton } from './FormatBar';
import { canMove, isRetyped, nudgeAction, offsetAction } from './move';
import { slotKey, slotView } from './PageView';
import { textEditId } from './store';

/** Height of the view's bottom band the bar sits in. */
const BAND = 96;

export default function SelectionBar() {
    const { session, state, dispatch, editing, setEditing } = useEditor();
    const wrapRef = useRef<HTMLDivElement>(null);
    const [atTop, setAtTop] = useState(false);

    const sel = state.selection?.kind === 'block' && !editing && state.tool === 'edit' ? state.selection : null;
    const block = sel ? session.analyze(sel.page)?.text.blocks.find((b) => b.id === sel.blockId) : undefined;
    const slot = sel ? state.slots.find((s) => slotKey(s) === sel.page) : undefined;
    const edit = sel && block ? state.edits.find((e): e is TextEdit => e.kind === 'text' && e.id === textEditId(sel.page, block.id)) : undefined;
    const shown = !!(sel && block && slot && canMove(block) && !isRetyped(state.edits, sel.page, block.id) && edit?.text !== '');

    // Keep out of the selected text's way: if it is in the bottom band, use the top.
    useEffect(() => {
        if (!shown) return;
        let raf = 0;
        const check = () => {
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                const host = wrapRef.current?.parentElement?.getBoundingClientRect();
                const frame = document.querySelector('[data-selected-frame]')?.getBoundingClientRect();
                if (host && frame) setAtTop(frame.bottom > host.bottom - BAND && frame.top > host.top + BAND);
            });
        };
        check();
        document.addEventListener('scroll', check, true);
        window.addEventListener('resize', check);
        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('scroll', check, true);
            window.removeEventListener('resize', check);
        };
    }, [shown, sel?.blockId, state.edits, state.zoom]);

    if (!shown || !sel || !block || !slot) return null;
    const moved = !!(edit?.dx || edit?.dy);
    const text = edit?.text ?? block.text;

    const nudge = (e: MouseEvent, sx: number, sy: number) => {
        const step = e.shiftKey ? 10 : 1;
        const action = nudgeAction(session, state.edits, sel, slotView(session, slot, 1), sx * step, sy * step);
        if (action) dispatch(action);
    };

    return (
        <div ref={wrapRef} data-keep-selection className={`pointer-events-none absolute inset-x-0 z-40 flex justify-center px-3 ${atTop ? 'top-3' : 'bottom-12 md:bottom-4'}`}>
            <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.45)]">
                <span className="hidden max-w-[180px] shrink-0 items-center gap-1.5 truncate px-2 text-[12px] text-slate-500 sm:flex" title={text}>
                    <Move className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">“{text}”</span>
                </span>
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setEditing({ page: sel.page, blockId: block.id })}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-100"
                >
                    <PenLine className="h-3.5 w-3.5" /> Edit text
                </button>
                <Divider />
                <IconButton label="Move left (Shift: 10 pt)" onClick={(e) => nudge(e, -1, 0)}>
                    <ArrowLeft className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move up (Shift: 10 pt)" onClick={(e) => nudge(e, 0, -1)}>
                    <ArrowUp className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move down (Shift: 10 pt)" onClick={(e) => nudge(e, 0, 1)}>
                    <ArrowDown className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move right (Shift: 10 pt)" onClick={(e) => nudge(e, 1, 0)}>
                    <ArrowRight className="h-4 w-4" />
                </IconButton>
                {moved && (
                    <>
                        <Divider />
                        <IconButton
                            label="Back to original position"
                            onClick={() => {
                                const action = offsetAction(sel.page, block, edit, 0, 0);
                                if (action) dispatch(action);
                            }}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </IconButton>
                    </>
                )}
                <span className="hidden shrink-0 whitespace-nowrap px-2 text-[11px] text-slate-500 lg:inline">Drag it to move · arrow keys nudge (Shift: 10 pt)</span>
            </div>
        </div>
    );
}
