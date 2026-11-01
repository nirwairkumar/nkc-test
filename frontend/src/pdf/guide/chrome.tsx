/**
 * Replicas of the Panna editor's chrome (src/pdf/editor: TopBar, ToolBar,
 * FormatBar, SelectionBar, PagesPanel and the download toast), built from the
 * same class strings. The editor is a full-screen app, so its sm:/md:/lg:
 * variants follow the screen; here they follow the width of the demo window
 * instead (`bp`: 0 phone, 1 ≥ 640, 2 ≥ 768, 3 ≥ 1024), resolved by hand.
 */
import type { ComponentType, MouseEvent, ReactNode } from 'react';
import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowUpRight,
    Bold,
    Check,
    CheckCircle2,
    Circle,
    Download,
    Eraser,
    Highlighter,
    ImagePlus,
    Italic,
    Loader2,
    Maximize2,
    Minus,
    Move,
    PanelLeft,
    PenLine,
    Redo2,
    RotateCcw,
    Search,
    Signature,
    Square,
    SquareDashed,
    TextCursorInput,
    Trash2,
    TriangleAlert,
    Type,
    Undo2,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { PannaMark } from '../ui/PannaLogo';
import { FAMILIES, hexRgb, rgbHex, type RGB } from './certificate';

export type Bp = 0 | 1 | 2 | 3;
export const bpFor = (w: number): Bp => (w >= 1024 ? 3 : w >= 768 ? 2 : w >= 640 ? 1 : 0);

export type Tool = 'edit' | 'text' | 'erase' | 'whiteout' | 'highlight' | 'draw' | 'rect' | 'ellipse' | 'line' | 'arrow';

interface ToolDef {
    id: Tool;
    label: string;
    icon: ComponentType<{ className?: string }>;
    key?: string;
    hint: string;
}

export const TOOLS: ToolDef[] = [
    { id: 'edit', label: 'Edit text', icon: TextCursorInput, key: 'V', hint: 'Click any text to change it — same font, same place. Drag it to move; guides line it up' },
    { id: 'text', label: 'Add text', icon: Type, key: 'T', hint: 'Click where the new text should go' },
    { id: 'erase', label: 'Erase', icon: Eraser, key: 'E', hint: 'Drag over text to remove it for real (background stays)' },
    { id: 'whiteout', label: 'White-out', icon: SquareDashed, key: 'W', hint: 'Drag to cover an area with the page colour' },
    { id: 'highlight', label: 'Highlight', icon: Highlighter, key: 'H', hint: 'Drag across text to highlight it' },
    { id: 'draw', label: 'Draw', icon: PenLine, key: 'D', hint: 'Draw freehand' },
];

export const SHAPES: ToolDef[] = [
    { id: 'rect', label: 'Rectangle', icon: Square, hint: 'Drag to draw a rectangle' },
    { id: 'ellipse', label: 'Ellipse', icon: Circle, hint: 'Drag to draw an ellipse or circle' },
    { id: 'line', label: 'Line', icon: Minus, hint: 'Drag to draw a line' },
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, hint: 'Drag to draw an arrow' },
];

export const HIGHLIGHTS: RGB[] = [
    [1, 0.9, 0.2],
    [0.55, 0.95, 0.45],
    [0.55, 0.85, 1],
    [1, 0.6, 0.8],
];
export const INKS: RGB[] = [
    [0, 0, 0],
    [0.86, 0.15, 0.15],
    [0.09, 0.4, 0.85],
    [0.05, 0.55, 0.3],
];
export const SWATCHES: RGB[] = [
    [0, 0, 0],
    [0.27, 0.27, 0.3],
    [0.09, 0.3, 0.75],
    [0.78, 0.1, 0.1],
    [0.05, 0.5, 0.3],
];

const sameColor = (a: RGB | null, b: RGB) => !!a && rgbHex(a) === rgbHex(b);

// ---------------------------------------------------------------------------
// Small pieces (FormatBar.tsx)

export function IconButton({ label, active, onClick, children, danger }: { label: string; active?: boolean; onClick?: (e: MouseEvent<HTMLButtonElement>) => void; children: ReactNode; danger?: boolean }) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                active ? 'bg-emerald-100 text-emerald-800' : danger ? 'text-slate-600 hover:bg-red-50 hover:text-red-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
            {children}
        </button>
    );
}

