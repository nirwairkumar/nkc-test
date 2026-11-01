import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { Copy, Check, Delete, ChevronLeft, ChevronRight, HelpCircle, CornerDownLeft, X, Type, AlertTriangle } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/contrib/mhchem'; // registers \ce{} on this katex instance
import { FIXED_ROWS, TOPICS, type TopicId, type MathKey } from './keys';
import TableEditor from './TableEditor';
import { prepareExpressionForKaTeX } from './previewTex';
import {
  finalizeLatex, contextAt, smartBackspace,
  countEmptySlots, clearEmptySlots, firstEmptySlot, SYPAD_INSERT_EVENT, type MathContext,
} from './mathSyntax';
import { toast } from 'sonner';


interface MathKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
}


/* ── helpers ─────────────────────────────────────────── */

function tryKatex(tex: string, displayMode = true): string | null {
  try {
    return katex.renderToString(tex, { throwOnError: true, displayMode, trust: true, strict: 'ignore' });
  } catch {
    return null;
  }
}

function renderMhchemToHtml(expr: string): string {
  return tryKatex(`\\ce{${expr}}`, false) ?? expr;
}

const TABLE_ICONS: Record<string, { label: string; svg: React.ReactNode }> = {
  __TABLE_HEADER: {
    label: 'Headered',
    svg: (<><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="12" y1="3" x2="12" y2="21" /></>),
  },
  __TABLE_GRID: {
    label: 'Grid',
    svg: (<><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="15" y1="3" x2="15" y2="21" /></>),
  },
  __TABLE_MATCH: {
    label: 'Match List',
    svg: (<><line x1="4" y1="4" x2="4" y2="20" /><line x1="20" y1="4" x2="20" y2="20" /><line x1="7" y1="7" x2="17" y2="17" strokeDasharray="1 2" /><line x1="7" y1="17" x2="17" y2="7" strokeDasharray="1 2" /></>),
  },
  __TABLE_LIST: {
    label: 'Simple List',
    svg: (<><rect x="2" y="3" width="8" height="5" rx="1.2" /><rect x="14" y="3" width="8" height="5" rx="1.2" /><line x1="3" y1="12" x2="9" y2="12" /><line x1="3" y1="16" x2="9" y2="16" /><line x1="3" y1="20" x2="9" y2="20" /><line x1="15" y1="12" x2="21" y2="12" /><line x1="15" y1="16" x2="21" y2="16" /><line x1="15" y1="20" x2="21" y2="20" /></>),
  },
  __TABLE_MATRIX: {
    label: 'Matrix',
    svg: (<><path d="M7,3 L3,3 L3,21 L7,21" /><path d="M17,3 L21,3 L21,21 L17,21" /><circle cx="8" cy="8" r="1.2" fill="currentColor" /><circle cx="16" cy="8" r="1.2" fill="currentColor" /><circle cx="8" cy="16" r="1.2" fill="currentColor" /><circle cx="16" cy="16" r="1.2" fill="currentColor" /></>),
  },
  __TABLE_DETERMINANT: {
    label: 'Det',
    svg: (<><line x1="6" y1="3" x2="6" y2="21" /><line x1="18" y1="3" x2="18" y2="21" /><circle cx="10" cy="8" r="1.2" fill="currentColor" /><circle cx="14" cy="8" r="1.2" fill="currentColor" /><circle cx="10" cy="16" r="1.2" fill="currentColor" /><circle cx="14" cy="16" r="1.2" fill="currentColor" /></>),
  },
  __TABLE_EMPTY: {
    label: 'Empty Grid',
    svg: (<rect x="3" y="3" width="18" height="18" rx="2" />),
  },
};

function renderKeyLabel(label: string, display?: string, latex?: string): React.ReactNode {
  const table = latex ? TABLE_ICONS[latex] : undefined;
  if (table) {
    return (
      <span className="flex items-center justify-center gap-1.5 w-full font-semibold">
        <svg className="w-4 h-4 shrink-0 text-sky-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          {table.svg}
        </svg>
        <span className="text-[12px] truncate">{table.label}</span>
      </span>
    );
  }

  if (latex === '\\frac{?}{?}') {
    return (
      <span className="flex flex-col items-center justify-center gap-[2px] w-4 h-5 mx-auto" aria-hidden="true">
        <span className="w-2 h-1.5 border border-current rounded-[1px]" />
        <span className="w-3.5 h-[1.5px] bg-current" />
        <span className="w-2 h-1.5 border border-current rounded-[1px]" />
      </span>
    );
  }

  const text = display ?? label;
  if (text.includes('\\') || text.includes('^') || text.includes('_')) {
    const html = tryKatex(text, false);
    if (html) return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return text;
}

/* ── target tracking ─────────────────────────────────── */

interface PadTarget {
  el: HTMLTextAreaElement | HTMLInputElement;
  key?: string;
  label: string;
}

const isTargetField = (t: EventTarget | null): t is HTMLTextAreaElement | HTMLInputElement =>
  t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && !!t.dataset.sypadLabel);

