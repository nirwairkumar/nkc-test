/**
 * Page thumbnails with page management: drag to reorder, rotate, duplicate,
 * delete and insert blank pages. All of it is part of undo/redo.
 */
import { memo, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, FilePlus2, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import type { PageSlot } from '../engine/edits';
import { A4 } from '../session/session';
import { useEditor } from './EditorContext';
import { slotKey, slotView } from './PageView';
import { newId } from './store';

const THUMB_W = 116;

const Thumb = memo(function Thumb({ slot }: { slot: PageSlot }) {
    const { session } = useEditor();
    const ref = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(false);
    const base = slotView(session, slot, 1);
    const scale = THUMB_W / base.width;
    const view = slotView(session, slot, scale);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const io = new IntersectionObserver((es) => setVisible(es.some((e) => e.isIntersecting)), { rootMargin: '300px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        let cancelled = false;
        let task: { promise: Promise<void>; cancel: () => void } | null = null;
        (async () => {
            const c = ref.current;
            if (!c) return;
            const ratio = Math.min(2, window.devicePixelRatio || 1);
            c.width = Math.floor(view.width * ratio);
            c.height = Math.floor(view.height * ratio);
            const ctx = c.getContext('2d')!;
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, c.width, c.height);
            const page = await session.originalPage(slotKey(slot));
            if (!page || cancelled) return;
            task = page.render({ canvas: c, viewport: page.getViewport({ scale: view.scale, rotation: view.rotation }), transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined }) as unknown as typeof task;
            await task!.promise.catch(() => undefined);
        })();
        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [visible, session, slot, view.scale, view.rotation, view.width, view.height]);

    return <canvas ref={ref} className="block bg-white" style={{ width: view.width, height: view.height }} />;
});

export default function PagesPanel({ current, onJump }: { current: number; onJump: (i: number) => void }) {
    const { session, state, dispatch } = useEditor();
    const slots = state.slots;
    const [dragFrom, setDragFrom] = useState<number | null>(null);
    const [dropAt, setDropAt] = useState<number | null>(null);
    const editedPages = new Set(state.edits.map((e) => e.page));

    const set = (next: PageSlot[]) => dispatch({ type: 'slots', slots: next });
    const move = (from: number, to: number) => {
        if (to < 0 || to >= slots.length || from === to) return;
        const next = [...slots];
        const [s] = next.splice(from, 1);
        next.splice(to, 0, s);
        set(next);
    };
    const rotate = (i: number, by: number) => set(slots.map((s, k) => (k === i ? { ...s, rotate: (((s.rotate + by) % 360) + 360) % 360 } : s)));
    const remove = (i: number) => {
        if (slots.length <= 1) return;
        set(slots.filter((_, k) => k !== i));
    };
    const duplicate = (i: number) => {
        const next = [...slots];
        next.splice(i + 1, 0, { ...slots[i], key: newId('d') });
        set(next);
    };
    const insertBlank = (i: number) => {
        // Match the neighbouring page's size so the document stays uniform.
        const ref = slots[i];
        const v = ref && ref.src >= 0 ? session.pages[ref.src].view : null;
        const size: [number, number] = v ? [v.x1 - v.x0, v.y1 - v.y0] : (ref?.size ?? A4);
        const next = [...slots];
        next.splice(i + 1, 0, { src: -1, rotate: 0, size, key: newId('b') });
        set(next);
    };

    return (
        <nav aria-label="Pages" className="flex flex-col gap-3 px-3 py-4">
            {slots.map((s, i) => (
                <div
                    key={s.key}
                    draggable
                    onDragStart={(e) => {
                        setDragFrom(i);
                        e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                        if (dragFrom === null) return;
                        e.preventDefault();
                        const r = e.currentTarget.getBoundingClientRect();
                        setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        if (dragFrom !== null && dropAt !== null) move(dragFrom, dropAt > dragFrom ? dropAt - 1 : dropAt);
                        setDragFrom(null);
                        setDropAt(null);
                    }}
                    onDragEnd={() => {
                        setDragFrom(null);
                        setDropAt(null);
                    }}
                    className={`group relative flex flex-col items-center ${dragFrom === i ? 'opacity-40' : ''}`}
                >
                    {dropAt === i && <div className="absolute -top-2 left-0 right-0 h-0.5 rounded bg-emerald-500" />}
                    <button
                        type="button"
                        onClick={() => onJump(i)}
                        aria-label={`Go to page ${i + 1}`}
                        className={`overflow-hidden rounded-md shadow-sm ring-offset-2 transition ${current === i ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-200 hover:ring-slate-400'}`}
                    >
                        <Thumb slot={s} />
                    </button>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-500">
                        {i + 1}
                        {(editedPages.has(slotKey(s)) || s.rotate !== 0) && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Edited" />}
                        {s.src < 0 && <span className="text-slate-400">· blank</span>}
                    </div>
                    <div className="absolute right-1 top-1 hidden flex-col gap-0.5 rounded-lg bg-white/95 p-0.5 shadow ring-1 ring-slate-200 group-focus-within:flex group-hover:flex">
                        {[
                            { label: 'Rotate left', icon: RotateCcw, fn: () => rotate(i, -90) },
                            { label: 'Rotate right', icon: RotateCw, fn: () => rotate(i, 90) },
                            { label: 'Move up', icon: ArrowUp, fn: () => move(i, i - 1) },
                            { label: 'Move down', icon: ArrowDown, fn: () => move(i, i + 1) },
                            { label: 'Duplicate page', icon: Copy, fn: () => duplicate(i) },
                            { label: 'Insert blank page after', icon: FilePlus2, fn: () => insertBlank(i) },
                            { label: 'Delete page', icon: Trash2, fn: () => remove(i) },
                        ].map(({ label, icon: Icon, fn }) => (
                            <button key={label} type="button" title={label} aria-label={`${label} (page ${i + 1})`} onClick={fn} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                                <Icon className="h-3.5 w-3.5" />
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            {dropAt === slots.length && <div className="h-0.5 rounded bg-emerald-500" />}
            <button
                type="button"
                onClick={() => insertBlank(slots.length - 1)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-xs font-medium text-slate-600 hover:border-emerald-500 hover:text-emerald-700"
            >
                <FilePlus2 className="h-3.5 w-3.5" /> Blank page
            </button>
        </nav>
    );
}
