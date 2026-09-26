/**
 * The editor workspace: top bar, tools, page thumbnails and the page canvas.
 * Downloads are one click — no export dialog, no sign-up, no watermark.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, X } from 'lucide-react';
import { testozaUrl } from '../brand';
import { analytics } from '@/lib/analytics/tracker';
import type { PageEdit, PageSlot, StoredImage } from '../engine/edits';
import type { PdfSession } from '../session/session';
import { EditorProvider, useEditor } from './EditorContext';
import FindPanel from './FindPanel';
import { CSS_UNITS } from './geometry';
import { imageFromFile } from './images';
import { nudgeAction } from './move';
import PagesPanel from './PagesPanel';
import PageView, { slotKey, slotView } from './PageView';
import { saveSession } from './persist';
import SelectionBar from './SelectionBar';
import SignatureDialog from './SignatureDialog';
import { newId, useEditorReducer, type Tool } from './store';
import ToolBar from './ToolBar';
import TopBar from './TopBar';

export interface WorkspaceProps {
    session: PdfSession;
    initial?: { edits: PageEdit[]; slots: PageSlot[] };
}

export default function Workspace({ session, initial }: WorkspaceProps) {
    const [state, dispatch] = useEditorReducer();
    const scrollRef = useRef<HTMLElement>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        dispatch({ type: 'init', slots: initial?.slots ?? session.pages.map((p) => ({ src: p.index, rotate: 0, key: p.key })), edits: initial?.edits });
    }, [session, initial, dispatch]);

    // The workspace covers the screen: keep the page behind it (and its footer) from scrolling.
    useEffect(() => {
        const { overflow, overscrollBehavior } = document.body.style;
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';
        return () => {
            document.body.style.overflow = overflow;
            document.body.style.overscrollBehavior = overscrollBehavior;
        };
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setWidth(el.clientWidth));
        ro.observe(el);
        setWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);

    const maxPageWidth = useMemo(() => Math.max(1, ...state.slots.map((s) => slotView(session, s, 1).width)), [state.slots, session]);
    const pad = width < 640 ? 16 : 48;
    const fitZoom = Math.min(2.5, Math.max(0.25, (width - pad) / (maxPageWidth * CSS_UNITS)));
    const zoom = state.fitWidth ? fitZoom : state.zoom;
    const scale = zoom * CSS_UNITS;

    return (
        <EditorProvider session={session} state={state} dispatch={dispatch} scale={width ? scale : 1}>
            <WorkspaceInner zoom={zoom} scrollRef={scrollRef} />
        </EditorProvider>
    );
}

function WorkspaceInner({ zoom, scrollRef }: { zoom: number; scrollRef: React.RefObject<HTMLElement> }) {
    const { session, state, dispatch, setEditingObject } = useEditor();
    const [fileName, setFileName] = useState(session.name);
    const [exporting, setExporting] = useState(false);
    const [findOpen, setFindOpen] = useState(false);
    const [signOpen, setSignOpen] = useState(false);
    const [panelOpen, setPanelOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
    const [current, setCurrent] = useState(0);
    const [notice, setNotice] = useState(session.restricted);
    const imageInput = useRef<HTMLInputElement>(null);
    const stateRef = useRef(state);
    stateRef.current = state;

    // ---- Track the page nearest the middle of the viewport
    const onScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const mid = el.getBoundingClientRect().top + el.clientHeight / 2;
        let best = 0, bestD = Infinity;
        el.querySelectorAll<HTMLElement>('[data-page-number]').forEach((p, i) => {
            const r = p.getBoundingClientRect();
            const d = Math.abs((r.top + r.bottom) / 2 - mid);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        });
        setCurrent(best);
    }, [scrollRef]);

    const jumpTo = (i: number) => {
        scrollRef.current?.querySelectorAll<HTMLElement>('[data-page-number]')[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // ---- Ctrl + wheel zoom
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (!e.ctrlKey && !e.metaKey) return;
            e.preventDefault();
            dispatch({ type: 'zoom', zoom: zoom * Math.exp(-e.deltaY * 0.0022) });
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, [scrollRef, zoom, dispatch]);

    // ---- Download
    const download = useCallback(async () => {
        if (exporting) return;
        // Let an open text editor commit first (it commits on pointerdown outside).
        await new Promise((r) => setTimeout(r, 30));
        const s = stateRef.current;
        setExporting(true);
        const t = toast.loading('Preparing your PDF…');
        try {
            const bytes = await session.export(s.slots, s.edits);
            const name = (fileName.trim() || 'document').replace(/\.pdf$/i, '') + '.pdf';
            const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
            dispatch({ type: 'saved' });
            analytics.track('pdf_export', {
                tool: window.location.pathname.includes('hindi') ? 'edit-hindi-pdf' : 'edit-pdf',
                pages: s.slots.length,
            });
            toast.success('Your PDF is downloaded', {
                id: t,
                description: 'No watermark, no sign-up. Teaching from this PDF? Turn it into an online test in one click.',
                action: { label: 'Make a test', onClick: () => window.open(testozaUrl('/pdf-to-quiz'), '_blank') },
                duration: 9000,
            });
        } catch (err) {
            console.error(err);
            toast.error('Could not create the PDF', { id: t, description: (err as Error)?.message ?? 'Unknown error' });
        } finally {
            setExporting(false);
        }
    }, [exporting, session, fileName, dispatch]);

    // ---- Place an image/signature centred on the current page
    const placeImage = useCallback(
        (img: StoredImage, opts: { maxFrac: number; ptPerPx: number }) => {
            const slot = stateRef.current.slots[current] ?? stateRef.current.slots[0];
            if (!slot) return;
            const key = slotKey(slot);
            const v = slotView(session, slot, 1);
            const box = v.box;
            const pw = box.x1 - box.x0, ph = box.y1 - box.y0;
            let w = Math.min(img.width * opts.ptPerPx, pw * opts.maxFrac);
            let h = (w * img.height) / img.width;
            if (h > ph * 0.8) {
                h = ph * 0.8;
                w = (h * img.width) / img.height;
            }
            const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
            const id = newId('im');
            const imageId = session.addImage(img);
            dispatch({ type: 'upsert', edit: { kind: 'image', id, page: key, rect: { x0: cx - w / 2, y0: cy - h / 2, x1: cx + w / 2, y1: cy + h / 2 }, imageId } });
            dispatch({ type: 'tool', tool: 'edit' });
            dispatch({ type: 'select', selection: { kind: 'object', id } });
        },
        [current, session, dispatch],
    );

    // ---- Keyboard shortcuts
    useEffect(() => {
        const toolKeys: Record<string, Tool> = { v: 'edit', t: 'text', e: 'erase', w: 'whiteout', h: 'highlight', d: 'draw' };
        const arrows: Record<string, [number, number]> = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
        /** Nudges the selected text block or object; false when nothing is selected. */
        const nudge = (dir: [number, number], step: number) => {
            const s = stateRef.current;
            const sel = s.selection;
            if (!sel) return false;
            const page = sel.kind === 'block' ? sel.page : s.edits.find((x) => x.id === sel.id)?.page;
            const slot = s.slots.find((x) => slotKey(x) === page);
            if (!slot) return false;
            const action = nudgeAction(session, s.edits, sel, slotView(session, slot, 1), dir[0] * step, dir[1] * step);
            if (action) dispatch(action);
            return true;
        };
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement;
            const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
            const mod = e.ctrlKey || e.metaKey;
            const k = e.key.toLowerCase();
            if (mod && k === 's') {
                e.preventDefault();
                void download();
                return;
            }
            if (mod && k === 'f') {
                e.preventDefault();
                setFindOpen(true);
                return;
            }
            if (typing) return;
            if (mod && k === 'z') {
                e.preventDefault();
                dispatch({ type: e.shiftKey ? 'redo' : 'undo' });
            } else if (mod && k === 'y') {
                e.preventDefault();
                dispatch({ type: 'redo' });
            } else if (mod && (k === '=' || k === '+')) {
                e.preventDefault();
                dispatch({ type: 'zoom', zoom: zoom * 1.2 });
            } else if (mod && k === '-') {
                e.preventDefault();
                dispatch({ type: 'zoom', zoom: zoom / 1.2 });
            } else if (mod && k === '0') {
                e.preventDefault();
                dispatch({ type: 'zoom', zoom, fitWidth: true });
            } else if ((k === 'delete' || k === 'backspace') && stateRef.current.selection?.kind === 'object') {
                e.preventDefault();
                dispatch({ type: 'remove', id: stateRef.current.selection.id });
            } else if (arrows[k] && !mod && !e.altKey) {
                // Arrow keys move the selection 1 pt (Shift: 10 pt); otherwise they scroll as usual.
                if (nudge(arrows[k], e.shiftKey ? 10 : 1)) e.preventDefault();
            } else if (k === 'escape') {
                setFindOpen(false);
                setEditingObject(null);
                dispatch({ type: 'tool', tool: 'edit' });
            } else if (!mod && !e.altKey && toolKeys[k]) {
                dispatch({ type: 'tool', tool: toolKeys[k] });
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dispatch, download, zoom, setEditingObject, session]);

    // ---- Autosave (this browser only) and leave-page warning
    useEffect(() => {
        if (!state.version) return;
        const t = setTimeout(() => {
            void saveSession({
                name: fileName,
                bytes: session.bytes,
                edits: state.edits,
                slots: state.slots,
                images: [...session.images],
                savedAt: Date.now(),
                needsPassword: session.usesPassword,
            });
        }, 1200);
        return () => clearTimeout(t);
    }, [state.version, state.edits, state.slots, fileName, session]);

    useEffect(() => {
        const onBefore = (e: BeforeUnloadEvent) => {
            if (!stateRef.current.dirty) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBefore);
        return () => window.removeEventListener('beforeunload', onBefore);
    }, []);

    return (
        <div className="fixed inset-0 z-40 flex flex-col bg-slate-100 font-[Outfit,system-ui,sans-serif]">
            <TopBar
                fileName={fileName}
                onFileName={setFileName}
                zoom={zoom}
                onDownload={download}
                exporting={exporting}
                onToggleFind={() => setFindOpen((o) => !o)}
                onTogglePanel={() => setPanelOpen((o) => !o)}
                panelOpen={panelOpen}
            />
            <ToolBar onImage={() => imageInput.current?.click()} onSign={() => setSignOpen(true)} />

            {notice && (
                <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-[12.5px] text-amber-900">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="flex-1">This PDF was locked against editing by its creator. It opened fine — please only change documents you have the right to modify.</span>
                    <button type="button" aria-label="Dismiss" onClick={() => setNotice(false)} className="rounded p-1 hover:bg-amber-100">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="relative flex min-h-0 flex-1">
                {panelOpen && (
                    <aside className="hidden w-[152px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white md:block">
                        <PagesPanel current={current} onJump={jumpTo} />
                    </aside>
                )}
                <main ref={scrollRef as React.RefObject<HTMLElement>} onScroll={onScroll} className="relative min-w-0 flex-1 overflow-auto" aria-label="Document">
                    <div className="mx-auto flex w-max min-w-full flex-col items-center gap-5 px-2 py-5 sm:px-6">
                        {state.slots.map((s, i) => (
                            <PageView key={s.key} slot={s} number={i + 1} />
                        ))}
                    </div>
                </main>
                {findOpen && (
                    <div className="absolute right-3 top-3 z-50">
                        <FindPanel onClose={() => setFindOpen(false)} />
                    </div>
                )}
                <SelectionBar />
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-medium text-white md:hidden">
                    Page {current + 1} / {state.slots.length}
                </div>
            </div>

            <input
                ref={imageInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (!f) return;
                    try {
                        placeImage(await imageFromFile(f), { maxFrac: 0.6, ptPerPx: 0.75 });
                    } catch {
                        toast.error("That image couldn't be read");
                    }
                }}
            />
            <SignatureDialog open={signOpen} onOpenChange={setSignOpen} onPick={(img) => placeImage(img, { maxFrac: 0.3, ptPerPx: 0.25 })} />
        </div>
    );
}