const targetFromElement = (el: HTMLTextAreaElement | HTMLInputElement): PadTarget => ({
  el,
  key: el.dataset.sypadTarget,
  label: el.dataset.sypadLabel || el.getAttribute('aria-label') || el.placeholder || 'the selected box',
});

const HINTS: Record<MathContext, string> = {
  math: 'Maths — tap a key or type. Blue boxes are blanks: click one, then type.',
  chemistry: 'Chemistry — type the formula as plain text: H2O, Fe^3+, 2H2 + O2 -> 2H2O. Numbers become small automatically.',
  text: 'Plain words — type normally, spaces work here. Tap outside the grey words to go back to maths.',
};

const HELP_ROWS: { want: string; how: string; shows: string }[] = [
  { want: 'A fraction', how: 'Tap ▫/▫, fill top and bottom', shows: '\\frac{3}{4}' },
  { want: 'A power', how: 'Tap □ⁿ after the number', shows: 'x^{2}' },
  { want: 'A chemical formula', how: 'Chemistry → Formula, then type H2SO4', shows: '\\ce{H2SO4}' },
  { want: 'A reaction', how: 'Formula, then type 2H2 + O2 -> 2H2O', shows: '\\ce{2H2 + O2 -> 2H2O}' },
  { want: 'Heat or catalyst on the arrow', how: 'Chemistry → the arrow with boxes', shows: '\\xrightarrow{\\Delta}' },
  { want: 'Normal words inside maths', how: 'Tap Aa Words, then type', shows: '\\text{speed} = 5\\,\\text{m/s}' },
  { want: 'A table or match-the-columns', how: 'Open the Tables tab', shows: '\\begin{array}{|c|c|}\\hline A & B\\\\\\hline\\end{array}' },
  { want: 'Greek letters (α, θ, Δ)', how: 'Physics or Statistics tab', shows: '\\alpha,\\ \\theta,\\ \\Delta' },
];

/* ── component ───────────────────────────────────────── */

