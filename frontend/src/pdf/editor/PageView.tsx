/**
 * One page in the editor: the rendered canvas plus interactive layers.
 *
 * Content edits (text changes, erasures) are baked into the canvas through a
 * real preview document, so the page on screen is what the download contains.
 * Added objects (new text, images, shapes, ink, highlights) live in HTML/SVG
 * layers above it, where they can be selected and moved.
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { isBaked, pageIndexOf, type PageSlot } from '../engine/edits';
import type { PdfSession } from '../session/session';
import { A4 } from '../session/session';
import { AnnotationMode, type PDFPageProxy } from '../session/pdfjs';
import { useEditor } from './EditorContext';
import { View, outputScale } from './geometry';
import TextBlocksLayer from './layers/TextBlocksLayer';
import ObjectsLayer from './layers/ObjectsLayer';
import ToolLayer from './layers/ToolLayer';
import SearchLayer from './layers/SearchLayer';

export const slotKey = (slot: PageSlot) => (slot.src >= 0 ? `p${slot.src}` : slot.key);

export function slotView(session: PdfSession, slot: PageSlot, scale: number): View {
    if (slot.src < 0) {
        const [w, h] = slot.size ?? A4;
        return new View({ x0: 0, y0: 0, x1: w, y1: h }, scale, slot.rotate);
    }
    const info = session.pages[slot.src];
    return new View(info.view, scale, (info.rotate + slot.rotate) % 360);
}

type RenderTaskLike = { promise: Promise<void>; cancel: () => void };

function PageViewInner({ slot, number }: { slot: PageSlot; number: number }) {
    const { session, state, scale, setReport, registerCanvas } = useEditor();
    const key = slotKey(slot);
    const view = useMemo(() => slotView(session, slot, scale), [session, slot, scale]);
    const hostRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(false);
    const [renderedKey, setRenderedKey] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const baked = useMemo(() => state.edits.filter((e) => e.page === key && isBaked(e)), [state.edits, key]);
    const bakedKey = useMemo(() => JSON.stringify(baked), [baked]);
    const renderKey = `${bakedKey}|${view.scale.toFixed(4)}|${view.rotation}`;

    // Render only pages near the viewport.
    useEffect(() => {
        const el = hostRef.current;
        if (!el) return;
        const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting)), { rootMargin: '900px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    useEffect(() => {
        if (!visible || renderKey === renderedKey) return;
        let cancelled = false;
        let task: RenderTaskLike | null = null;
        let dispose = () => {};
        const run = async () => {
            setBusy(true);
            try {
                let page: PDFPageProxy | null = null;
                if (pageIndexOf(key) >= 0) {
                    if (baked.length) {
                        const pv = await session.preview(key, state.edits);
                        if (pv) {
                            page = pv.page;
                            dispose = pv.dispose;
                            if (!cancelled) setReport(key, pv.report);
                        }
                    } else {
                        page = await session.originalPage(key);
                        if (!cancelled) setReport(key, null);
                    }
                }
                if (cancelled) return;
                const ratio = outputScale(view);
                const off = document.createElement('canvas');
                off.width = Math.max(1, Math.floor(view.width * ratio));
                off.height = Math.max(1, Math.floor(view.height * ratio));
                if (page) {
                    const vp = page.getViewport({ scale: view.scale, rotation: view.rotation });
                    task = page.render({
                        canvas: off,
                        viewport: vp,
                        transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : undefined,
                        annotationMode: AnnotationMode.ENABLE,
                    }) as unknown as RenderTaskLike;
                    await task.promise;
                } else {
                    const c = off.getContext('2d')!;
                    c.fillStyle = '#fff';
                    c.fillRect(0, 0, off.width, off.height);
                }
                if (cancelled) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                canvas.width = off.width;
                canvas.height = off.height;
                canvas.getContext('2d')!.drawImage(off, 0, 0);
                registerCanvas(key, { canvas, view, ratio });
                setRenderedKey(renderKey);
            } catch (err) {
                if (!cancelled && (err as { name?: string })?.name !== 'RenderingCancelledException') console.error('Page render failed', err);
            } finally {
                dispose();
                if (!cancelled) setBusy(false);
            }
        };
        // Coalesce bursts of edits (e.g. replace-all) into one render.
        const t = setTimeout(run, baked.length ? 60 : 0);
        return () => {
            cancelled = true;
            clearTimeout(t);
            task?.cancel();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, renderKey]);

    useEffect(() => () => registerCanvas(key, null), [key, registerCanvas]);

    const stale = renderedKey !== null && renderedKey !== renderKey;

    return (
        <div className="flex flex-col items-center gap-1.5" data-page-key={key} data-page-number={number}>
            <div
                ref={hostRef}
                className="relative bg-white shadow-[0_1px_3px_rgba(15,23,42,0.12),0_8px_24px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5"
                style={{ width: view.width, height: view.height }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label={`Page ${number}`} />
                {!renderedKey && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    </div>
                )}
                {visible && (
                    <>
                        <TextBlocksLayer pageKey={key} view={view} pending={stale || busy} />
                        <SearchLayer pageKey={key} view={view} />
                        <ObjectsLayer pageKey={key} view={view} />
                        <ToolLayer pageKey={key} view={view} />
                    </>
                )}
            </div>
            <span className="select-none text-[11px] font-medium text-slate-500">
                {number} / {state.slots.length}
            </span>
        </div>
    );
}

const PageView = memo(PageViewInner);
export default PageView;
