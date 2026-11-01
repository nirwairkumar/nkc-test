/**
 * The hero: an iPhone running pdf.testoza.com/edit-pdf, replaying one real edit.
 * The PDF is opened from the page's drop zone, the date on the certificate is
 * tapped, 14 becomes 15 in the certificate's own font, and the file is downloaded.
 * Screens are built from the product's classes at phone width (PdfEditorPage,
 * Dropzone, TopBar, ToolBar, FormatBar, SelectionBar). The phone is inert: a picture
 * that moves, not a control. Reduced motion shows the finished edit, still.
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Lock, Menu, RotateCw, Sparkles } from 'lucide-react';
import { BLOCKS, PAGE_W } from './certificate';
import { DownloadToast, FormatBarReplica, SelectionBarReplica, ToolBarReplica, TopBarReplica } from './chrome';
import Paper, { blockStyle, fmtOf } from './Paper';
import { PannaMark } from '../ui/PannaLogo';
import { useIsoLayoutEffect } from './useIsoLayoutEffect';

const W = 393;
const H = 852;
const S = 0.72;
const BODY = BLOCKS.find((b) => b.id === 'body')!;
const ORIG = BODY.text;
const MID = ORIG.replace('14 March', '1 March');
const NEW = ORIG.replace('14 March', '15 March');
const CARET_MID = ORIG.indexOf('14 March') + 1;
const CARET_NEW = CARET_MID + 1;

type Target = 'choose' | 'date' | 'done' | 'download';
interface Frame {
    screen: 'drop' | 'opening' | 'editor';
    finger?: Target;
    press?: boolean;
    draft?: 'orig' | 'mid' | 'new';
    committed?: boolean;
    exporting?: boolean;
    toast?: boolean;
    cap: number;
}

const FRAMES: [number, Frame][] = [
    [0, { screen: 'drop', cap: 0 }],
    [800, { screen: 'drop', finger: 'choose', cap: 0 }],
    [1300, { screen: 'drop', finger: 'choose', press: true, cap: 0 }],
    [1600, { screen: 'opening', cap: 0 }],
    [2200, { screen: 'editor', cap: 1 }],
    [2900, { screen: 'editor', finger: 'date', cap: 1 }],
    [3400, { screen: 'editor', finger: 'date', press: true, cap: 1 }],
    [3650, { screen: 'editor', draft: 'orig', cap: 2 }],
    [4600, { screen: 'editor', draft: 'mid', cap: 2 }],
    [5300, { screen: 'editor', draft: 'new', cap: 2 }],
    [6500, { screen: 'editor', draft: 'new', finger: 'done', cap: 3 }],
    [7000, { screen: 'editor', draft: 'new', finger: 'done', press: true, cap: 3 }],
    [7250, { screen: 'editor', committed: true, cap: 3 }],
    [8300, { screen: 'editor', committed: true, finger: 'download', cap: 4 }],
    [8800, { screen: 'editor', committed: true, finger: 'download', press: true, exporting: true, cap: 4 }],
    [9500, { screen: 'editor', committed: true, toast: true, cap: 4 }],
];
const LOOP = 12800;
const STILL: Frame = { screen: 'editor', committed: true, cap: 3 };

const CAPTIONS: [string, string][] = [
    ['Open the PDF', 'It opens in the browser. Nothing is uploaded.'],
    ['Tap the line to change', 'A text box opens on it, in the PDF’s own font.'],
    ['Type the change', '14 becomes 15, still in Georgia.'],
    ['Tap Done', 'Only the changed words are rewritten.'],
    ['Download', 'No watermark, no account, no wait.'],
];

function StatusBar() {
    return (
        <div className="ep-statusbar">
            <span>9:41</span>
            <span className="ep-statusbar-icons" aria-hidden="true">
                <svg width="18" height="12" viewBox="0 0 18 12">
                    <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
                    <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
                    <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
                    <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
                </svg>
                <svg width="16" height="12" viewBox="0 0 16 12">
                    <path d="M8 2.6c2.4 0 4.6.9 6.2 2.5l1.2-1.2C13.4 1.9 10.8.9 8 .9S2.6 1.9.6 3.9l1.2 1.2C3.4 3.5 5.6 2.6 8 2.6zm0 3.3c1.5 0 2.9.6 3.9 1.6l1.2-1.2C11.8 5 10 4.2 8 4.2S4.2 5 2.9 6.3l1.2 1.2c1-1 2.4-1.6 3.9-1.6zM8 9.2c.6 0 1.1.2 1.5.6L8 11.4 6.5 9.8c.4-.4.9-.6 1.5-.6z" fill="currentColor" />
                </svg>
                <svg width="27" height="13" viewBox="0 0 27 13">
                    <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
                    <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
                    <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity="0.5" />
                </svg>
            </span>
        </div>
    );
}

/** pdf.testoza.com/edit-pdf before a file is chosen: the hero (PdfEditorPage) and its drop zone (Dropzone). */
function DropScreen({ pressed }: { pressed: boolean }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const zoneRef = useRef<HTMLDivElement>(null);
    // Scrolled the way a visitor would be: the drop zone above Safari's bar.
    useIsoLayoutEffect(() => {
        const sc = scrollRef.current;
        const zone = zoneRef.current;
        if (sc && zone) sc.scrollTop = Math.max(0, zone.offsetTop + zone.offsetHeight - sc.clientHeight + 24);
    }, []);
    return (
        <div ref={scrollRef} className="absolute inset-0 overflow-hidden">
            <div className="min-h-full bg-[radial-gradient(1200px_500px_at_50%_-10%,rgba(16,185,129,0.14),transparent)] bg-white font-[Outfit,system-ui,sans-serif]">
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
                        <span className="flex shrink-0 items-center gap-2 rounded-lg">
                            <PannaMark />
                            <span className="flex flex-col leading-none">
                                <span className="font-[Outfit,system-ui,sans-serif] text-[19px] font-bold tracking-tight text-slate-900">Panna</span>
                                <span className="mt-0.5 text-[10px] font-medium tracking-wide text-emerald-700">by TestoZa</span>
                            </span>
                        </span>
                        <span className="rounded-lg p-2 text-slate-600">
                            <Menu className="h-5 w-5" />
                        </span>
                    </div>
                </header>
                <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10">
                    <div>
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            <Sparkles className="h-3.5 w-3.5" /> Free · No sign-up · No watermark
                        </p>
                        <p className="mt-4 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-slate-900">
                            Edit PDF text online — <span className="text-emerald-600">in the same font</span>
                        </p>
                        <p className="mt-4 max-w-xl text-pretty text-lg leading-relaxed text-slate-600">Change names, dates, marks and whole paragraphs in any PDF — Hindi or English — and download it looking like it was never touched.</p>
                        <ul className="mt-6 space-y-2.5 text-[15px] text-slate-700">
                            {["Uses your PDF's own fonts", 'Removed text is truly deleted', 'Works on phones and laptops', 'Runs in your browser — private by design'].map((t) => (
                                <li key={t} className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div ref={zoneRef} className="relative flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-emerald-300/70 bg-white/80 px-6 py-10 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 text-white shadow-[0_12px_30px_-12px_rgba(5,150,105,0.8)]">
                            <FileUp className="h-8 w-8" />
                        </div>
                        <p className="mt-5 text-lg font-semibold text-slate-900">Drop your PDF here</p>
                        <p className="mt-1 text-sm text-slate-500">or</p>
                        <span
                            data-tap="choose"
                            className={`mt-3 inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-700 px-7 text-base font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_10px_24px_-10px_rgba(5,150,105,0.9)] ${pressed ? 'ep-press' : ''}`}
                        >
                            Choose PDF
                        </span>
                        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
                            <Lock className="h-3.5 w-3.5" /> Your file never leaves your device
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

function EditorScreen({ f }: { f: Frame }) {
    const mainRef = useRef<HTMLDivElement>(null);
    const draftText = f.draft === 'orig' ? ORIG : f.draft === 'mid' ? MID : NEW;
    const caret = f.draft === 'orig' ? CARET_MID + 1 : f.draft === 'mid' ? CARET_MID : CARET_NEW;
    const edits = f.committed ? { body: { text: NEW } } : {};
    const fmt = fmtOf(BODY, undefined);
    const style = blockStyle(BODY, undefined, S);

    // Panned to the middle of the page, as after a pinch-zoom.
    useIsoLayoutEffect(() => {
        const el = mainRef.current;
        if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }, []);

    return (
        <div className="absolute inset-0 flex flex-col bg-slate-100 font-[Outfit,system-ui,sans-serif]">
            <TopBarReplica bp={0} fileName="certificate.pdf" changes={f.committed ? 1 : 0} zoom={S / (96 / 72)} canUndo={!!f.committed} canRedo={false} exporting={f.exporting} pressed={f.press && f.finger === 'download' ? 'download' : null} />
            <ToolBarReplica bp={0} tool="edit" draw={{ stroke: [0.86, 0.15, 0.15], width: 2, fill: false, highlight: [1, 0.9, 0.2] }} text={{ family: 'helvetica', size: 12, color: [0, 0, 0] }} scale={S} />
            <div className="relative flex min-h-0 flex-1">
                <div ref={mainRef} className="relative min-w-0 flex-1 overflow-hidden">
                    <div className="mx-auto flex w-max min-w-full flex-col items-center gap-5 px-2 py-5">
                        <div className="flex flex-col items-center gap-1.5">
                            <Paper scale={S} edits={edits} hideId={f.draft ? 'body' : null} onOpen={() => undefined} selectedId={f.committed && !f.toast && !f.exporting ? 'body' : null}>
                                {f.draft && (
                                    <div style={{ ...style, zIndex: 30 }}>
                                        <div
                                            className="block resize-none overflow-hidden border-0 p-0 outline-none ring-2 ring-emerald-500/70 ring-offset-2"
                                            style={{ background: '#fffdf6', ['--tw-ring-offset-color' as string]: '#fffdf6', whiteSpace: 'pre-wrap', textAlign: fmt.align, color: style.color }}
                                        >
                                            {draftText.slice(0, caret)}
                                            <span className="ep-caret" aria-hidden="true" />
                                            {draftText.slice(caret)}
                                        </div>
                                    </div>
                                )}
                                {f.draft && (
                                    <div className="absolute" style={{ left: (PAGE_W / 2) * S - 190, top: BODY.top * S - 56, width: 376, zIndex: 40 }}>
                                        <FormatBarReplica bp={0} value={fmt} originalLabel="Georgia" onDelete={() => undefined} onDone={() => undefined} pressedDone={f.press && f.finger === 'done'} />
                                    </div>
                                )}
                            </Paper>
                            <span className="select-none text-[11px] font-medium text-slate-500">1 / 1</span>
                        </div>
                    </div>
                </div>
                {f.committed && !f.toast && !f.exporting && <SelectionBarReplica bp={0} text={NEW} atTop={false} onEdit={() => undefined} onNudge={() => undefined} moved={false} onBack={() => undefined} />}
                <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-medium text-white">Page 1 / 1</div>
            </div>
        </div>
    );
}

export default function HeroPhone() {
    const [frame, setFrame] = useState<Frame>(STILL);
    const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
    const [scale, setScale] = useState(264 / W);
    const [reduced, setReduced] = useState(false);
    const screenRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    // The phone screen is a picture: nothing in it can be focused or clicked.
    useEffect(() => {
        screenRef.current?.setAttribute('inert', '');
    }, []);

    useEffect(() => {
        const el = screenRef.current;
        if (!el) return;
        const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Play while on screen; restart from the top each loop.
    useEffect(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            setReduced(true);
            return;
        }
        let timers: number[] = [];
        let visible = false;
        const clear = () => {
            timers.forEach((t) => window.clearTimeout(t));
            timers = [];
        };
        const play = () => {
            clear();
            for (const [at, f] of FRAMES) timers.push(window.setTimeout(() => setFrame(f), at));
            timers.push(window.setTimeout(play, LOOP));
        };
        const io = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !visible) {
                visible = true;
                play();
            } else if (!e.isIntersecting && visible) {
                visible = false;
                clear();
            }
        });
        if (stageRef.current) io.observe(stageRef.current);
        const onVis = () => {
            if (document.hidden) {
                clear();
                visible = false;
            } else if (stageRef.current) {
                io.unobserve(stageRef.current);
                io.observe(stageRef.current);
            }
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clear();
            io.disconnect();
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    // Where the finger goes, read from the drawn screen.
    useIsoLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !frame.finger) {
            setFinger(null);
            return;
        }
        let el: Element | null = null;
        if (frame.finger === 'choose') el = canvas.querySelector('[data-tap="choose"]');
        else if (frame.finger === 'date') el = Array.from(canvas.querySelectorAll('[data-block="body"] [data-t]')).find((n) => n.textContent === '14') ?? null;
        else if (frame.finger === 'done') el = Array.from(canvas.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Done') ?? null;
        else el = canvas.querySelector('header > button:last-of-type');
        if (!el) return setFinger(null);
        const c = canvas.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        setFinger({ x: (r.left + r.width / 2 - c.left) / scale, y: (r.top + r.height / 2 - c.top) / scale });
    }, [frame, scale]);

    const f = reduced ? STILL : frame;
    const [title, text] = CAPTIONS[f.cap];

    return (
        <div className="ep-stage-wrap">
            <div className="ep-stage" ref={stageRef} aria-hidden="true">
                <div className="ep-iphone">
                    <i className="ep-iphone-key ep-iphone-key--action" />
                    <i className="ep-iphone-key ep-iphone-key--up" />
                    <i className="ep-iphone-key ep-iphone-key--down" />
                    <i className="ep-iphone-key ep-iphone-key--power" />
                    <div className="ep-iphone-screen" ref={screenRef}>
                        <div className="ep-canvas" ref={canvasRef} style={{ transform: `scale(${scale})` }}>
                            <div className="ep-island" />
                            <StatusBar />
                            <div className="ep-phone-view">
                                {f.screen === 'drop' && <DropScreen pressed={!!f.press} />}
                                {f.screen === 'opening' && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                                    </div>
                                )}
                                {f.screen === 'editor' && <EditorScreen f={f} />}
                                {f.toast && (
                                    <div className="ep-phone-toast">
                                        <DownloadToast />
                                    </div>
                                )}
                            </div>
                            <div className="ep-safari">
                                <div className="ep-safari-bar">
                                    <span>
                                        <Lock /> pdf.testoza.com
                                    </span>
                                    <RotateCw />
                                </div>
                                <div className="ep-safari-home" />
                            </div>
                            {finger && <div className={`ep-finger${f.press ? ' is-press' : ''}`} style={{ left: finger.x, top: finger.y }} />}
                        </div>
                    </div>
                </div>
            </div>
            <div className="ep-stage-caption" aria-hidden="true">
                <p key={f.cap} className="is-swap">
                    <b>{title}</b>
                    {text}
                </p>
                <div className="ep-dots">
                    {CAPTIONS.map((c, i) => (
                        <i key={c[0]} className={i === f.cap ? 'is-on' : ''} />
                    ))}
                </div>
            </div>
        </div>
    );
}