export default function MathKeyboard({ isOpen, onClose }: MathKeyboardProps) {
  const [expression, setExpression] = useState('');
  const [caretIndex, setCaretIndex] = useState<number | null>(null);
  const [topic, setTopic] = useState<TopicId>('algebra');
  const [mobilePane, setMobilePane] = useState<'digits' | 'topic'>('digits');
  const [abcMode, setAbcMode] = useState(false);
  const [tableMode, setTableMode] = useState(false);
  const [tableType, setTableType] = useState('header');
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [shiftOn, setShiftOn] = useState(false);
  const [target, setTarget] = useState<PadTarget | null>(null);
  const [notice, setNotice] = useState<null | { kind: 'slots' | 'invalid' | 'no-target'; action: 'insert' | 'copy'; count?: number }>(null);
  const [ceAnim, setCeAnim] = useState<{ status: 'idle' | 'typing' | 'converted'; text: string }>({ status: 'idle', text: '' });

  const targetRef = useRef<PadTarget | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const expressionInputRef = useRef<HTMLInputElement>(null);
  const lastGoodHtmlRef = useRef('');
  const coarsePointer = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  // Drag offset from the docked spot (null = docked at the bottom, like a phone keyboard).
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const offsetRef = useRef<{ x: number; y: number } | null>(null);
  offsetRef.current = offset;
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);

  /** Keeps the whole pad on screen for a given offset. */
  const clampOffset = useCallback((x: number, y: number) => {
    const panel = panelRef.current;
    if (!panel) return { x, y };
    const cur = offsetRef.current ?? { x: 0, y: 0 };
    const rect = panel.getBoundingClientRect();
    const dockedLeft = rect.left - cur.x;
    const dockedTop = rect.top - cur.y;
    const margin = 8;
    const minX = margin - dockedLeft;
    const maxX = window.innerWidth - margin - rect.width - dockedLeft;
    const minY = margin - dockedTop;
    const maxY = window.innerHeight - rect.height - dockedTop;
    return {
      x: Math.min(Math.max(x, Math.min(minX, 0)), Math.max(maxX, 0)),
      y: Math.min(Math.max(y, Math.min(minY, 0)), Math.max(maxY, 0)),
    };
  }, []);

  const onDragStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input, textarea')) return;
    const cur = offsetRef.current ?? { x: 0, y: 0 };
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, baseX: cur.x, baseY: cur.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    d.moved = true;
    setOffset(clampOffset(d.baseX + dx, d.baseY + dy));
  }, [clampOffset]);

  const onDragEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    // Dropped back near the dock → snap home.
    setOffset(o => (o && Math.abs(o.x) < 12 && Math.abs(o.y) < 12 ? null : o));
  }, []);

  // Keep a moved pad on screen when the window shrinks.
  useEffect(() => {
    if (!offset) return;
    const onResize = () => setOffset(o => (o ? clampOffset(o.x, o.y) : o));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [offset, clampOffset]);

  const context: MathContext = useMemo(
    () => contextAt(expression, caretIndex ?? expression.length),
    [expression, caretIndex]
  );

  // Initialize caret on open
  useEffect(() => {
    if (isOpen) {
      setCaretIndex(expression.length);
      setCeAnim({ status: 'idle', text: '' });
      if (!coarsePointer) setTimeout(() => expressionInputRef.current?.focus(), 60);
    } else {
      setShowHelp(false);
      setNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Chemistry demo: types "2H2 + O2 -> 2H2O", then shows it rendered, on a loop.
  useEffect(() => {
    if (ceAnim.status === 'idle') return;

    if (ceAnim.status === 'typing') {
      const fullText = '2H2 + O2 -> 2H2O';
      let index = 0;
      const interval = setInterval(() => {
        index++;
        setCeAnim(prev => {
          if (index > fullText.length) {
            clearInterval(interval);
            setTimeout(() => {
              setCeAnim(p => p.status === 'typing' ? { ...p, status: 'converted' } : p);
            }, 600);
            return prev;
          }
          return { ...prev, text: fullText.slice(0, index) };
        });
      }, 160);
      return () => clearInterval(interval);
    }

    if (ceAnim.status === 'converted') {
      const timeout = setTimeout(() => setCeAnim({ status: 'typing', text: '' }), 1800);
      return () => clearTimeout(timeout);
    }
  }, [ceAnim.status]);

  // Remember the last question/option box the teacher clicked into — that's where Insert goes.
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const t = e.target;
      if (!isTargetField(t) || panelRef.current?.contains(t)) return;
      const next = targetFromElement(t);
      targetRef.current = next;
      setTarget(next);
      setNotice(n => (n?.kind === 'no-target' ? null : n));
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, []);

  /** Scrolls the target box above the pad, the way a phone lifts the page over its keyboard. */
  const revealTarget = useCallback((smooth = true) => {
    const el = targetRef.current?.el;
    const panel = panelRef.current;
    if (!el || !el.isConnected || !panel) return;
    const rect = el.getBoundingClientRect();
    // A pad the teacher has moved away no longer covers the bottom of the page.
    const visibleBottom = window.innerHeight - (offsetRef.current ? 0 : panel.offsetHeight) - 20;
    if (rect.bottom > visibleBottom) {
      window.scrollBy({ top: rect.bottom - visibleBottom + Math.min(rect.height, 24), behavior: smooth ? 'smooth' : 'auto' });
    } else if (rect.top < 88) {
      window.scrollBy({ top: rect.top - 96, behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Reserve room under the page for the pad so nothing is hidden behind it.
  useLayoutEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const body = document.body;
    const previous = body.style.paddingBottom;
    const apply = () => {
      body.style.paddingBottom = `${panel.offsetHeight + 16}px`;
      document.documentElement.style.setProperty('--sypad-h', `${panel.offsetHeight}px`);
    };
    apply();
    body.dataset.sypadOpen = 'true';
    const ro = new ResizeObserver(apply);
    ro.observe(panel);
    requestAnimationFrame(() => revealTarget());
    return () => {
      ro.disconnect();
      body.style.paddingBottom = previous;
      delete body.dataset.sypadOpen;
      document.documentElement.style.removeProperty('--sypad-h');
    };
  }, [isOpen, revealTarget]);

  useEffect(() => {
    if (isOpen && target) requestAnimationFrame(() => revealTarget());
  }, [isOpen, target, revealTarget]);

  // Esc closes the pad
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[role="dialog"]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  /* ── editing primitives ── */

  const applyEdit = useCallback((next: string, selStart: number, selEnd: number = selStart) => {
    const inputEl = expressionInputRef.current;
    if (inputEl) {
      // Write the box first: React then sees no change to apply and leaves the caret where we put it,
      // even when keys arrive faster than re-renders.
      inputEl.value = next;
      if (!coarsePointer) inputEl.focus();
      inputEl.setSelectionRange(selStart, selEnd);
    }
    setExpression(next);
    setCaretIndex(selStart);
    setNotice(null);
  }, [coarsePointer]);

  const getSelection = useCallback((): [number, number] => {
    const inputEl = expressionInputRef.current;
    if (!inputEl) return [expression.length, expression.length];
    const start = inputEl.selectionStart ?? caretIndex ?? expression.length;
    const end = inputEl.selectionEnd ?? start;
    return [start, end];
  }, [expression, caretIndex]);

  const moveCaret = useCallback((dir: -1 | 1) => {
    const [start] = getSelection();
    let pos = start;
    if (dir < 0) {
      const m = /\\[a-zA-Z]+\s?$/.exec(expression.slice(0, start));
      pos = m ? start - m[0].length : Math.max(0, start - 1);
    } else {
      const m = /^\\[a-zA-Z]+\s?/.exec(expression.slice(start));
      pos = m ? start + m[0].length : Math.min(expression.length, start + 1);
    }
    applyEdit(expression, pos);
  }, [expression, getSelection, applyEdit]);

  const handleInsert = useCallback((latex: string) => {
    setCeAnim(latex === '\\ce{?}' ? { status: 'typing', text: '' } : { status: 'idle', text: '' });

    if (latex.startsWith('__TABLE_')) {
      const type = latex.replace('__TABLE_', '').replace(/_+$/, '').toLowerCase();
      setTableType(type);
      setTableMode(true);
      return;
    }
    if (latex === '__ABC__') { setAbcMode(v => !v); return; }
    if (latex === '__LEFT__') { moveCaret(-1); return; }
    if (latex === '__RIGHT__') { moveCaret(1); return; }

    const [start, end] = getSelection();

    if (latex === '__BACK__') {
      const res = smartBackspace(expression, start, end);
      applyEdit(res.expr, res.caret);
      return;
    }
    if (latex === '__CLEAR__') {
      applyEdit('', 0);
      return;
    }

    // Inside \ce{} and \text{} a space key means a real space, not a maths gap.
    const piece = latex === '\\,' && context !== 'math' ? ' ' : latex;
    const next = expression.slice(0, start) + piece + expression.slice(end);
    const placeholderOffset = piece.indexOf('?');
    if (placeholderOffset !== -1 && countEmptySlots(piece) > 0) {
      const slotAt = start + placeholderOffset;
      applyEdit(next, slotAt, slotAt + 1);
    } else {
      applyEdit(next, start + piece.length);
    }
  }, [expression, context, getSelection, applyEdit, moveCaret]);

  const handleWordsKey = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    handleInsert('\\text{?}');
  }, [handleInsert]);

  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const elements = Array.from(container.querySelectorAll('.math-placeholder, .math-token'));
    const inputEl = expressionInputRef.current;
    const place = (s: number, en = s) => {
      setCaretIndex(s);
      if (inputEl) {
        if (!coarsePointer) inputEl.focus();
        inputEl.setSelectionRange(s, en);
      }
    };
    if (elements.length === 0) {
      place(expression.length);
      return;
    }

    const firstRect = elements[0].getBoundingClientRect();
    const lastRect = elements[elements.length - 1].getBoundingClientRect();
    if (e.clientX < firstRect.left - 10) { place(0); return; }
    if (e.clientX > lastRect.right + 10) { place(expression.length); return; }

    let closestEl: Element | null = null;
    let minDistance = Infinity;
    for (const el of elements) {
      const r = el.getBoundingClientRect();
      const dist = (e.clientX - (r.left + r.width / 2)) ** 2 + (e.clientY - (r.top + r.height / 2)) ** 2;
      if (dist < minDistance) {
        minDistance = dist;
        closestEl = el;
      }
    }
    if (!closestEl) return;

    const idxClass = Array.from(closestEl.classList).find(c => c.startsWith('token-idx-'));
    if (!idxClass) return;
    const rawIdx = parseInt(idxClass.replace('token-idx-', ''), 10);
    if (closestEl.classList.contains('math-placeholder')) {
      place(rawIdx, rawIdx + 1);
    } else {
      const r = closestEl.getBoundingClientRect();
      place(e.clientX - r.left < r.width / 2 ? rawIdx : rawIdx + 1);
    }
  }, [expression, coarsePointer]);

  /* ── leaving the pad: Copy / Insert ── */

  const writeIntoTarget = useCallback((text: string): boolean => {
    const t = targetRef.current;
    if (t?.el && t.el.isConnected) {
      const ta = t.el;
      const start = ta.selectionStart ?? ta.value.length;
      const end = ta.selectionEnd ?? start;
      const setter = Object.getOwnPropertyDescriptor(
        ta instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(ta, ta.value.slice(0, start) + text + ta.value.slice(end));
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      // Caret right after the insert, before the box re-renders, so the next insert follows this one.
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
      setTimeout(() => revealTarget(), 0);
      return true;
    }
    if (t?.key) {
      window.dispatchEvent(new CustomEvent(SYPAD_INSERT_EVENT, { detail: { target: t.key, text } }));
      return true;
    }
    return false;
  }, [revealTarget]);

  const commit = useCallback(async (action: 'insert' | 'copy', force = false) => {
    const current = expressionInputRef.current?.value ?? expression;
    if (!current.trim()) return;

    if (action === 'insert' && !targetRef.current) {
      setNotice({ kind: 'no-target', action });
      return;
    }

    const slots = countEmptySlots(current);
    if (slots > 0 && !force) {
      setNotice({ kind: 'slots', action, count: slots });
      const at = firstEmptySlot(current);
      if (at !== -1) {
        setCaretIndex(at);
        expressionInputRef.current?.setSelectionRange(at, at + 1);
      }
      return;
    }

    const latex = finalizeLatex(force ? clearEmptySlots(current) : current);
    if (!latex) return;
    if (!force && !tryKatex(latex)) {
      setNotice({ kind: 'invalid', action });
      return;
    }

    const text = `$${latex}$`;
    if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        toast.error('Could not copy. Please select the code and copy it by hand.');
      }
      setNotice(null);
      return;
    }

    if (!writeIntoTarget(text)) {
      setNotice({ kind: 'no-target', action });
      return;
    }
    setInserted(true);
    setTimeout(() => setInserted(false), 1400);
    setNotice(null);
    if (expressionInputRef.current) expressionInputRef.current.value = '';
    setExpression('');
    setCaretIndex(0);
  }, [expression, writeIntoTarget]);

  /* ── preview ── */

  const preview = useMemo(() => {
    if (!expression.trim()) {
      lastGoodHtmlRef.current = '';
      return { html: '', stale: false };
    }
    // Strict first; then draw half-typed commands as grey text; then without the caret.
    const html =
      tryKatex(prepareExpressionForKaTeX(expression, caretIndex)) ??
      tryKatex(prepareExpressionForKaTeX(expression, caretIndex, true)) ??
      tryKatex(prepareExpressionForKaTeX(expression, null, true));
    if (html) {
      lastGoodHtmlRef.current = html;
      return { html, stale: false };
    }
    // Mid-edit and not renderable yet: keep showing the last good version, never raw code.
    return { html: lastGoodHtmlRef.current.replace(/math-cursor/g, 'math-cursor-off'), stale: true };
  }, [expression, caretIndex]);

  const topicData = TOPICS.find(t => t.id === topic) ?? TOPICS[0];
  const slotsLeft = countEmptySlots(expression);

  if (!isOpen) return null;

  /* ── key styles (iOS light keyboard) ── */
  const KEY = 'min-w-0 h-[34px] sm:h-9 rounded-[8px] text-[15px] leading-none select-none transition-[background-color,transform] duration-75 motion-safe:active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60';
  const LETTER = `${KEY} bg-white text-slate-900 shadow-[0_1px_0_rgba(15,23,42,0.28)] hover:bg-slate-50 active:bg-slate-200`;
  const FUNC = `${KEY} bg-[#BCC2CB] text-slate-800 font-semibold shadow-[0_1px_0_rgba(15,23,42,0.28)] hover:bg-[#B0B6C0] active:bg-white`;
  const ACCENT = `${KEY} bg-sky-50 text-sky-800 font-semibold ring-1 ring-inset ring-sky-600/25 shadow-[0_1px_0_rgba(15,23,42,0.18)] hover:bg-sky-100 active:bg-sky-200`;

  const renderKey = (k: MathKey, idx: number, extra = '') => {
    const cls = k.className === 'action' ? FUNC
      : k.className === 'highlight' ? ACCENT
        : LETTER;
    return (
      <button
        key={idx}
        type="button"
        title={k.hint ?? k.label}
        aria-label={k.hint ?? k.label}
        onClick={() => {
          if (k.latex === '__ABC__') setAbcMode(true);
          else handleInsert(k.latex);
        }}
        className={`${cls} ${k.className === 'space-key' ? 'flex-[3]' : 'flex-1'} ${k.className === 'italic' ? 'italic font-serif text-[17px]' : ''} ${extra}`}
      >
        {k.className === 'space-key' ? <span className="text-[13px] text-slate-500">space</span> : renderKeyLabel(k.label, k.display, k.latex)}
      </button>
    );
  };

  const hintText = notice
    ? null
    : !expression
      ? `Build your formula here, then press Insert to put it into ${target ? target.label : 'a question'}.`
      : slotsLeft > 0 && context === 'math'
        ? `${slotsLeft} blue ${slotsLeft === 1 ? 'box is' : 'boxes are'} still empty — click one, then type.`
        : HINTS[context];

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Sy Pad — maths and chemistry keyboard"
      className="sy-pad-container fixed inset-x-0 bottom-0 z-[60] mx-auto w-full sm:bottom-3 sm:w-[min(780px,calc(100vw-32px))] rounded-t-[22px] sm:rounded-[22px] bg-[#E4E7EC]/95 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-[0_-16px_48px_-20px_rgba(15,23,42,0.45)] select-none animate-in slide-in-from-bottom-6 fade-in duration-200"
      style={{
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        ...(offset ? { translate: `${offset.x}px ${offset.y}px` } : null),
      }}
      onMouseDown={e => {
        if (!(e.target as HTMLElement).closest('input, textarea')) e.preventDefault();
      }}
    >
      <style>{`
        .sy-pad-container .math-placeholder {
          background-color: #e0f2fe !important;
          color: #0369a1 !important;
          border-radius: 5px;
          padding: 0 5px;
          margin: 0 2px;
          cursor: pointer;
          font-weight: 700;
          display: inline-block;
          border: 1.5px dashed #7dd3fc;
        }
        .sy-pad-container .math-token { cursor: text; display: inline-block; border-radius: 3px; }
        .sy-pad-container .math-token:hover { background-color: rgba(14,165,233,0.12) !important; }
        .sy-pad-container .math-cursor {
          border-left: 2px solid #0284c7;
          margin: 0 -1px;
          animation: sypad-blink 1s step-end infinite;
          display: inline-block;
          height: 1.15em;
          vertical-align: middle;
        }
        @keyframes sypad-blink { 50% { border-color: transparent } }
        .sy-pad-container .katex-display { margin: 0 !important; text-align: left !important; }
        .sy-pad-container .katex-display > .katex { text-align: left !important; }
      `}</style>

      {/* ── Accessory bar: where it goes, help, done — also the drag handle ── */}
      <div
        className="relative flex touch-none items-center gap-2 px-3 pt-3.5 pb-2 sm:px-4 cursor-grab active:cursor-grabbing"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onDoubleClick={e => {
          if (!(e.target as HTMLElement).closest('button')) setOffset(null);
        }}
        title={offset ? 'Drag to move · double-click to dock' : 'Drag to move'}
      >
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-400/60" />
        <button
          type="button"
          onClick={() => revealTarget()}
          className={`flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] transition-colors ${target
            ? 'bg-white/70 text-slate-700 hover:bg-white'
            : 'bg-amber-100 text-amber-900'
            }`}
          title={target ? 'Show this box' : undefined}
        >
          <CornerDownLeft className={`h-3.5 w-3.5 shrink-0 ${target ? 'text-sky-600' : 'text-amber-600'}`} />
          {target ? (
            <span className="truncate">Goes into <strong className="font-semibold text-slate-900">{target.label}</strong></span>
          ) : (
            <span className="truncate">Click a question or option box first</span>
          )}
        </button>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowHelp(v => !v)}
            aria-pressed={showHelp}
            className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium transition-colors ${showHelp ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-white/70'}`}
          >
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">How to</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-full px-3 text-[15px] font-semibold text-sky-700 hover:bg-white/70"
          >
            Done
          </button>
        </div>
      </div>

      {/* ── Display: rendered formula, code line, insert ── */}
      <div className="mx-3 sm:mx-4 rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/[0.06]">
        <div className="flex items-stretch gap-2 p-1.5 pl-3">
          <div
            className="relative flex min-h-[48px] flex-1 cursor-text items-center overflow-x-auto overflow-y-hidden text-[19px] text-slate-900"
            onClick={handlePreviewClick}
            title="Click a blue box or a symbol to edit there"
          >
            {preview.html ? (
              <div
                className={`transition-opacity ${preview.stale ? 'opacity-50' : ''}`}
                dangerouslySetInnerHTML={{ __html: preview.html }}
              />
            ) : (
              <span className="text-[15px] text-slate-400">Your formula appears here</span>
            )}
            {preview.stale && (
              <span className="ml-3 shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">keep typing…</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => commit('insert')}
            disabled={!expression.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-xl bg-primary px-4 h-11 text-[15px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-10px_rgba(2,132,199,0.9)] transition-[background-color,transform] hover:bg-[hsl(200,95%,30%)] motion-safe:active:scale-[0.97] disabled:bg-slate-300 disabled:shadow-none"
          >
            {inserted ? <Check className="h-4 w-4" /> : <CornerDownLeft className="h-4 w-4" />}
            {inserted ? 'Added' : 'Insert'}
          </button>
        </div>
        <div className="flex items-center gap-2 border-t border-slate-100 px-3 py-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Code</span>
          <input
            ref={expressionInputRef}
            type="text"
            inputMode={coarsePointer ? 'none' : 'text'}
            spellCheck={false}
            autoComplete="off"
            aria-label="Formula code"
            value={expression}
            onChange={e => {
              setExpression(e.target.value);
              setCaretIndex(e.target.selectionStart);
              setNotice(null);
              setCeAnim({ status: 'idle', text: '' });
            }}
            onKeyDown={e => {
              // Read the box itself, not state: state lags a keystroke behind fast typing.
              const el = e.currentTarget;
              const cur = el.value;
              const start = el.selectionStart ?? cur.length;
              const end = el.selectionEnd ?? start;
              if (e.key === 'Enter') {
                e.preventDefault();
                commit('insert');
              } else if (e.key === ' ') {
                e.preventDefault();
                const gap = contextAt(cur, start) === 'math' ? '\\,' : ' ';
                applyEdit(cur.slice(0, start) + gap + cur.slice(end), start + gap.length);
              } else if (e.key === 'Backspace') {
                e.preventDefault();
                const res = smartBackspace(cur, start, end);
                applyEdit(res.expr, res.caret);
              } else if (e.key === '{') {
                // Keep braces paired so a half-typed group never breaks the formula
                e.preventDefault();
                const inner = cur.slice(start, end);
                applyEdit(cur.slice(0, start) + '{' + inner + '}' + cur.slice(end), start + 1, start + 1 + inner.length);
              } else if (e.key === '}' && start === end && cur[start] === '}') {
                e.preventDefault();
                applyEdit(cur, start + 1);
              }
            }}
            onSelect={e => setCaretIndex(e.currentTarget.selectionStart)}
            placeholder="or type here, e.g. \frac{1}{2}"
            className="h-7 min-w-0 flex-1 select-text bg-transparent font-mono text-[13px] text-slate-600 placeholder:text-slate-300 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => commit('copy')}
            disabled={!expression.trim()}
            className="flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
            title="Copy the formula with $…$ to paste anywhere"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* ── Hint / notice line ── */}
      <div className="mx-3 sm:mx-4 mt-1.5 flex min-h-[26px] items-center gap-2 px-1 text-[12.5px] leading-snug">
        {notice ? (
          <div className="flex w-full items-center gap-2 text-amber-900">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1 truncate">
              {notice.kind === 'slots' && `${notice.count} blue ${notice.count === 1 ? 'box is' : 'boxes are'} still empty.`}
              {notice.kind === 'invalid' && 'This formula looks unfinished.'}
              {notice.kind === 'no-target' && 'Click inside a question or option box first, then press Insert.'}
            </span>
            {notice.kind !== 'no-target' && (
              <button
                type="button"
                onClick={() => commit(notice.action, true)}
                className="shrink-0 rounded-full bg-white/80 px-2.5 py-0.5 font-semibold text-slate-800 hover:bg-white"
              >
                {notice.action === 'copy' ? 'Copy anyway' : 'Insert anyway'}
              </button>
            )}
            <button type="button" onClick={() => setNotice(null)} className="shrink-0 rounded-full p-0.5 text-amber-700 hover:bg-white/60" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : ceAnim.status !== 'idle' ? (
          <div className="flex min-w-0 items-center gap-2 text-slate-600">
            <span className="shrink-0">Now type the formula, like</span>
            <span className="inline-flex h-6 min-w-[140px] items-center rounded-md bg-white/80 px-2 font-mono text-[12px] text-slate-700 ring-1 ring-slate-900/5">
              {ceAnim.status === 'typing' ? (
                <>{ceAnim.text}<span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-slate-500" /></>
              ) : (
                <span className="font-sans text-[14px]" dangerouslySetInnerHTML={{ __html: renderMhchemToHtml('2H2 + O2 -> 2H2O') }} />
              )}
            </span>
          </div>
        ) : (
          <span className={`truncate ${context === 'chemistry' ? 'text-emerald-800' : context === 'text' ? 'text-violet-800' : 'text-slate-600'}`}>
            {context !== 'math' && (
              <span className={`mr-1.5 rounded-full px-1.5 py-px text-[10.5px] font-bold uppercase tracking-wide ${context === 'chemistry' ? 'bg-emerald-100' : 'bg-violet-100'}`}>
                {context === 'chemistry' ? 'Chemistry' : 'Words'}
              </span>
            )}
            {hintText}
          </span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="mt-1 flex items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto rounded-[10px] bg-slate-900/[0.07] p-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => { setMobilePane('digits'); setAbcMode(false); setTableMode(false); setShowHelp(false); }}
            className={`sm:hidden h-7 shrink-0 rounded-[8px] px-2.5 text-[13px] font-semibold transition-all ${mobilePane === 'digits' && !abcMode && !tableMode ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.15)]' : 'text-slate-600'}`}
          >
            123
          </button>
          {TOPICS.map(t => {
            const active = topic === t.id && (mobilePane === 'topic' || typeof window === 'undefined' || window.innerWidth >= 640);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTopic(t.id);
                  setMobilePane('topic');
                  setAbcMode(false);
                  setTableMode(false);
                  setShowHelp(false);
                }}
                className={`h-7 shrink-0 whitespace-nowrap rounded-[8px] px-2.5 text-[13px] font-semibold transition-all ${active && !abcMode ? 'bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.15)]' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleWordsKey}
          className={`${ACCENT} h-8 sm:h-8 shrink-0 px-2.5 text-[13px] !bg-violet-50 !text-violet-800 !ring-violet-600/25 hover:!bg-violet-100 flex items-center gap-1`}
          title="Normal words inside a formula — e.g. speed = 5 m/s"
        >
          <Type className="h-3.5 w-3.5" /> Words
        </button>
      </div>

      {/* ── Keys ── */}
      <div className="px-2 pt-2 sm:px-3">
        {showHelp ? (
          <div className="max-h-[172px] overflow-y-auto rounded-2xl bg-white p-1 ring-1 ring-slate-900/[0.06] select-text">
            <table className="w-full text-left text-[13px]">
              <tbody>
                {HELP_ROWS.map(r => (
                  <tr key={r.want} className="border-b border-slate-100 last:border-0">
                    <td className="px-2.5 py-1.5 font-semibold text-slate-800">{r.want}</td>
                    <td className="px-2.5 py-1.5 text-slate-600">{r.how}</td>
                    <td className="px-2.5 py-1.5 text-right text-[15px]" dangerouslySetInnerHTML={{ __html: tryKatex(r.shows, false) ?? '' }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tableMode ? (
          <TableEditor
            initialType={tableType}
            onInsert={latex => { handleInsert(latex); setTableMode(false); }}
            onClose={() => setTableMode(false)}
          />
        ) : abcMode ? (
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              {['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'].map(ch => (
                <button key={ch} type="button" onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)} className={`${LETTER} flex-1`}>
                  {shiftOn ? ch.toUpperCase() : ch}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 px-[4.5%]">
              {['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'].map(ch => (
                <button key={ch} type="button" onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)} className={`${LETTER} flex-1`}>
                  {shiftOn ? ch.toUpperCase() : ch}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setShiftOn(s => !s)}
                aria-pressed={shiftOn}
                className={`${shiftOn ? LETTER : FUNC} w-[12%] text-lg`}
                title="Capital letters"
              >
                ⇧
              </button>
              {['z', 'x', 'c', 'v', 'b', 'n', 'm', ','].map(ch => (
                <button key={ch} type="button" onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)} className={`${LETTER} flex-1`}>
                  {shiftOn ? ch.toUpperCase() : ch}
                </button>
              ))}
              <button type="button" onClick={() => handleInsert('__BACK__')} className={`${FUNC} w-[12%] flex items-center justify-center`} title="Delete">
                <Delete className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setAbcMode(false)} className={`${FUNC} w-[14%] text-[13px]`}>123</button>
              <button type="button" onClick={() => handleInsert('\\quad ')} className={`${FUNC} w-[12%]`} title="Wide gap (tab)">⇥</button>
              <button type="button" onClick={() => handleInsert('\\,')} className={`${LETTER} flex-1 text-[13px] text-slate-500`}>space</button>
              <button type="button" onClick={() => handleInsert('.')} className={`${LETTER} w-[10%]`}>.</button>
              <button type="button" onClick={() => handleInsert('\n')} className={`${FUNC} w-[14%]`} title="New line">↵</button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {/* Digits & structures */}
            <div className={`${mobilePane === 'digits' ? 'flex' : 'hidden'} sm:flex min-w-0 flex-[10] flex-col gap-1.5`}>
              {FIXED_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-1.5">
                  {row.map((k, ki) => renderKey(k, ki))}
                </div>
              ))}
            </div>

            {/* Topic symbols */}
            <div className={`${mobilePane === 'topic' ? 'flex' : 'hidden'} sm:flex min-w-0 flex-[10] sm:flex-[4.2] flex-col gap-1.5`}>
              {topicData.keys.map((row, ri) => (
                <div key={ri} className="flex gap-1.5">
                  {row.map((k, ki) => renderKey(k, ki, topic === 'tables' ? '!text-[12px]' : '!text-[14px]'))}
                </div>
              ))}
            </div>

            {/* Editing keys */}
            <div className="flex w-[52px] sm:w-[58px] shrink-0 flex-col gap-1.5">
              <button type="button" onClick={() => handleInsert('__BACK__')} className={`${FUNC} flex items-center justify-center`} title="Delete (removes a whole symbol at a time)" aria-label="Delete">
                <Delete className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => handleInsert('__LEFT__')} className={`${FUNC} flex items-center justify-center`} title="Move left" aria-label="Move cursor left">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => handleInsert('__RIGHT__')} className={`${FUNC} flex items-center justify-center`} title="Move right" aria-label="Move cursor right">
                <ChevronRight className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => handleInsert('__CLEAR__')} className={`${FUNC} text-[12px]`} title="Clear the whole formula">
                Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
