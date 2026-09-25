/**
 * Tools, plus the options of the active tool (colour, stroke width, text
 * defaults) so there is never a hidden settings panel to hunt for.
 */
import { ArrowUpRight, Circle, Eraser, Highlighter, ImagePlus, Minus, PenLine, Signature, Square, SquareDashed, TextCursorInput, Type } from 'lucide-react';
import type { ComponentType } from 'react';
import type { RGB } from '../engine/edits';
import { rgbCss, useEditor } from './EditorContext';
import { ColorDots, Divider } from './FormatBar';
import { FAMILIES } from './fonts';
import type { Tool } from './store';

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

const SHAPES: ToolDef[] = [
    { id: 'rect', label: 'Rectangle', icon: Square, hint: 'Drag to draw a rectangle' },
    { id: 'ellipse', label: 'Ellipse', icon: Circle, hint: 'Drag to draw an ellipse or circle' },
    { id: 'line', label: 'Line', icon: Minus, hint: 'Drag to draw a line' },
    { id: 'arrow', label: 'Arrow', icon: ArrowUpRight, hint: 'Drag to draw an arrow' },
];

const HIGHLIGHTS: RGB[] = [
    [1, 0.9, 0.2],
    [0.55, 0.95, 0.45],
    [0.55, 0.85, 1],
    [1, 0.6, 0.8],
];
const INKS: RGB[] = [
    [0, 0, 0],
    [0.86, 0.15, 0.15],
    [0.09, 0.4, 0.85],
    [0.05, 0.55, 0.3],
];

function ToolButton({ def, active, onClick }: { def: ToolDef; active: boolean; onClick: () => void }) {
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

export default function ToolBar({ onImage, onSign }: { onImage: () => void; onSign: () => void }) {
    const { state, dispatch, scale } = useEditor();
    const setTool = (tool: Tool) => dispatch({ type: 'tool', tool });
    const t = state.tool;
    const d = state.draw;
    const active = [...TOOLS, ...SHAPES].find((x) => x.id === t);

    return (
        <div className="flex shrink-0 flex-col border-b border-slate-200 bg-white">
            <div className="flex items-center gap-0.5 overflow-x-auto px-2 py-1 [scrollbar-width:none] md:justify-center">
                {TOOLS.map((def) => (
                    <ToolButton key={def.id} def={def} active={t === def.id} onClick={() => setTool(def.id)} />
                ))}
                <Divider />
                {SHAPES.map((def) => (
                    <ToolButton key={def.id} def={def} active={t === def.id} onClick={() => setTool(def.id)} />
                ))}
                <Divider />
                <ToolButton def={{ id: 'edit', label: 'Image', icon: ImagePlus, hint: 'Insert a photo or logo' }} active={false} onClick={onImage} />
                <ToolButton def={{ id: 'edit', label: 'Sign', icon: Signature, hint: 'Draw, type or upload your signature' }} active={false} onClick={onSign} />
            </div>

            {/* Options for the active tool */}
            {active && t !== 'edit' && (
                <div className="flex min-h-[40px] items-center gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50/70 px-3 py-1 text-[12px] text-slate-600 md:justify-center">
                    <span className="hidden shrink-0 text-slate-500 sm:inline">{active.hint}</span>
                    {(t === 'draw' || SHAPES.some((s) => s.id === t)) && (
                        <>
                            <Divider />
                            <ColorDots value={d.stroke} colors={INKS} onChange={(c) => dispatch({ type: 'drawDefaults', patch: { stroke: c } })} />
                            <label className="flex shrink-0 items-center gap-1.5">
                                Width
                                <input type="range" min={0.5} max={10} step={0.5} value={d.width} onChange={(e) => dispatch({ type: 'drawDefaults', patch: { width: +e.target.value } })} className="w-20 accent-emerald-600" />
                                {/* Preview: the stroke as thick as it will look on the page at this zoom */}
                                <svg width={40} height={24} aria-hidden="true" className="shrink-0">
                                    <line x1={4} y1={12} x2={36} y2={12} stroke={rgbCss(d.stroke)} strokeWidth={Math.max(1, d.width * scale)} strokeLinecap="round" />
                                </svg>
                            </label>
                            {(t === 'rect' || t === 'ellipse') && (
                                <label className="flex shrink-0 items-center gap-1.5">
                                    <input type="checkbox" checked={!!d.fill} onChange={(e) => dispatch({ type: 'drawDefaults', patch: { fill: e.target.checked ? [0.93, 0.95, 1] : null } })} className="accent-emerald-600" />
                                    Filled
                                </label>
                            )}
                        </>
                    )}
                    {t === 'highlight' && (
                        <>
                            <Divider />
                            <ColorDots value={d.highlight} colors={HIGHLIGHTS} onChange={(c) => dispatch({ type: 'drawDefaults', patch: { highlight: c } })} />
                        </>
                    )}
                    {t === 'text' && (
                        <>
                            <Divider />
                            <select
                                aria-label="Font for new text"
                                value={state.text.family}
                                onChange={(e) => dispatch({ type: 'textDefaults', patch: { family: e.target.value } })}
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
                                value={state.text.size}
                                onChange={(e) => {
                                    const v = +e.target.value;
                                    if (v >= 4 && v <= 144) dispatch({ type: 'textDefaults', patch: { size: v } });
                                }}
                                className="h-7 w-14 rounded-md border-0 bg-white px-1 text-center text-[12px] ring-1 ring-slate-200"
                            />
                            <ColorDots value={state.text.color} colors={INKS} onChange={(c) => dispatch({ type: 'textDefaults', patch: { color: c } })} />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
