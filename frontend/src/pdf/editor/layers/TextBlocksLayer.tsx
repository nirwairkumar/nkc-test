/**
 * Hover outlines for every editable text block, click-to-edit, Tab to jump
 * to the next field, and "ghost" text shown for the moment between committing
 * an edit and the real preview render arriving.
 */
import { useEffect, useMemo, useState } from 'react';
import type { PageKey, TextEdit } from '../../engine/edits';
import type { TextBlock } from '../../engine/layout';
import { useEditor, rgbCss } from '../EditorContext';
import type { View } from '../geometry';
import { textEditId } from '../store';
import InlineTextEditor, { type CommitInfo } from '../InlineTextEditor';

interface Ghost extends CommitInfo {
    id: string;
}

export default function TextBlocksLayer({ pageKey, view, pending }: { pageKey: PageKey; view: View; pending: boolean }) {
    const { session, state, dispatch, reports, editing, setEditing, sampleBackground } = useEditor();
    const analysis = useMemo(() => session.analyze(pageKey), [session, pageKey]);
    const blocks = analysis?.text.blocks ?? [];
    const report = reports.get(pageKey);
    const [ghosts, setGhosts] = useState<Ghost[]>([]);
    const active = state.tool === 'edit';

    useEffect(() => {
        if (!pending) setGhosts([]);
    }, [pending]);

    const editsById = useMemo(() => {
        const m = new Map<string, TextEdit>();
        for (const e of state.edits) if (e.kind === 'text' && e.page === pageKey) m.set(e.id, e);
        return m;
    }, [state.edits, pageKey]);

    // Blocks retyped as new objects because their font can't be re-encoded.
    const replaced = useMemo(() => {
        const prefix = `x:${pageKey}:`;
        return new Set(state.edits.filter((e) => e.id.startsWith(prefix)).map((e) => e.id.slice(prefix.length)));
    }, [state.edits, pageKey]);

    if (!blocks.length) {
        return analysis?.text.hasInvisibleText && active ? <ScannedHint /> : null;
    }

    const editingBlock = editing?.page === pageKey ? blocks.find((b) => b.id === editing.blockId) : undefined;
    const addGhost = (b: TextBlock, info: CommitInfo | null) => {
        if (info) setGhosts((gs) => [...gs.filter((x) => x.id !== b.id), { ...info, id: b.id }]);
    };

    const openNeighbour = (from: TextBlock, dir: 1 | -1) => {
        const editable = blocks.filter((b) => b.editable && !replaced.has(b.id));
        const next = editable[editable.findIndex((b) => b.id === from.id) + dir];
        if (next) {
            setEditing({ page: pageKey, blockId: next.id });
            return;
        }
        // Continue on the next/previous page.
        const order = state.slots.filter((s) => s.src >= 0).map((s) => `p${s.src}`);
        const targetKey = order[order.indexOf(pageKey) + dir];
        if (!targetKey) {
            setEditing(null);
            return;
        }
        const tb = session.analyze(targetKey)?.text.blocks.filter((b) => b.editable) ?? [];
        const target = dir === 1 ? tb[0] : tb[tb.length - 1];
        setEditing(target ? { page: targetKey, blockId: target.id } : null);
        document.querySelector(`[data-page-key="${targetKey}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className={`absolute inset-0 ${active ? '' : 'pointer-events-none'}`} style={{ zIndex: 10 }}>
            {active &&
                blocks.map((b) => {
                    const id = textEditId(pageKey, b.id);
                    const edit = editsById.get(id);
                    if (edit?.text === '' || replaced.has(b.id)) return null;
                    if (editing?.page === pageKey && editing.blockId === b.id) return null;
                    const box = view.rectToScreen(report?.plans.get(id)?.bbox ?? b.bbox);
                    return (
                        <button
                            key={b.id}
                            type="button"
                            data-block-id={b.id}
                            onClick={() => {
                                setEditing({ page: pageKey, blockId: b.id });
                                dispatch({ type: 'select', selection: { kind: 'block', page: pageKey, blockId: b.id } });
                            }}
                            title={b.editable ? 'Click to edit' : "This text's font can't be re-encoded — your edit will be retyped in a similar font"}
                            className={`absolute cursor-text rounded-[2px] outline-none transition-colors ${
                                edit ? 'bg-emerald-400/[0.07] ring-1 ring-emerald-500/40' : ''
                            } hover:bg-emerald-400/10 hover:ring-1 hover:ring-emerald-500/70 focus-visible:ring-2 focus-visible:ring-emerald-500`}
                            style={{ left: box.left - 2, top: box.top - 1, width: box.width + 4, height: box.height + 2 }}
                            aria-label={`Edit text: ${b.text.slice(0, 60)}`}
                        />
                    );
                })}

            {pending &&
                ghosts.map((g) => (
                    <div
                        key={g.id}
                        className="pointer-events-none absolute overflow-hidden whitespace-pre-wrap"
                        style={{
                            left: g.box.left,
                            top: g.box.top,
                            width: g.box.width,
                            minHeight: g.box.height,
                            background: rgbCss(g.background),
                            color: rgbCss(g.color),
                            fontFamily: g.fontFamily,
                            fontSize: g.fontSize,
                            fontWeight: g.bold ? 700 : 400,
                            fontStyle: g.italic ? 'italic' : 'normal',
                            lineHeight: `${g.lineHeight}px`,
                            textAlign: g.align === 'justify' ? 'justify' : (g.align as 'left'),
                        }}
                    >
                        {g.text}
                    </div>
                ))}

            {editingBlock && (
                <InlineTextEditor
                    key={editingBlock.id}
                    pageKey={pageKey}
                    block={editingBlock}
                    view={view}
                    edit={editsById.get(textEditId(pageKey, editingBlock.id))}
                    background={sampleBackground(pageKey, editingBlock.bbox)}
                    onClose={(info) => {
                        addGhost(editingBlock, info);
                        setEditing(null);
                    }}
                    onTab={(dir, info) => {
                        addGhost(editingBlock, info);
                        openNeighbour(editingBlock, dir);
                    }}
                />
            )}
        </div>
    );
}

function ScannedHint() {
    return (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-white shadow">
            Scanned page — use <b>White-out</b> and <b>Add text</b> to change it
        </div>
    );
}