export function ColorDots({ value, onChange, colors = SWATCHES }: { value: RGB | null; onChange: (c: RGB) => void; colors?: RGB[] }) {
    return (
        <div className="flex items-center gap-1 px-1">
            {colors.map((c) => (
                <button
                    key={c.join()}
                    type="button"
                    title={rgbHex(c)}
                    aria-label={`Colour ${rgbHex(c)}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onChange(c)}
                    className={`h-5 w-5 rounded-full ring-offset-1 ${sameColor(value, c) ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-300'}`}
                    style={{ background: rgbHex(c) }}
                />
            ))}
            <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" title="Custom colour">
                <span className="absolute inset-0" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} />
                <input type="color" aria-label="Custom colour" value={value ? rgbHex(value) : '#000000'} onChange={(e) => onChange(hexRgb(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
        </div>
    );
}

export const Divider = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />;

// ---------------------------------------------------------------------------
// TopBar.tsx

export function TopBarReplica({
    bp,
    fileName,
    onFileName,
    changes,
    zoom,
    onZoom,
    onFit,
    fit,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onFind,
    onDownload,
    exporting,
    panelOpen,
    onPanel,
    pressed,
}: {
    bp: Bp;
    fileName: string;
    onFileName?: (n: string) => void;
    changes: number;
    zoom: number;
    onZoom?: (z: number) => void;
    onFit?: () => void;
    fit?: boolean;
    canUndo: boolean;
    canRedo: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    onFind?: () => void;
    onDownload?: () => void;
    exporting?: boolean;
    panelOpen?: boolean;
    onPanel?: () => void;
    /** Hero only: the control a scripted finger is pressing. */
    pressed?: 'download' | null;
}) {
    const btn = 'inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent';
    return (
        <header className={`flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white ${bp >= 1 ? 'px-3' : 'px-2'}`}>
            <span className="flex shrink-0 items-center gap-2 rounded-lg">
                <PannaMark />
            </span>
            {bp >= 2 && (
                <button type="button" className={`${btn} inline-flex`} onClick={onPanel} aria-label={panelOpen ? 'Hide pages' : 'Show pages'} aria-pressed={panelOpen} title="Pages">
                    <PanelLeft className="h-[18px] w-[18px]" />
                </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <input
                    value={fileName}
                    onChange={(e) => onFileName?.(e.target.value)}
                    readOnly={!onFileName}
                    tabIndex={onFileName ? 0 : -1}
                    aria-label="File name"
                    spellCheck={false}
                    className="h-9 w-full min-w-0 max-w-[280px] truncate rounded-lg border border-transparent bg-transparent px-2 text-sm font-semibold text-slate-800 hover:border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                {changes > 0 && bp >= 3 && (
                    <span className="inline shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                        {changes} {changes === 1 ? 'change' : 'changes'} · saved in this browser
                    </span>
                )}
            </div>

            <div className="flex items-center">
                <button type="button" className={btn} onClick={onUndo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
                    <Undo2 className="h-[18px] w-[18px]" />
                </button>
                <button type="button" className={btn} onClick={onRedo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)">
                    <Redo2 className="h-[18px] w-[18px]" />
                </button>
            </div>

            {bp >= 1 && (
                <div className="flex items-center rounded-lg border border-slate-200">
                    <button type="button" className={`${btn} h-8 w-8`} onClick={() => onZoom?.(zoom / 1.2)} aria-label="Zoom out" title="Zoom out (Ctrl −)">
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center text-[12.5px] font-medium tabular-nums text-slate-700">{Math.round(zoom * 100)}%</span>
                    <button type="button" className={`${btn} h-8 w-8`} onClick={() => onZoom?.(zoom * 1.2)} aria-label="Zoom in" title="Zoom in (Ctrl +)">
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button type="button" className={`${btn} h-8 w-8 ${fit ? 'text-emerald-700' : ''}`} onClick={onFit} aria-label="Fit to width" title="Fit to width (Ctrl 0)">
                        <Maximize2 className="h-4 w-4" />
                    </button>
                </div>
            )}

            <button type="button" className={btn} onClick={onFind} aria-label="Find and replace" title="Find & replace (Ctrl+F)">
                <Search className="h-[18px] w-[18px]" />
            </button>

            <button
                type="button"
                onClick={onDownload}
                disabled={exporting}
                className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_6px_16px_-8px_rgba(5,150,105,0.9)] transition hover:bg-emerald-800 disabled:opacity-70 ${bp >= 1 ? 'px-4' : 'px-3'} ${pressed === 'download' ? 'ep-press' : ''}`}
            >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {bp >= 1 && <span className="inline">{exporting ? 'Preparing…' : 'Download PDF'}</span>}
            </button>
        </header>
    );
}

// ---------------------------------------------------------------------------
// ToolBar.tsx

function ToolButton({ def, active, onClick }: { def: ToolDef; active: boolean; onClick?: () => void }) {
    const Icon = def.icon;
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            title={`${def.label}${def.key ? ` (${def.key})` : ''} — ${def.hint}`}
            className={`flex h-12 min-w-[56px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1.5 text-[11px] font-medium transition-colors ${
                active ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
            <Icon className="h-[18px] w-[18px]" />
            <span className="whitespace-nowrap">{def.label}</span>
        </button>
    );
}

export interface DrawDefaults {
    stroke: RGB;
    width: number;
    fill: boolean;
    highlight: RGB;
}
export interface TextDefaults {
    family: string;
    size: number;
    color: RGB;
}

export function ToolBarReplica({
    bp,
    tool,
    onTool,
    onImage,
    onSign,
    draw,
    onDraw,
    text,
    onText,
    scale,
}: {
    bp: Bp;
    tool: Tool;
    onTool?: (t: Tool) => void;
    onImage?: () => void;
    onSign?: () => void;
    draw: DrawDefaults;
    onDraw?: (p: Partial<DrawDefaults>) => void;
    text: TextDefaults;
    onText?: (p: Partial<TextDefaults>) => void;
    scale: number;
}) {
    const active = [...TOOLS, ...SHAPES].find((x) => x.id === tool);
    const centre = bp >= 2 ? 'justify-center' : '';
    return (
        <div className="flex shrink-0 flex-col border-b border-slate-200 bg-white">
            <div className={`flex items-center gap-0.5 overflow-x-auto px-2 py-1 [scrollbar-width:none] ${centre}`}>
                {TOOLS.map((def) => (
                    <ToolButton key={def.id} def={def} active={tool === def.id} onClick={() => onTool?.(def.id)} />
                ))}
                <Divider />
                {SHAPES.map((def) => (
                    <ToolButton key={def.id} def={def} active={tool === def.id} onClick={() => onTool?.(def.id)} />
                ))}
                <Divider />
                <ToolButton def={{ id: 'edit', label: 'Image', icon: ImagePlus, hint: 'Insert a photo or logo' }} active={false} onClick={onImage} />
                <ToolButton def={{ id: 'edit', label: 'Sign', icon: Signature, hint: 'Draw, type or upload your signature' }} active={false} onClick={onSign} />
            </div>

            {active && tool !== 'edit' && (
                <div className={`flex min-h-[40px] items-center gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50/70 px-3 py-1 text-[12px] text-slate-600 ${centre}`}>
                    {bp >= 1 && <span className="inline shrink-0 text-slate-500">{active.hint}</span>}
                    {(tool === 'draw' || SHAPES.some((s) => s.id === tool)) && (
                        <>
                            <Divider />
                            <ColorDots value={draw.stroke} colors={INKS} onChange={(c) => onDraw?.({ stroke: c })} />
                            <label className="flex shrink-0 items-center gap-1.5">
                                Width
                                <input type="range" min={0.5} max={10} step={0.5} value={draw.width} onChange={(e) => onDraw?.({ width: +e.target.value })} className="w-20 accent-emerald-600" />
                                <svg width={48} height={28} aria-hidden="true" className="shrink-0 overflow-visible">
                                    <path d="M4 14 C 10 4, 18 4, 24 14 S 38 24, 44 14" fill="none" stroke={rgbHex(draw.stroke)} strokeWidth={Math.max(1, draw.width * scale)} strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </label>
                            {(tool === 'rect' || tool === 'ellipse') && (
                                <label className="flex shrink-0 items-center gap-1.5">
                                    <input type="checkbox" checked={draw.fill} onChange={(e) => onDraw?.({ fill: e.target.checked })} className="accent-emerald-600" />
                                    Filled
                                </label>
                            )}
                        </>
                    )}
                    {tool === 'highlight' && (
                        <>
                            <Divider />
                            <ColorDots value={draw.highlight} colors={HIGHLIGHTS} onChange={(c) => onDraw?.({ highlight: c })} />
                        </>
                    )}
                    {tool === 'text' && (
                        <>
                            <Divider />
                            <select
                                aria-label="Font for new text"
                                value={text.family}
                                onChange={(e) => onText?.({ family: e.target.value })}
                                className="h-7 rounded-md border-0 bg-white py-0 pl-2 pr-7 text-[12px] ring-1 ring-slate-200"
                            >
                                {FAMILIES.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                aria-label="Size for new text"
                                type="number"
                                min={4}
                                max={144}
                                value={text.size}
                                onChange={(e) => {
                                    const v = +e.target.value;
                                    if (v >= 4 && v <= 144) onText?.({ size: v });
                                }}
                                className="h-7 w-14 rounded-md border-0 bg-white px-1 text-center text-[12px] ring-1 ring-slate-200"
                            />
                            <ColorDots value={text.color} colors={INKS} onChange={(c) => onText?.({ color: c })} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// FormatBar.tsx

export interface Fmt {
    family: string;
    size: number;
    color: RGB;
    bold: boolean;
    italic: boolean;
    align: 'left' | 'center' | 'right' | 'justify';
}

export function FormatBarReplica({
    bp,
    value,
    onChange,
    originalLabel,
    warning,
    hint,
    onDelete,
    onRevert,
    onDone,
    showAlign = true,
    pressedDone,
}: {
    bp: Bp;
    value: Fmt;
    onChange?: (patch: Partial<Fmt>) => void;
    originalLabel?: string;
    warning?: string | null;
    hint?: string;
    onDelete?: () => void;
    onRevert?: () => void;
    onDone?: () => void;
    showAlign?: boolean;
    pressedDone?: boolean;
}) {
    return (
        <div
            className="flex flex-col gap-1"
            onMouseDown={(e) => {
                const t = e.target as HTMLElement;
                if (!['SELECT', 'INPUT', 'OPTION'].includes(t.tagName)) e.preventDefault();
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]">
                <select
                    aria-label="Font"
                    value={value.family}
                    onChange={(e) => onChange?.({ family: e.target.value })}
                    className="h-8 max-w-[190px] rounded-md border-0 bg-slate-50 pl-2 pr-7 text-[12.5px] font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                    {originalLabel && <option value="original">Original — {originalLabel}</option>}
                    <optgroup label="Standard fonts">
                        {FAMILIES.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.label}
                                {'sample' in f ? `  ${f.sample}` : ''}
                            </option>
                        ))}
                    </optgroup>
                </select>
                <input
                    aria-label="Font size"
                    type="number"
                    min={4}
                    max={144}
                    step={0.5}
                    value={Math.round(value.size * 10) / 10}
                    onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (Number.isFinite(v) && v >= 2 && v <= 400) onChange?.({ size: v });
                    }}
                    className="h-8 w-14 rounded-md border-0 bg-slate-50 px-1.5 text-center text-[12.5px] font-medium tabular-nums text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
                <Divider />
                <IconButton label="Bold" active={value.bold} onClick={() => onChange?.({ bold: !value.bold })}>
                    <Bold className="h-4 w-4" />
                </IconButton>
                <IconButton label="Italic" active={value.italic} onClick={() => onChange?.({ italic: !value.italic })}>
                    <Italic className="h-4 w-4" />
                </IconButton>
                <Divider />
                <ColorDots value={value.color} onChange={(color) => onChange?.({ color })} />
                {showAlign && (
                    <>
                        <Divider />
                        <IconButton label="Align left" active={value.align === 'left'} onClick={() => onChange?.({ align: 'left' })}>
                            <AlignLeft className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Align centre" active={value.align === 'center'} onClick={() => onChange?.({ align: 'center' })}>
                            <AlignCenter className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Align right" active={value.align === 'right'} onClick={() => onChange?.({ align: 'right' })}>
                            <AlignRight className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Justify" active={value.align === 'justify'} onClick={() => onChange?.({ align: 'justify' })}>
                            <AlignJustify className="h-4 w-4" />
                        </IconButton>
                    </>
                )}
                {(onRevert || onDelete || onDone) && <Divider />}
                {onRevert && (
                    <IconButton label="Restore original text" onClick={onRevert}>
                        <RotateCcw className="h-4 w-4" />
                    </IconButton>
                )}
                {onDelete && (
                    <IconButton label="Delete" danger onClick={onDelete}>
                        <Trash2 className="h-4 w-4" />
                    </IconButton>
                )}
                {onDone && (
                    <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onDone}
                        className={`ml-0.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-emerald-700 px-2.5 text-[12.5px] font-semibold text-white hover:bg-emerald-800 ${pressedDone ? 'ep-press' : ''}`}
                    >
                        <Check className="h-4 w-4" /> Done
                    </button>
                )}
            </div>
            {(warning || hint) && (
                <div className="flex max-w-[min(560px,100%)] flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px]">
                    {warning && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">
                            <TriangleAlert className="h-3 w-3 shrink-0" />
                            {warning}
                        </span>
                    )}
                    {hint && bp >= 1 && <span className="inline rounded bg-white/80 px-1 text-slate-500">{hint}</span>}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// SelectionBar.tsx

export function SelectionBarReplica({ bp, text, atTop, onEdit, onNudge, moved, onBack }: { bp: Bp; text: string; atTop: boolean; onEdit: () => void; onNudge: (dx: number, dy: number, big: boolean) => void; moved: boolean; onBack: () => void }) {
    return (
        <div className={`pointer-events-none absolute inset-x-0 z-40 flex justify-center px-3 ${atTop ? 'top-3' : bp >= 2 ? 'bottom-4' : 'bottom-12'}`}>
            <div className="pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.45)]">
                {bp >= 1 && (
                    <span className="flex max-w-[180px] shrink-0 items-center gap-1.5 truncate px-2 text-[12px] text-slate-500" title={text}>
                        <Move className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate">“{text}”</span>
                    </span>
                )}
                <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onEdit}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-[12.5px] font-medium text-slate-700 hover:bg-slate-100"
                >
                    <PenLine className="h-3.5 w-3.5" /> Edit text
                </button>
                <Divider />
                <IconButton label="Move left (Shift: 10 pt)" onClick={(e) => onNudge(-1, 0, e.shiftKey)}>
                    <ArrowLeft className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move up (Shift: 10 pt)" onClick={(e) => onNudge(0, -1, e.shiftKey)}>
                    <ArrowUp className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move down (Shift: 10 pt)" onClick={(e) => onNudge(0, 1, e.shiftKey)}>
                    <ArrowDown className="h-4 w-4" />
                </IconButton>
                <IconButton label="Move right (Shift: 10 pt)" onClick={(e) => onNudge(1, 0, e.shiftKey)}>
                    <ArrowRight className="h-4 w-4" />
                </IconButton>
                {moved && (
                    <>
                        <Divider />
                        <IconButton label="Back to original position" onClick={onBack}>
                            <RotateCcw className="h-4 w-4" />
                        </IconButton>
                    </>
                )}
                {bp >= 3 && <span className="inline shrink-0 whitespace-nowrap px-2 text-[11px] text-slate-500">Drag it to move · arrow keys nudge (Shift: 10 pt)</span>}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// The download toast (sonner, richColors, top-center), as Workspace.tsx shows it.

export function DownloadToast({ onAction, onClose }: { onAction?: () => void; onClose?: () => void }) {
    return (
        <div className="ep-toast" role="status">
            <CheckCircle2 className="ep-toast-icon" aria-hidden="true" />
            <div className="ep-toast-text">
                <b>Your PDF is downloaded</b>
                <span>No watermark, no sign-up. Teaching from this PDF? Turn it into an online test in one click.</span>
            </div>
            {onAction && (
                <button type="button" className="ep-toast-btn" onClick={onAction}>
                    Make a test
                </button>
            )}
            {onClose && (
                <button type="button" className="ep-toast-x" aria-label="Close" onClick={onClose}>
                    ×
                </button>
            )}
        </div>
    );
}
