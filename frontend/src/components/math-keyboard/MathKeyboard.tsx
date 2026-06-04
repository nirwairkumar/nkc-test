import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Check, Trash2 } from 'lucide-react';
import katex from 'katex';
import { FIXED_ROWS, ABC_ROWS, TOPICS, type TopicId, type MathKey } from './keys';

interface MathKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── helpers ─────────────────────────────────────────── */

function prepareExpressionForKaTeX(expr: string): string {
  let result = '';
  let placeholderCount = 0;
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    if (char === '?') {
      placeholderCount++;
      result += `\\htmlClass{math-placeholder placeholder-idx-${i} placeholder-count-${placeholderCount}}{\\color{#1e40af}{?}}`;
    } else {
      result += char;
    }
  }
  return result;
}

function renderKatex(expr: string): string {
  if (!expr.trim()) return '<span style="color:#94a3b8">Preview</span>';
  try {
    const parsedExpr = prepareExpressionForKaTeX(expr);
    return katex.renderToString(parsedExpr, { throwOnError: false, displayMode: true, trust: true });
  } catch {
    return '<span style="color:#ef4444">Invalid expression</span>';
  }
}

function findSubstringNearCursor(text: string, sub: string, cursor: number): number {
  if (!sub) return -1;
  let bestIdx = -1;
  let minDiff = Infinity;
  let idx = text.indexOf(sub);
  while (idx !== -1) {
    const diff = Math.abs(idx - cursor);
    if (diff < minDiff) {
      minDiff = diff;
      bestIdx = idx;
    }
    idx = text.indexOf(sub, idx + 1);
  }
  return bestIdx;
}

function insertTextAtCursor(el: HTMLTextAreaElement | HTMLInputElement, text: string) {
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  const nativeSetter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  )?.set;
  nativeSetter?.call(el, before + text + after);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Highlight the first '?' in the inserted text
  const firstPlaceholderOffset = text.indexOf('?');
  if (firstPlaceholderOffset !== -1) {
    const targetPos = start + firstPlaceholderOffset;
    el.setSelectionRange(targetPos, targetPos + 1);
  } else {
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  }
  el.focus();
}

/* ── component ───────────────────────────────────────── */

