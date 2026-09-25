/**
 * Pointer handling for guided moves and resizes. A press becomes a drag after
 * a few pixels of travel (so a click still clicks); from then on every move is
 * snapped to the alignment guides. Shift keeps a move straight, Alt turns
 * snapping off, Esc cancels.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { snapMove, type Guide, type Snapped, type SnapSpec } from './guides';

export interface DragOptions {
    /** Travel (screen px) before a press turns into a drag; 0 starts at once. */
    threshold?: number;
    /** For a move: what snaps to what, built when the drag starts. */
    snap?: () => SnapSpec;
    /** Or a rule of its own turning the pointer's travel into the result (resizing). */
    resolve?: (dx: number, dy: number, mods: { lock: boolean; free: boolean }) => Snapped;
    /** Cursor while dragging. */
    cursor?: string;
    onStart?: () => void;
    onMove?: (dx: number, dy: number) => void;
    onEnd: (dx: number, dy: number) => void;
    onCancel?: () => void;
}

export interface DragState {
    id: string;
    dx: number;
    dy: number;
    guides: Guide[];
}

export function useGuidedDrag() {
    const [state, setState] = useState<DragState | null>(null);
    /** The last press became a drag: its trailing click must not act. */
    const dragged = useRef(false);
    const stop = useRef<(() => void) | null>(null);

    useEffect(() => () => stop.current?.(), []);

    const begin = useCallback((e: RPointerEvent, id: string, opts: DragOptions) => {
        if (e.button !== 0) return;
        stop.current?.();
        dragged.current = false;
        const el = e.currentTarget as Element;
        const pointerId = e.pointerId;
        const x0 = e.clientX, y0 = e.clientY;
        const threshold = opts.threshold ?? 4;
        let started = false;
        let spec: SnapSpec | null = null;
        let last = { x: x0, y: y0, dx: 0, dy: 0 };
        // Drags that start on press (handles) stay put until the pointer really travels,
        // so a click with a pixel of jitter can't snap the element somewhere else.
        let travelled = threshold > 0;
        const body = document.body.style;
        const saved = { userSelect: body.userSelect, cursor: body.cursor };

        const update = (cx: number, cy: number, shift: boolean, alt: boolean) => {
            if (!started) return;
            if (!travelled) {
                if (Math.hypot(cx - x0, cy - y0) < 3) return;
                travelled = true;
            }
            const mods = { lock: shift, free: alt };
            const s = opts.resolve ? opts.resolve(cx - x0, cy - y0, mods) : spec ? snapMove(spec, cx - x0, cy - y0, mods) : { dx: cx - x0, dy: cy - y0, guides: [] };
            last = { x: cx, y: cy, dx: s.dx, dy: s.dy };
            setState({ id, dx: s.dx, dy: s.dy, guides: s.guides });
            opts.onMove?.(s.dx, s.dy);
        };
        const start = () => {
            started = true;
            dragged.current = true;
            spec = opts.snap?.() ?? null;
            try {
                el.setPointerCapture(pointerId);
            } catch {
                /* element may be gone; window listeners still see the pointer */
            }
            body.userSelect = 'none';
            body.cursor = opts.cursor ?? 'move';
            opts.onStart?.();
            setState({ id, dx: 0, dy: 0, guides: [] });
        };
        const move = (ev: PointerEvent) => {
            if (ev.pointerId !== pointerId) return;
            if (!started) {
                if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < threshold) return;
                start();
            }
            update(ev.clientX, ev.clientY, ev.shiftKey, ev.altKey);
        };
        const finish = (commit: boolean) => {
            stop.current?.();
            if (!started) return;
            if (commit) opts.onEnd(last.dx, last.dy);
            else opts.onCancel?.();
            // The trailing click (if any) arrives in this same task; don't let the flag outlive it.
            setTimeout(() => (dragged.current = false), 0);
        };
        const up = (ev: PointerEvent) => ev.pointerId === pointerId && finish(true);
        const cancel = (ev: PointerEvent) => ev.pointerId === pointerId && finish(false);
        const key = (ev: KeyboardEvent) => {
            if (!started) return;
            if (ev.key === 'Escape') {
                ev.preventDefault();
                ev.stopPropagation();
                finish(false);
            } else if (ev.key === 'Shift' || ev.key === 'Alt') {
                // Pressing or releasing a modifier changes the result without the pointer moving
                // (and Alt must not open the browser menu).
                ev.preventDefault();
                update(last.x, last.y, ev.shiftKey, ev.altKey);
            }
        };

        stop.current = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('keydown', key, true);
            window.removeEventListener('keyup', key, true);
            body.userSelect = saved.userSelect;
            body.cursor = saved.cursor;
            stop.current = null;
            setState(null);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('keydown', key, true);
        window.addEventListener('keyup', key, true);
        if (threshold <= 0) start();
    }, []);

    /** True (once) when the click that follows a press should be ignored because the press was a drag. */
    const consumeClick = useCallback(() => {
        const d = dragged.current;
        dragged.current = false;
        return d;
    }, []);

    return { state, begin, consumeClick };
}
