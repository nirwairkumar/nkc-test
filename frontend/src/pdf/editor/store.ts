/**
 * Editor state: the edit list, page arrangement and UI state, with undo/redo
 * over the document-changing parts (edits + page slots).
 */
import { useReducer } from 'react';
import type { Align } from '../engine/layout';
import type { PageEdit, PageKey, PageSlot, RGB } from '../engine/edits';

export type Tool = 'edit' | 'text' | 'erase' | 'whiteout' | 'highlight' | 'draw' | 'rect' | 'ellipse' | 'line' | 'arrow';

export type Selection = { kind: 'block'; page: PageKey; blockId: string } | { kind: 'object'; id: string } | null;

export interface TextDefaults {
    family: string;
    size: number;
    color: RGB;
    bold: boolean;
    italic: boolean;
    align: Align;
}

export interface DrawDefaults {
    stroke: RGB;
    fill: RGB | null;
    width: number;
    highlight: RGB;
}

interface Doc {
    edits: PageEdit[];
    slots: PageSlot[];
}

export interface EditorState extends Doc {
    past: Doc[];
    future: Doc[];
    tool: Tool;
    selection: Selection;
    /** 1 = 100% (actual size on screen). */
    zoom: number;
    fitWidth: boolean;
    text: TextDefaults;
    draw: DrawDefaults;
    /** Bumped on every document change (autosave). */
    version: number;
    /** Changes not yet downloaded. */
    dirty: boolean;
}

export type Action =
    | { type: 'init'; slots: PageSlot[]; edits?: PageEdit[] }
    | { type: 'upsert'; edit: PageEdit }
    | { type: 'upsertMany'; edits: PageEdit[] }
    | { type: 'remove'; id: string }
    | { type: 'slots'; slots: PageSlot[] }
    | { type: 'undo' }
    | { type: 'redo' }
    | { type: 'tool'; tool: Tool }
    | { type: 'select'; selection: Selection }
    | { type: 'zoom'; zoom: number; fitWidth?: boolean }
    | { type: 'textDefaults'; patch: Partial<TextDefaults> }
    | { type: 'drawDefaults'; patch: Partial<DrawDefaults> }
    | { type: 'saved' };

const HISTORY = 100;

export const initialState: EditorState = {
    edits: [],
    slots: [],
    past: [],
    future: [],
    tool: 'edit',
    selection: null,
    zoom: 1,
    fitWidth: true,
    text: { family: 'helvetica', size: 12, color: [0, 0, 0], bold: false, italic: false, align: 'left' },
    draw: { stroke: [0.86, 0.15, 0.15], fill: null, width: 2, highlight: [1, 0.9, 0.2] },
    version: 0,
    dirty: false,
};

function commit(s: EditorState, next: Doc): EditorState {
    const past = [...s.past, { edits: s.edits, slots: s.slots }].slice(-HISTORY);
    return { ...s, ...next, past, future: [], version: s.version + 1, dirty: true };
}

const upsertInto = (edits: PageEdit[], edit: PageEdit) => {
    const i = edits.findIndex((e) => e.id === edit.id);
    return i >= 0 ? edits.map((e, k) => (k === i ? edit : e)) : [...edits, edit];
};

export function reducer(s: EditorState, a: Action): EditorState {
    switch (a.type) {
        case 'init':
            return { ...initialState, zoom: s.zoom, fitWidth: s.fitWidth, text: s.text, draw: s.draw, slots: a.slots, edits: a.edits ?? [], version: s.version + 1, dirty: !!a.edits?.length };
        case 'upsert':
            return commit(s, { edits: upsertInto(s.edits, a.edit), slots: s.slots });
        case 'upsertMany':
            return commit(s, { edits: a.edits.reduce(upsertInto, s.edits), slots: s.slots });
        case 'remove': {
            const selection = s.selection?.kind === 'object' && s.selection.id === a.id ? null : s.selection;
            return { ...commit(s, { edits: s.edits.filter((e) => e.id !== a.id), slots: s.slots }), selection };
        }
        case 'slots':
            return commit(s, { edits: s.edits, slots: a.slots });
        case 'undo': {
            const prev = s.past[s.past.length - 1];
            if (!prev) return s;
            return { ...s, ...prev, past: s.past.slice(0, -1), future: [{ edits: s.edits, slots: s.slots }, ...s.future], selection: null, version: s.version + 1, dirty: true };
        }
        case 'redo': {
            const next = s.future[0];
            if (!next) return s;
            return { ...s, ...next, past: [...s.past, { edits: s.edits, slots: s.slots }], future: s.future.slice(1), selection: null, version: s.version + 1, dirty: true };
        }
        case 'tool':
            return { ...s, tool: a.tool, selection: null };
        case 'select':
            return { ...s, selection: a.selection };
        case 'zoom':
            return { ...s, zoom: Math.min(5, Math.max(0.25, a.zoom)), fitWidth: a.fitWidth ?? false };
        case 'textDefaults':
            return { ...s, text: { ...s.text, ...a.patch } };
        case 'drawDefaults':
            return { ...s, draw: { ...s.draw, ...a.patch } };
        case 'saved':
            return { ...s, dirty: false };
    }
}

export function useEditorReducer() {
    return useReducer(reducer, initialState);
}

let seq = 0;
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${(++seq).toString(36)}`;
export const textEditId = (page: PageKey, blockId: string) => `t:${page}:${blockId}`;