export default function MathKeyboard({ isOpen, onClose }: MathKeyboardProps) {
  const [expression, setExpression] = useState('');
  const [topic, setTopic] = useState<TopicId>('algebra');
  const [abcMode, setAbcMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shiftOn, setShiftOn] = useState(false);
  const lastTextareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const expressionInputRef = useRef<HTMLInputElement>(null);

  // Track last focused textarea (before keyboard gets focus)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: FocusEvent) => {
      const t = e.target;
      if (t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && t.type === 'text')) {
        if (!panelRef.current?.contains(t)) {
          lastTextareaRef.current = t;
        }
      }
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, [isOpen]);

  const handleInsert = useCallback((latex: string) => {
    if (latex === '__ABC__') { setAbcMode(v => !v); return; }
    if (latex === '__BACK__') {
      const inputEl = expressionInputRef.current;
      if (inputEl) {
        const start = inputEl.selectionStart ?? inputEl.value.length;
        if (start > 0) {
          const before = expression.slice(0, start - 1);
          const after = expression.slice(inputEl.selectionEnd ?? start);
          setExpression(before + after);
          setTimeout(() => {
            inputEl.focus();
            inputEl.setSelectionRange(start - 1, start - 1);
          }, 0);
        }
      } else {
        setExpression(p => p.slice(0, -1));
      }

      // Also backspace in textarea if focused
      const ta = lastTextareaRef.current;
      if (ta && document.body.contains(ta)) {
        const s = ta.selectionStart ?? ta.value.length;
        if (s > 0) {
          const before = ta.value.slice(0, s - 1);
          const after = ta.value.slice(ta.selectionEnd ?? s);
          const setter = Object.getOwnPropertyDescriptor(
            ta instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
          )?.set;
          setter?.call(ta, before + after);
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.setSelectionRange(s - 1, s - 1);
        }
      }
      return;
    }
    
    if (latex === '__CLEAR__') {
      setExpression('');
      const ta = lastTextareaRef.current;
      if (ta && document.body.contains(ta)) {
        ta.focus();
      }
      return;
    }
    
    // Insert into keyboard's internal expression state at cursor
    const inputEl = expressionInputRef.current;
    let newExpr = expression;
    let nextSelectionStart = expression.length;
    let nextSelectionEnd = expression.length;
    
    if (inputEl) {
      const start = inputEl.selectionStart ?? inputEl.value.length;
      const end = inputEl.selectionEnd ?? start;
      const before = expression.slice(0, start);
      const after = expression.slice(end);
      newExpr = before + latex + after;
      setExpression(newExpr);
      
      const placeholderOffset = latex.indexOf('?');
      if (placeholderOffset !== -1) {
        nextSelectionStart = start + placeholderOffset;
        nextSelectionEnd = nextSelectionStart + 1;
      } else {
        nextSelectionStart = start + latex.length;
        nextSelectionEnd = nextSelectionStart;
      }
      
      setTimeout(() => {
        inputEl.focus();
        inputEl.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }, 0);
    } else {
      newExpr = expression + latex;
      setExpression(newExpr);
    }
    
    // Insert into tracked active textarea
    const ta = lastTextareaRef.current;
    if (ta && document.body.contains(ta)) {
      insertTextAtCursor(ta, latex);
    }
  }, [expression]);

  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const placeholderEl = target.closest('.math-placeholder');
    if (placeholderEl) {
      const classList = Array.from(placeholderEl.classList);
      const idxClass = classList.find(c => c.startsWith('placeholder-idx-'));
      
      if (idxClass) {
        const rawIdx = parseInt(idxClass.replace('placeholder-idx-', ''), 10);
        
        // 1. Focus internal expression input and select the placeholder
        const inputEl = expressionInputRef.current;
        if (inputEl) {
          inputEl.focus();
          inputEl.setSelectionRange(rawIdx, rawIdx + 1);
        }
        
        // 2. Select corresponding placeholder in active textarea
        const ta = lastTextareaRef.current;
        if (ta && document.body.contains(ta)) {
          const cursor = ta.selectionStart ?? ta.value.length;
          const subStart = findSubstringNearCursor(ta.value, expression, cursor);
          if (subStart !== -1) {
            const targetPos = subStart + rawIdx;
            ta.focus();
            ta.setSelectionRange(targetPos, targetPos + 1);
          }
        }
      }
    }
  }, [expression]);

  const handleCopy = useCallback(async () => {
    const raw = expression ? `$${expression}$` : '';
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [expression]);

  const topicData = TOPICS.find(t => t.id === topic) ?? TOPICS[0];

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="fixed bottom-4 left-14 z-[9999] w-[740px] max-w-[95vw] rounded-2xl shadow-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-slate-100 overflow-hidden select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onMouseDown={e => e.preventDefault()}
    >
      <style>{`
        .math-placeholder {
          background-color: #dbeafe !important;
          color: #1e40af !important;
          border-radius: 4px;
          padding: 0px 5px;
          margin: 0px 2px;
          cursor: pointer;
          font-weight: bold;
          display: inline-block;
          transition: all 0.2s;
          border: 1px dashed #93c5fd;
        }
        .math-placeholder:hover {
          background-color: #bfdbfe !important;
          border-color: #3b82f6;
        }
      `}</style>

      {/* ── Header ─────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-blue-100 to-blue-50 border-b border-blue-200">
        <span className="text-xs font-bold text-blue-800 tracking-wide uppercase">Math Keyboard</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-blue-200/60 text-blue-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Preview & Input Area ── */}
      <div className="px-3 py-2 border-b border-blue-100 space-y-2 bg-white/60">
        {/* Rendered KaTeX Output */}
        <div
          className="min-h-[50px] flex items-center px-3 py-1.5 rounded-lg bg-white border border-blue-100 overflow-x-auto text-lg cursor-pointer"
          onClick={handlePreviewClick}
          dangerouslySetInnerHTML={{ __html: renderKatex(expression) }}
          title="Click on any blue '?' box to edit that slot"
        />
        
        {/* Raw LaTeX Input */}
        <div className="flex items-center gap-2">
          <input
            ref={expressionInputRef}
            type="text"
            value={expression}
            onChange={e => {
              setExpression(e.target.value);
            }}
            placeholder="Type or use keys below..."
            className="flex-1 h-9 px-3 rounded-lg border border-blue-200 text-sm font-mono text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleCopy}
            disabled={!expression}
            className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            title="Copy raw LaTeX (wrapped in $...$)"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => {
              setExpression('');
              const ta = lastTextareaRef.current;
              if (ta && document.body.contains(ta)) {
                ta.focus();
              }
            }}
            className="shrink-0 p-2 rounded-lg text-xs text-red-500 hover:bg-red-50 transition-colors"
            title="Clear expression"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Raw format display ── */}
      {expression && (
        <div className="px-4 py-1 bg-slate-50 border-b border-blue-100">
          <code className="text-[11px] text-slate-500 font-mono break-all">
            ${expression}$
          </code>
        </div>
      )}

      {/* ── Topic tabs ──────── */}
      <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-blue-100 bg-blue-50/50">
        {TOPICS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTopic(t.id); setAbcMode(false); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
              topic === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-700 hover:bg-blue-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Keyboard Grid ──── */}
      <div className="p-2">
        {abcMode ? (
          /* ABC mode */
          <div className="space-y-1">
            {ABC_ROWS.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1">
                {ri === 2 && (
                  <button
                    onClick={() => setShiftOn(s => !s)}
                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                      shiftOn ? 'bg-blue-600 text-white' : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
                    }`}
                  >⇧</button>
                )}
                {row.map(ch => (
                  <button
                    key={ch}
                    onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)}
                    className="w-10 h-10 rounded-lg bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
                  >{shiftOn ? ch.toUpperCase() : ch}</button>
                ))}
                {ri === 2 && (
                  <button onClick={() => handleInsert('__BACK__')} className="w-10 h-10 rounded-lg bg-white border border-blue-200 text-blue-600 hover:bg-red-50 active:bg-red-100 transition-all text-lg">⌫</button>
                )}
              </div>
            ))}
            <div className="flex justify-center gap-1">
              <button onClick={() => setAbcMode(false)} className="px-4 h-10 rounded-lg bg-blue-200 text-blue-800 font-bold text-xs hover:bg-blue-300 transition-all">123</button>
              <button onClick={() => handleInsert(' ')} className="flex-1 max-w-[200px] h-10 rounded-lg bg-white border border-blue-200 text-blue-400 text-xs hover:bg-blue-50 transition-all">space</button>
              <button onClick={() => handleInsert('__BACK__')} className="px-4 h-10 rounded-lg bg-blue-200 text-blue-800 font-bold text-xs hover:bg-blue-300 transition-all">⌫</button>
            </div>
          </div>
        ) : (
          /* Math mode */
          <div className="flex gap-1">
            {/* Fixed section */}
            <div className="flex-1 space-y-1">
              {FIXED_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((k, ki) => (
                    <button
                      key={ki}
                      onClick={() => {
                        if (k.latex === '__ABC__') setAbcMode(true);
                        else if (k.className !== 'empty') handleInsert(k.latex);
                      }}
                      disabled={k.className === 'empty'}
                      className={`flex-1 h-10 rounded-lg text-sm transition-all ${
                        k.className === 'action'
                          ? 'bg-blue-200 text-blue-800 font-bold text-xs hover:bg-blue-300'
                          : k.className === 'empty'
                          ? 'bg-transparent cursor-default'
                          : k.className === 'italic'
                          ? 'bg-white border border-blue-200 text-blue-900 italic font-serif hover:bg-blue-50 active:bg-blue-100'
                          : 'bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100'
                      }`}
                    >
                      {k.display ?? k.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Dynamic topic section */}
            <div className="w-[200px] shrink-0 space-y-1">
              {topicData.keys.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((k, ki) => (
                    <button
                      key={ki}
                      onClick={() => handleInsert(k.latex)}
                      className={`flex-1 h-10 rounded-lg text-xs transition-all bg-blue-50 border border-blue-200 text-blue-800 font-semibold hover:bg-blue-100 active:bg-blue-200 ${
                        k.className === 'italic' ? 'italic font-serif text-sm' : ''
                      }`}
                      title={k.latex}
                    >
                      {k.display ?? k.label}
                    </button>
                  ))}
                </div>
              ))}
              {/* Navigation row */}
              <div className="flex gap-1">
                <button onClick={() => handleInsert('\\leftarrow ')} className="flex-1 h-10 rounded-lg bg-blue-300/60 border border-blue-300 text-blue-800 font-bold hover:bg-blue-300 transition-all text-lg">◀</button>
                <button onClick={() => handleInsert('\\rightarrow ')} className="flex-1 h-10 rounded-lg bg-blue-300/60 border border-blue-300 text-blue-800 font-bold hover:bg-blue-300 transition-all text-lg">▶</button>
                <button onClick={() => handleInsert('__BACK__')} className="flex-1 h-10 rounded-lg bg-red-100 border border-red-200 text-red-600 font-bold hover:bg-red-200 transition-all text-lg">⌫</button>
                <button onClick={() => handleInsert('__CLEAR__')} className="flex-1 h-10 rounded-lg bg-blue-300/60 border border-blue-300 text-blue-800 font-bold hover:bg-blue-300 transition-all text-xs">CLR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
