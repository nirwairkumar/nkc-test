/**
 * Alignment guides and the move read-out, drawn in the page's top overlay so
 * they stay visible above text, objects and editors.
 */
import { createPortal } from 'react-dom';
import type { Box, Guide } from './guides';

/** Rose, so guides never read as the emerald selection outlines. */
const GUIDE = '#e11d48';

export default function GuideLines({ overlay, guides, box, readout }: { overlay: HTMLElement | null; guides: Guide[]; box: Box | null; readout?: string | null }) {
    if (!overlay || !box) return null;
    const crisp = (v: number) => Math.round(v) + 0.5;
    return createPortal(
        <>
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
                {guides.map((g, i) => {
                    const p = crisp(g.pos);
                    const common = { stroke: GUIDE, strokeWidth: 1, strokeDasharray: g.dashed ? '4 3' : undefined };
                    return g.axis === 'x' ? <line key={i} x1={p} x2={p} y1={g.from} y2={g.to} {...common} /> : <line key={i} x1={g.from} x2={g.to} y1={p} y2={p} {...common} />;
                })}
            </svg>
            {guides.map((g, i) =>
                g.label ? (
                    <span
                        key={i}
                        className="pointer-events-none absolute whitespace-nowrap rounded bg-rose-600 px-1 py-px text-[10px] font-medium leading-tight text-white shadow-sm"
                        style={g.axis === 'x' ? { left: g.pos + 4, top: Math.max(0, box.top - 18) } : { left: box.right + 6, top: g.pos - 16 }}
                    >
                        {g.label}
                    </span>
                ) : null,
            )}
            {readout && (
                <span
                    className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900/85 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white shadow"
                    style={{ left: (box.left + box.right) / 2, top: box.bottom + 6 }}
                >
                    {readout}
                </span>
            )}
        </>,
        overlay,
    );
}
