/**
 * Create a signature by drawing, typing (script fonts) or uploading a photo
 * (paper background removed automatically). Recent signatures are kept in this
 * browser only, for one-click reuse.
 */
import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { StoredImage } from '../engine/edits';
import { removeWhiteBackground, imageFromFile, trimmedPng } from './images';

const SAVED_KEY = 'panna:signatures';
const INKS = ['#111827', '#1d3fbf', '#0f5132'];
const SCRIPTS = [
    { css: '"Dancing Script", cursive', label: 'Dancing Script' },
    { css: '"Great Vibes", cursive', label: 'Great Vibes' },
    { css: '"Caveat", cursive', label: 'Caveat' },
    { css: '"Sacramento", cursive', label: 'Sacramento' },
];

function loadScriptFonts() {
    if (document.querySelector('link[data-panna-sign]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.dataset.pannaSign = '1';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&family=Sacramento&display=swap';
    document.head.appendChild(l);
}

const readSaved = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    } catch {
        return [];
    }
};

async function toStored(dataUrl: string): Promise<StoredImage> {
    const bytes = new Uint8Array(await (await fetch(dataUrl)).arrayBuffer());
    const bmp = await createImageBitmap(new Blob([bytes as unknown as BlobPart], { type: 'image/png' }));
    const out = { bytes, mime: 'image/png' as const, width: bmp.width, height: bmp.height };
    bmp.close?.();
    return out;
}

function toDataUrl(img: StoredImage): Promise<string> {
    return new Promise((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(new Blob([img.bytes as unknown as BlobPart], { type: img.mime }));
    });
}

export default function SignatureDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (img: StoredImage) => void }) {
    const [tab, setTab] = useState('draw');
    const [ink, setInk] = useState(INKS[0]);
    const [saved, setSaved] = useState<string[]>([]);
    const [typed, setTyped] = useState('');
    const [script, setScript] = useState(0);
    const [busy, setBusy] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef<{ last: [number, number] | null; any: boolean }>({ last: null, any: false });

    useEffect(() => {
        if (!open) return;
        setSaved(readSaved());
        loadScriptFonts();
    }, [open]);

    const finish = async (img: StoredImage | null) => {
        if (!img) return;
        try {
            const url = await toDataUrl(img);
            const next = [url, ...readSaved().filter((u) => u !== url)].slice(0, 4);
            localStorage.setItem(SAVED_KEY, JSON.stringify(next));
        } catch {
            /* storage full / private mode */
        }
        onPick(img);
        onOpenChange(false);
    };

    // ---- draw pad
    const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
        const c = canvasRef.current!;
        const r = c.getBoundingClientRect();
        return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
    };
    const clearPad = () => {
        const c = canvasRef.current;
        if (!c) return;
        c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
        drawing.current.any = false;
    };

    const typedCanvas = async (): Promise<StoredImage | null> => {
        const text = typed.trim();
        if (!text) return null;
        const font = `96px ${SCRIPTS[script].css}`;
        await document.fonts?.load(font, text).catch(() => undefined);
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d')!;
        ctx.font = font;
        c.width = Math.ceil(ctx.measureText(text).width + 60);
        c.height = 170;
        ctx.font = font;
        ctx.fillStyle = ink;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 30, 85);
        return trimmedPng(c);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add your signature</DialogTitle>
                    <DialogDescription>Saved only on this device. You can move and resize it after placing.</DialogDescription>
                </DialogHeader>

                {saved.length > 0 && (
                    <div>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recent</p>
                        <div className="flex flex-wrap gap-2">
                            {saved.map((u) => (
                                <div key={u} className="group relative">
                                    <button type="button" onClick={async () => finish(await toStored(u))} className="flex h-14 w-32 items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 hover:border-emerald-500">
                                        <img src={u} alt="Saved signature" className="max-h-full max-w-full" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Forget this signature"
                                        onClick={() => {
                                            const next = saved.filter((x) => x !== u);
                                            setSaved(next);
                                            localStorage.setItem(SAVED_KEY, JSON.stringify(next));
                                        }}
                                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-white group-hover:flex"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="draw">Draw</TabsTrigger>
                        <TabsTrigger value="type">Type</TabsTrigger>
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                    </TabsList>

                    <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-slate-500">Ink</span>
                        {INKS.map((c) => (
                            <button key={c} type="button" aria-label={`Ink ${c}`} onClick={() => setInk(c)} className={`h-5 w-5 rounded-full ${ink === c ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`} style={{ background: c }} />
                        ))}
                    </div>

                    <TabsContent value="draw" className="space-y-3">
                        <canvas
                            ref={canvasRef}
                            width={900}
                            height={300}
                            className="h-40 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-white"
                            onPointerDown={(e) => {
                                e.currentTarget.setPointerCapture(e.pointerId);
                                drawing.current.last = pos(e);
                            }}
                            onPointerMove={(e) => {
                                const d = drawing.current;
                                if (!d.last) return;
                                const p = pos(e);
                                const ctx = canvasRef.current!.getContext('2d')!;
                                ctx.strokeStyle = ink;
                                ctx.lineWidth = 5;
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                ctx.beginPath();
                                ctx.moveTo(d.last[0], d.last[1]);
                                ctx.lineTo(p[0], p[1]);
                                ctx.stroke();
                                d.last = p;
                                d.any = true;
                            }}
                            onPointerUp={() => (drawing.current.last = null)}
                        />
                        <div className="flex justify-between">
                            <button type="button" onClick={clearPad} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                                Clear
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={async () => {
                                    if (!drawing.current.any || !canvasRef.current) return;
                                    setBusy(true);
                                    await finish(await trimmedPng(canvasRef.current));
                                    setBusy(false);
                                }}
                                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                            >
                                Use signature
                            </button>
                        </div>
                    </TabsContent>

                    <TabsContent value="type" className="space-y-3">
                        <input
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder="Type your name"
                            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            {SCRIPTS.map((s, i) => (
                                <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => setScript(i)}
                                    className={`flex h-16 items-center justify-center overflow-hidden rounded-lg border px-2 text-2xl ${script === i ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-slate-200'}`}
                                    style={{ fontFamily: s.css, color: ink }}
                                >
                                    {typed || 'Your Name'}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                disabled={!typed.trim() || busy}
                                onClick={async () => {
                                    setBusy(true);
                                    await finish(await typedCanvas());
                                    setBusy(false);
                                }}
                                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                            >
                                Use signature
                            </button>
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-3">
                        <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600 hover:border-emerald-500">
                            <Upload className="h-6 w-6 text-slate-400" />
                            <span>Photo or scan of your signature on white paper</span>
                            <span className="text-xs text-slate-400">We remove the paper background automatically</span>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    setBusy(true);
                                    try {
                                        await finish(await removeWhiteBackground(await imageFromFile(f)));
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                            />
                        </label>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
