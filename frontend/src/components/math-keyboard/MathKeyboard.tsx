import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Check, Trash2 } from 'lucide-react';
import katex from 'katex';
import { FIXED_ROWS, TOPICS, type TopicId, type MathKey } from './keys';

interface MathKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── helpers ─────────────────────────────────────────── */

function prepareExpressionForKaTeX(expr: string, caretIndex: number | null): string {
  let result = '';
  let i = 0;
  
  const insertCursorIfNeeded = (idx: number) => {
    if (caretIndex !== null && idx === caretIndex) {
      result += '\\htmlClass{math-cursor}{}';
    }
  };
  
  while (i < expr.length) {
    // Insert cursor before processing the character at index i
    insertCursorIfNeeded(i);
    
    const char = expr[i];
    
    // 1. Handle escape sequences (control words like \frac, \alpha, \begin, etc.)
    if (char === '\\') {
      const commandStartIdx = i;
      i++;
      
      // Consume command name
      let cmdName = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        cmdName += expr[i];
        i++;
      }
      
      if (cmdName === '') {
        // Escaped symbol like \\, \&, \{, \}, \_, \%, \#, \$
        const nextChar = expr[i] || '';
        result += '\\' + nextChar;
        i++;
        continue;
      }
      
      // If it's a begin/end/ce command, skip wrapping the command and its environment arguments
      if (cmdName === 'begin' || cmdName === 'end' || cmdName === 'ce') {
        result += '\\' + cmdName;
        let envName = '';
        // Consume environment/ce braces
        while (i < expr.length && expr[i] !== '{') {
          insertCursorIfNeeded(i);
          result += expr[i];
          i++;
        }
        if (i < expr.length && expr[i] === '{') {
          insertCursorIfNeeded(i);
          result += '{';
          i++;
          let braceCount = 1;
          while (i < expr.length && braceCount > 0) {
            insertCursorIfNeeded(i);
            if (expr[i] === '{') braceCount++;
            if (expr[i] === '}') braceCount--;
            envName += expr[i];
            result += expr[i];
            i++;
          }
        }
        
        // If the environment is 'array', we must skip the column specification brace (e.g. {c|c}) too
        if (envName.startsWith('array}')) {
          while (i < expr.length && expr[i] !== '{') {
            insertCursorIfNeeded(i);
            result += expr[i];
            i++;
          }
          if (i < expr.length && expr[i] === '{') {
            insertCursorIfNeeded(i);
            result += '{';
            i++;
            let braceCount = 1;
            while (i < expr.length && braceCount > 0) {
              insertCursorIfNeeded(i);
              if (expr[i] === '{') braceCount++;
              if (expr[i] === '}') braceCount--;
              result += expr[i];
              i++;
            }
          }
        }
      } else {
        // It's a standard command (like \alpha, \frac, etc.)
        // Check if it is followed by braces/arguments ({ or [)
        let hasBraces = false;
        let temp = i;
        while (temp < expr.length && (expr[temp] === ' ' || expr[temp] === '\n')) {
          temp++;
        }
        if (temp < expr.length && (expr[temp] === '{' || expr[temp] === '[')) {
          hasBraces = true;
        }
        
        if (hasBraces) {
          // Output structural command normally
          result += '\\' + cmdName;
        } else {
          // Wrap symbol command (like \alpha, \pi, \sum) in htmlClass to make it clickable
          result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{\\${cmdName}}`;
        }
      }
      continue;
    }
    
    // 2. Handle syntax chars (curly braces, caret, subscript, ampersand, brackets, spaces)
    if (['{', '}', '^', '_', '&', '[', ']', ' ', '\n', '\t'].includes(char)) {
      result += char;
      i++;
      continue;
    }
    
    // 3. Handle placeholders (question marks)
    if (char === '?') {
      result += `\\htmlClass{math-placeholder token-idx-${i}}{\\color{#1e40af}{?}}`;
      i++;
      continue;
    }
    
    // 4. Handle visible literal content (numbers, letters, operators, variables)
    if (/[0-9a-zA-Z+\-*/=<>!.,()]/.test(char)) {
      result += `\\htmlClass{math-token token-idx-${i}}{${char}}`;
      i++;
    } else {
      result += char;
      i++;
    }
  }
  
  // Insert cursor at the very end of expression if caretIndex is at expr.length
  insertCursorIfNeeded(expr.length);
  
  return result;
}

function renderKatex(expr: string, caretIndex: number | null): string {
  if (!expr.trim()) return '<span style="color:#94a3b8">Preview</span>';
  try {
    const parsedExpr = prepareExpressionForKaTeX(expr, caretIndex);
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
  const [caretIndex, setCaretIndex] = useState<number | null>(null);
  const [topic, setTopic] = useState<TopicId>('algebra');
  const [abcMode, setAbcMode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shiftOn, setShiftOn] = useState(false);
  const lastTextareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const expressionInputRef = useRef<HTMLInputElement>(null);

  // Initialize caretIndex on open
  useEffect(() => {
    if (isOpen) {
      setCaretIndex(expression.length);
    }
  }, [isOpen]);

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
          setCaretIndex(start - 1);
          setTimeout(() => {
            inputEl.focus();
            inputEl.setSelectionRange(start - 1, start - 1);
          }, 0);
        }
      } else {
        setExpression(p => {
          const next = p.slice(0, -1);
          setCaretIndex(next.length);
          return next;
        });
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
      setCaretIndex(0);
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
      setCaretIndex(nextSelectionStart);
      
      setTimeout(() => {
        inputEl.focus();
        inputEl.setSelectionRange(nextSelectionStart, nextSelectionEnd);
      }, 0);
    } else {
      newExpr = expression + latex;
      setExpression(newExpr);
      setCaretIndex(newExpr.length);
    }
    
    // Insert into tracked active textarea
    const ta = lastTextareaRef.current;
    if (ta && document.body.contains(ta)) {
      insertTextAtCursor(ta, latex);
    }
  }, [expression]);

  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Get all clickable elements
    const elements = Array.from(container.querySelectorAll('.math-placeholder, .math-token'));
    if (elements.length === 0) {
      setCaretIndex(0);
      return;
    }
    
    // Find the closest element based on distance to the click coordinates
    let closestEl: Element | null = null;
    let minDistance = Infinity;
    
    for (const el of elements) {
      const elRect = el.getBoundingClientRect();
      const elX = elRect.left - rect.left + elRect.width / 2;
      const elY = elRect.top - rect.top + elRect.height / 2;
      
      const dist = Math.pow(clickX - elX, 2) + Math.pow(clickY - elY, 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestEl = el;
      }
    }
    
    // Check if the click is far to the left of the first element, or far to the right of the last element
    const firstRect = elements[0].getBoundingClientRect();
    const lastRect = elements[elements.length - 1].getBoundingClientRect();
    
    if (e.clientX < firstRect.left - 10) {
      setCaretIndex(0);
      const inputEl = expressionInputRef.current;
      if (inputEl) {
        inputEl.focus();
        inputEl.setSelectionRange(0, 0);
      }
      const ta = lastTextareaRef.current;
      if (ta && document.body.contains(ta)) {
        const subStart = findSubstringNearCursor(ta.value, expression, ta.selectionStart ?? ta.value.length);
        if (subStart !== -1) {
          ta.focus();
          ta.setSelectionRange(subStart, subStart);
        }
      }
      return;
    }
    
    if (e.clientX > lastRect.right + 10) {
      const endIdx = expression.length;
      setCaretIndex(endIdx);
      const inputEl = expressionInputRef.current;
      if (inputEl) {
        inputEl.focus();
        inputEl.setSelectionRange(endIdx, endIdx);
      }
      const ta = lastTextareaRef.current;
      if (ta && document.body.contains(ta)) {
        const subStart = findSubstringNearCursor(ta.value, expression, ta.selectionStart ?? ta.value.length);
        if (subStart !== -1) {
          ta.focus();
          const targetPos = subStart + endIdx;
          ta.setSelectionRange(targetPos, targetPos);
        }
      }
      return;
    }
    
    if (closestEl) {
      const classList = Array.from(closestEl.classList);
      const idxClass = classList.find(c => c.startsWith('placeholder-idx-') || c.startsWith('token-idx-'));
      
      if (idxClass) {
        const rawIdx = parseInt(idxClass.replace(/^(placeholder|token)-idx-/, ''), 10);
        const isPlaceholder = closestEl.classList.contains('math-placeholder');
        
        // 1. Focus internal expression input and set cursor/selection
        const inputEl = expressionInputRef.current;
        if (inputEl) {
          inputEl.focus();
          if (isPlaceholder) {
            inputEl.setSelectionRange(rawIdx, rawIdx + 1); // select the '?'
            setCaretIndex(rawIdx);
          } else {
            // Check if click was on the left half or right half of the token
            const elRect = closestEl.getBoundingClientRect();
            const clickXInEl = e.clientX - elRect.left;
            const newCaretIdx = clickXInEl < elRect.width / 2 ? rawIdx : rawIdx + 1;
            inputEl.setSelectionRange(newCaretIdx, newCaretIdx);
            setCaretIndex(newCaretIdx);
          }
        }
        
        // 2. Select/focus corresponding position in active textarea
        const ta = lastTextareaRef.current;
        if (ta && document.body.contains(ta)) {
          const cursor = ta.selectionStart ?? ta.value.length;
          const subStart = findSubstringNearCursor(ta.value, expression, cursor);
          if (subStart !== -1) {
            ta.focus();
            if (isPlaceholder) {
              const targetPos = subStart + rawIdx;
              ta.setSelectionRange(targetPos, targetPos + 1);
            } else {
              const elRect = closestEl.getBoundingClientRect();
              const clickXInEl = e.clientX - elRect.left;
              const newCaretIdx = clickXInEl < elRect.width / 2 ? rawIdx : rawIdx + 1;
              const targetPos = subStart + newCaretIdx;
              ta.setSelectionRange(targetPos, targetPos);
            }
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
        .math-token {
          cursor: text;
          transition: background-color 0.1s;
          display: inline-block;
        }
        .math-token:hover {
          background-color: rgba(59, 130, 246, 0.15) !important;
          border-radius: 2px;
          outline: 1px solid rgba(59, 130, 246, 0.3);
        }
        .math-cursor {
          border-left: 2px solid #3b82f6;
          margin-left: -1px;
          margin-right: -1px;
          animation: math-blink 1s step-end infinite;
          display: inline-block;
          height: 1.2em;
          vertical-align: middle;
        }
        @keyframes math-blink {
          from, to { border-color: transparent }
          50% { border-color: #3b82f6 }
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
          dangerouslySetInnerHTML={{ __html: renderKatex(expression, caretIndex) }}
          title="Click on any blue box or math symbol to edit that slot"
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
            onSelect={e => {
              setCaretIndex(e.currentTarget.selectionStart);
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
              setCaretIndex(0);
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
            {/* Row 1: Numbers */}
            <div className="flex justify-center gap-1">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleInsert(n)}
                  className="flex-1 h-10 rounded-lg bg-white border border-blue-200 text-blue-900 font-semibold hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
                >{n}</button>
              ))}
            </div>

            {/* Row 2: QWERTY Row 1 */}
            <div className="flex justify-center gap-1">
              {["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"].map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)}
                  className="flex-1 h-10 rounded-lg bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
                >{shiftOn ? ch.toUpperCase() : ch}</button>
              ))}
            </div>

            {/* Row 3: QWERTY Row 2 */}
            <div className="flex justify-center gap-1 px-4">
              {["a", "s", "d", "f", "g", "h", "j", "k", "l"].map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)}
                  className="flex-1 h-10 rounded-lg bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
                >{shiftOn ? ch.toUpperCase() : ch}</button>
              ))}
            </div>

            {/* Row 4: Shift, QWERTY Row 3, Backspace */}
            <div className="flex justify-center gap-1">
              <button
                type="button"
                onClick={() => setShiftOn(s => !s)}
                className={`w-12 h-10 rounded-lg text-lg font-bold flex items-center justify-center transition-all ${
                  shiftOn ? 'bg-blue-600 text-white border border-blue-700 shadow-inner' : 'bg-blue-100 border border-blue-200 text-blue-800 hover:bg-blue-200'
                }`}
              >
                ⇧
              </button>
              
              {["z", "x", "c", "v", "b", "n", "m", ","].map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => handleInsert(shiftOn ? ch.toUpperCase() : ch)}
                  className="flex-1 h-10 rounded-lg bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
                >{shiftOn ? ch.toUpperCase() : ch}</button>
              ))}
              
              <button
                type="button"
                onClick={() => handleInsert('__BACK__')}
                className="w-12 h-10 rounded-lg bg-blue-100 border border-blue-200 text-blue-800 flex items-center justify-center hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-lg"
              >
                ⌫
              </button>
            </div>

            {/* Row 5: Action Keys */}
            <div className="flex justify-center gap-1">
              <button
                type="button"
                onClick={() => setAbcMode(false)}
                className="w-14 h-10 rounded-lg bg-blue-200/80 border border-blue-300 text-blue-800 font-bold text-xs hover:bg-blue-300 transition-all"
              >
                123
              </button>

              <button
                type="button"
                onClick={() => handleInsert('\\quad ')}
                className="w-14 h-10 rounded-lg bg-blue-200/80 border border-blue-300 text-blue-800 flex items-center justify-center hover:bg-blue-300 transition-all text-lg"
                title="Tab (Indent)"
              >
                ⇄
              </button>

              <button
                type="button"
                onClick={() => handleInsert(' ')}
                className="flex-1 h-10 rounded-lg bg-white border border-blue-200 text-blue-400 flex items-center justify-center hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
              >
                ␣
              </button>

              <button
                type="button"
                onClick={() => handleInsert('.')}
                className="w-12 h-10 rounded-lg bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100 transition-all text-base"
              >
                .
              </button>

              <button
                type="button"
                onClick={() => handleInsert('\n')}
                className="w-14 h-10 rounded-lg bg-blue-200/80 border border-blue-300 text-blue-800 flex items-center justify-center hover:bg-blue-300 transition-all text-lg"
                title="Enter"
              >
                ↵
              </button>
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
                      type="button"
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
                      type="button"
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
                <button type="button" onClick={() => handleInsert('\\leftarrow ')} className="flex-1 h-10 rounded-lg bg-blue-300/60 border border-blue-300 text-blue-800 font-bold hover:bg-blue-300 transition-all text-lg">◀</button>
                <button type="button" onClick={() => handleInsert('\\rightarrow ')} className="flex-1 h-10 rounded-lg bg-blue-300/60 border border-blue-300 text-blue-800 font-bold hover:bg-blue-300 transition-all text-lg">▶</button>
                <button type="button" onClick={() => handleInsert('__BACK__')} className="flex-1 h-10 rounded-lg bg-red-100 border border-red-200 text-red-600 font-bold hover:bg-red-200 transition-all text-lg">⌫</button>
                <button type="button" onClick={() => handleInsert('__CLEAR__')} className="flex-1 h-10 rounded-lg bg-blue-300/60 border border-blue-300 text-blue-800 font-bold hover:bg-blue-300 transition-all text-xs">CLR</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
