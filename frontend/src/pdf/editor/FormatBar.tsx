import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, Italic, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import type { RGB } from '../engine/edits';
import type { FontInfo } from '../engine/fonts';
import type { Align } from '../engine/layout';
import { hexToRgb, rgbToHex } from './EditorContext';
import { FAMILIES } from './fonts';

export interface Fmt {
    family: string;
    size: number;
    color: RGB;
    bold: boolean;
    italic: boolean;
    align: Align;
}

export const SWATCHES: RGB[] = [
    [0, 0, 0],
    [0.27, 0.27, 0.3],
    [0.09, 0.3, 0.75],
    [0.78, 0.1, 0.1],
    [0.05, 0.5, 0.3],
];

export function IconButton({ label, active, onClick, children, danger }: { label: string; active?: boolean; onClick: () => void; children: ReactNode; danger?: boolean }) {
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
                    title={rgbToHex(c)}
                    aria-label={`Colour ${rgbToHex(c)}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onChange(c)}
                    className={`h-5 w-5 rounded-full ring-offset-1 ${value && rgbToHex(c) === rgbToHex(value) ? 'ring-2 ring-emerald-500' : 'ring-1 ring-slate-300'}`}
                    style={{ background: rgbToHex(c) }}
                />
            ))}
            <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" title="Custom colour">
                <span className="absolute inset-0" style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }} />
                <input type="color" aria-label="Custom colour" value={value ? rgbToHex(value) : '#000000'} onChange={(e) => onChange(hexToRgb(e.target.value))} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
        </div>
    );
}

export const Divider = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />;

export default function FormatBar({
    value,
    onChange,
    originalLabel,
    docFonts = [],
    warning,
    hint,
    onDelete,
    onRevert,
    onDone,
    showAlign = true,
}: {
    value: Fmt;
    onChange: (patch: Partial<Fmt>) => void;
    /** When set, the family menu offers "Original — <label>". */
    originalLabel?: string;
    docFonts?: FontInfo[];
    warning?: string | null;
    hint?: string;
    onDelete?: () => void;
    onRevert?: () => void;
    onDone?: () => void;
    showAlign?: boolean;
}) {
    const seen = new Set<string>();
    const docOptions = docFonts.filter((f) => {
        const k = f.displayName + f.bold + f.italic;
        if (seen.has(k) || !f.ref) return false;
        seen.add(k);
        return true;
    });
    return (
        <div
            className="flex flex-col gap-1"
            onMouseDown={(e) => {
                // Keep focus in the text box while using the toolbar (except form fields).
                const t = e.target as HTMLElement;
                if (!['SELECT', 'INPUT', 'OPTION'].includes(t.tagName)) e.preventDefault();
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="flex max-w-[calc(100vw-24px)] items-center gap-0.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.35)]">
                <select
                    aria-label="Font"
                    value={value.family}
                    onChange={(e) => onChange({ family: e.target.value })}
                    className="h-8 max-w-[190px] rounded-md border-0 bg-slate-50 pl-2 pr-7 text-[12.5px] font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500"
                >
                    {originalLabel && <option value="original">Original — {originalLabel}</option>}
                    {docOptions.length > 0 && (
                        <optgroup label="Fonts in this PDF">
                            {docOptions.map((f) => (
                                <option key={f.ref!.toString()} value={`doc:${f.ref!.toString()}`}>
                                    {f.displayName}
                                    {f.bold ? ' Bold' : ''}
                                    {f.italic ? ' Italic' : ''}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    <optgroup label="Standard fonts">
                        {FAMILIES.map((f) => (
                            <option key={f.id} value={f.id}>
                                {f.label}
                                {f.sample ? `  ${f.sample}` : ''}
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
                        if (Number.isFinite(v) && v >= 2 && v <= 400) onChange({ size: v });
                    }}
                    className="h-8 w-14 rounded-md border-0 bg-slate-50 px-1.5 text-center text-[12.5px] font-medium tabular-nums text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
                <Divider />
                <IconButton label="Bold" active={value.bold} onClick={() => onChange({ bold: !value.bold })}>
                    <Bold className="h-4 w-4" />
                </IconButton>
                <IconButton label="Italic" active={value.italic} onClick={() => onChange({ italic: !value.italic })}>
                    <Italic className="h-4 w-4" />
                </IconButton>
                <Divider />
                <ColorDots value={value.color} onChange={(color) => onChange({ color })} />
                {showAlign && (
                    <>
                        <Divider />
                        <IconButton label="Align left" active={value.align === 'left'} onClick={() => onChange({ align: 'left' })}>
                            <AlignLeft className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Align centre" active={value.align === 'center'} onClick={() => onChange({ align: 'center' })}>
                            <AlignCenter className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Align right" active={value.align === 'right'} onClick={() => onChange({ align: 'right' })}>
                            <AlignRight className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Justify" active={value.align === 'justify'} onClick={() => onChange({ align: 'justify' })}>
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
                        className="ml-0.5 inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-emerald-700 px-2.5 text-[12.5px] font-semibold text-white hover:bg-emerald-800"
                    >
                        <Check className="h-4 w-4" /> Done
                    </button>
                )}
            </div>
            {(warning || hint) && (
                <div className="flex max-w-[min(560px,calc(100vw-24px))] flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px]">
                    {warning && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-amber-200">
                            <TriangleAlert className="h-3 w-3 shrink-0" />
                            {warning}
                        </span>
                    )}
                    {hint && <span className="hidden rounded bg-white/80 px-1 text-slate-500 sm:inline">{hint}</span>}
                </div>
            )}
        </div>
    );
}
