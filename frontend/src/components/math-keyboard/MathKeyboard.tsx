import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Copy, Check, Trash2, Plus } from 'lucide-react';
import katex from 'katex';
import { FIXED_ROWS, TOPICS, type TopicId, type MathKey } from './keys';
import TableEditor from './TableEditor';
import { toast } from 'sonner';


interface MathKeyboardProps {
  isOpen: boolean;
  onClose: () => void;
}

/* ── helpers ─────────────────────────────────────────── */

function isIndexInsideTextCommand(expr: string, targetIdx: number): boolean {
  let i = 0;
  while (i < expr.length) {
    if (expr[i] === '\\') {
      i++;
      let cmdName = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        cmdName += expr[i];
        i++;
      }
      
      if (cmdName === 'text') {
        // Find opening '{'
        while (i < expr.length && expr[i] !== '{') {
          i++;
        }
        if (i < expr.length && expr[i] === '{') {
          const contentStart = i + 1;
          i++;
          let braceCount = 1;
          while (i < expr.length && braceCount > 0) {
            if (expr[i] === '{') braceCount++;
            if (expr[i] === '}') braceCount--;
            if (braceCount === 0) {
              const contentEnd = i; // index of closing '}'
              if (targetIdx >= contentStart && targetIdx <= contentEnd) {
                return true;
              }
            }
            i++;
          }
        }
      }
    } else {
      i++;
    }
  }
  return false;
}

function parseTextCommand(
  expr: string,
  startIndex: number,
  caretIndex: number | null
): { result: string; newIndex: number } {
  let result = '';
  let i = startIndex;
  
  const insertCursorIfNeeded = (idx: number) => {
    if (caretIndex !== null && idx === caretIndex) {
      result += '\\htmlClass{math-cursor}{}';
    }
  };

  // Find the opening '{'
  while (i < expr.length && expr[i] !== '{') {
    insertCursorIfNeeded(i);
    result += expr[i];
    i++;
  }
  
  if (i < expr.length && expr[i] === '{') {
    i++;
    let braceCount = 1;
    while (i < expr.length && braceCount > 0) {
      insertCursorIfNeeded(i);
      const charAt = expr[i];
      if (charAt === '{') braceCount++;
      if (charAt === '}') braceCount--;
      
      if (braceCount > 0) {
        if (charAt === ' ') {
          result += `\\htmlClass{math-token token-idx-${i}}{\\text{\\ }}`;
        } else if (charAt === '\\') {
          let subCmd = '';
          const subStart = i;
          i++;
          while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
            subCmd += expr[i];
            i++;
          }
          result += `\\htmlClass{math-token token-idx-${subStart}}{\\${subCmd}}`;
          continue; // skip i++ at the bottom of the loop
        } else {
          result += `\\htmlClass{math-token token-idx-${i}}{\\text{${charAt}}}`;
        }
      }
      i++;
    }
  }
  
  return { result, newIndex: i };
}

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

      let nextIsLimits = false;
      let limitCmd = '';
      if (cmdName === 'sum' || cmdName === 'int') {
        let tempIdx = i;
        while (tempIdx < expr.length && (expr[tempIdx] === ' ' || expr[tempIdx] === '\n')) {
          tempIdx++;
        }
        if (tempIdx < expr.length && expr[tempIdx] === '\\') {
          let nextCmd = '';
          let t = tempIdx + 1;
          while (t < expr.length && /[a-zA-Z]/.test(expr[t])) {
            nextCmd += expr[t];
            t++;
          }
          if (nextCmd === 'limits' || nextCmd === 'nolimits' || nextCmd === 'displaylimits') {
            nextIsLimits = true;
            limitCmd = nextCmd;
            i = t;
          }
        }
      }
      
      if (cmdName === '') {
        // Escaped symbol like \\, \&, \{, \}, \_, \%, \#, \$
        const nextChar = expr[i] || '';
        result += '\\' + nextChar;
        i++;
        continue;
      }
      
      if (cmdName === 'text') {
        const parsed = parseTextCommand(expr, i, caretIndex);
        result += parsed.result;
        i = parsed.newIndex;
        continue;
      }

      if (cmdName === 'ce') {
        let ceContent = '\\ce';
        
        // Consume environment/ce braces
        while (i < expr.length && expr[i] !== '{') {
          if (caretIndex !== null && i === caretIndex) {
            ceContent += '$\\htmlClass{math-cursor}{}$';
          }
          ceContent += expr[i];
          i++;
        }
        if (i < expr.length && expr[i] === '{') {
          if (caretIndex !== null && i === caretIndex) {
            ceContent += '$\\htmlClass{math-cursor}{}$';
          }
          ceContent += '{';
          i++;
          let braceCount = 1;
          while (i < expr.length && braceCount > 0) {
            if (caretIndex !== null && i === caretIndex) {
              ceContent += '$\\htmlClass{math-cursor}{}$';
            }
            const charAt = expr[i];
            if (charAt === '{') braceCount++;
            if (charAt === '}') braceCount--;
            ceContent += charAt;
            i++;
          }
        }
        
        result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{${ceContent}}`;
        continue;
      }

      // If it's a begin/end/hline/cline command, skip wrapping
      if (cmdName === 'begin' || cmdName === 'end' || cmdName === 'hline' || cmdName === 'cline') {
        result += '\\' + cmdName;
        
        if (cmdName === 'begin' || cmdName === 'end') {
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
          if (envName.includes('array')) {
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
        } else if (cmdName === 'cline') {
          // cline takes braces: \cline{1-2}
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
          if (nextIsLimits) {
            result += '\\' + limitCmd;
          }
        } else {
          // Wrap symbol command (like \alpha, \pi, \sum) in htmlClass to make it clickable
          const fullCmd = nextIsLimits ? `${cmdName}\\${limitCmd}` : cmdName;
          result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{\\${fullCmd}}`;
        }
      }
      continue;
    }
    
    // 2. Handle syntax chars (curly braces, caret, subscript, ampersand, brackets, spaces)
    if (char === '^' || char === '_') {
      result += char;
      i++;
      
      const nextChar = expr[i];
      if (nextChar && nextChar !== '{') {
        result += '{';
        insertCursorIfNeeded(i);
        
        // Inline parse the next token inside the braces
        if (nextChar === '\\') {
          const commandStartIdx = i;
          i++;
          let cmdName = '';
          while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
            cmdName += expr[i];
            i++;
          }
          if (cmdName === '') {
            const nextSymbol = expr[i] || '';
            result += '\\' + nextSymbol;
            i++;
          } else if (cmdName === 'begin' || cmdName === 'end' || cmdName === 'ce' || cmdName === 'hline' || cmdName === 'cline') {
            result += '\\' + cmdName;
            if (cmdName === 'begin' || cmdName === 'end' || cmdName === 'ce') {
              let envName = '';
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
              if (envName.includes('array')) {
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
            } else if (cmdName === 'cline') {
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
            let hasBraces = false;
            let temp = i;
            while (temp < expr.length && (expr[temp] === ' ' || expr[temp] === '\n')) {
              temp++;
            }
            if (temp < expr.length && (expr[temp] === '{' || expr[temp] === '[')) {
              hasBraces = true;
            }
            if (hasBraces) {
              result += '\\' + cmdName;
            } else {
              result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{\\${cmdName}}`;
            }
          }
        } else if (nextChar === '?') {
          result += `\\htmlClass{math-placeholder token-idx-${i}}{\\color{#1e40af}{?}}`;
          i++;
        } else if (/[0-9a-zA-Z+\-*/=<>!.,()]/.test(nextChar)) {
          result += `\\htmlClass{math-token token-idx-${i}}{${nextChar}}`;
          i++;
        } else {
          result += nextChar;
          i++;
        }
        result += '}';
      }
      continue;
    }
    
    if (['{', '}', '&', '[', ']', ' ', '\n', '\t'].includes(char)) {
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

function renderMhchemToHtml(expr: string): string {
  try {
    return katex.renderToString(`\\ce{${expr}}`, { throwOnError: false, displayMode: false, trust: true });
  } catch {
    return expr;
  }
}

function renderKeyLabel(label: string, display?: string, latex?: string): React.ReactNode {
  if (latex === '__TABLE_HEADER') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-3.5 h-3.5 text-blue-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
        <span className="text-[10px] truncate">Headered</span>
      </span>
    );
  }
  if (latex === '__TABLE_GRID') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-3.5 h-3.5 text-blue-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
        <span className="text-[10px] truncate">Grid</span>
      </span>
    );
  }
  if (latex === '__TABLE_MATCH') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-3.5 h-3.5 text-blue-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="4" y1="4" x2="4" y2="20" />
          <line x1="20" y1="4" x2="20" y2="20" />
          <line x1="7" y1="7" x2="17" y2="17" strokeDasharray="1 2" />
          <line x1="7" y1="17" x2="17" y2="7" strokeDasharray="1 2" />
        </svg>
        <span className="text-[10px] truncate">Match List</span>
      </span>
    );
  }
  if (latex === '__TABLE_LIST') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          {/* Left Header Box */}
          <rect x="2" y="3" width="8" height="5" rx="1.2" />
          {/* Right Header Box */}
          <rect x="14" y="3" width="8" height="5" rx="1.2" />
          {/* Left List Lines */}
          <line x1="3" y1="12" x2="9" y2="12" />
          <line x1="3" y1="16" x2="9" y2="16" />
          <line x1="3" y1="20" x2="9" y2="20" />
          {/* Right List Lines */}
          <line x1="15" y1="12" x2="21" y2="12" />
          <line x1="15" y1="16" x2="21" y2="16" />
          <line x1="15" y1="20" x2="21" y2="20" />
        </svg>
        <span className="text-[10px] truncate">Simple List</span>
      </span>
    );
  }
  if (latex === '__TABLE_MATRIX') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-3.5 h-3.5 text-blue-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M7,3 L3,3 L3,21 L7,21" />
          <path d="M17,3 L21,3 L21,21 L17,21" />
          <circle cx="8" cy="8" r="1.2" fill="currentColor" />
          <circle cx="16" cy="8" r="1.2" fill="currentColor" />
          <circle cx="8" cy="16" r="1.2" fill="currentColor" />
          <circle cx="16" cy="16" r="1.2" fill="currentColor" />
        </svg>
        <span className="text-[10px] truncate">Matrix</span>
      </span>
    );
  }
  if (latex === '__TABLE_DETERMINANT') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-3.5 h-3.5 text-blue-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="6" y1="3" x2="6" y2="21" />
          <line x1="18" y1="3" x2="18" y2="21" />
          <circle cx="10" cy="8" r="1.2" fill="currentColor" />
          <circle cx="14" cy="8" r="1.2" fill="currentColor" />
          <circle cx="10" cy="16" r="1.2" fill="currentColor" />
          <circle cx="14" cy="16" r="1.2" fill="currentColor" />
        </svg>
        <span className="text-[10px] truncate">Det</span>
      </span>
    );
  }
  if (latex === '__TABLE_EMPTY') {
    return (
      <span className="flex items-center justify-center gap-1 w-full font-semibold">
        <svg className="w-3.5 h-3.5 text-blue-800 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
        <span className="text-[10px] truncate">Empty Grid</span>
      </span>
    );
  }

  const text = display ?? label;
  if (text.includes('\\') || text.includes('^') || text.includes('_')) {
    try {
      const html = katex.renderToString(text, { throwOnError: false });
      return <span dangerouslySetInnerHTML={{ __html: html }} />;
    } catch {
      return text;
    }
  }
  return text;
}

/* ── component ───────────────────────────────────────── */

export default function MathKeyboard({ isOpen, onClose }: MathKeyboardProps) {
  const [expression, setExpression] = useState('');
  const [caretIndex, setCaretIndex] = useState<number | null>(null);
  const [topic, setTopic] = useState<TopicId>('algebra');
  const [abcMode, setAbcMode] = useState(false);
  const [tableMode, setTableMode] = useState(false);
  const [tableType, setTableType] = useState('header');
  const [copied, setCopied] = useState(false);
  const [shiftOn, setShiftOn] = useState(false);
  const [ceAnim, setCeAnim] = useState<{
    status: 'idle' | 'typing' | 'converted';
    text: string;
  }>({ status: 'idle', text: '' });
  
  const lastTextareaRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const expressionInputRef = useRef<HTMLInputElement>(null);

  // Initialize caretIndex on open
  useEffect(() => {
    if (isOpen) {
      setCaretIndex(expression.length);
      setCeAnim({ status: 'idle', text: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (ceAnim.status === 'idle') return;

    if (ceAnim.status === 'typing') {
      const fullText = "2H2 + O2 -> 2H2O";
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
          return {
            ...prev,
            text: fullText.slice(0, index)
          };
        });
      }, 200);

      return () => {
        clearInterval(interval);
      };
    }

    if (ceAnim.status === 'converted') {
      const timeout = setTimeout(() => {
        setCeAnim({ status: 'typing', text: '' });
      }, 1800);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [ceAnim.status]);

  // Track last focused textarea (before keyboard gets focus)
  useEffect(() => {
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
  }, []);

  const handleInsert = useCallback((latex: string) => {
    if (latex === '\\ce{?}') {
      setCeAnim({ status: 'typing', text: '' });
    } else {
      setCeAnim({ status: 'idle', text: '' });
    }

    if (latex.startsWith('__TABLE_')) {
      const type = latex.replace('__TABLE_', '').replace(/_+$/, '').toLowerCase();
      setTableType(type);
      setTableMode(true);
      return;
    }
    if (latex === '__ABC__') { setAbcMode(v => !v); return; }
    if (latex === '__BACK__') {
      const inputEl = expressionInputRef.current;
      if (inputEl) {
        const start = inputEl.selectionStart ?? inputEl.value.length;
        if (start > 0) {
          const before = expression.slice(0, start - 1);
          const after = expression.slice(inputEl.selectionEnd ?? start);
          const newExpr = before + after;
          setExpression(newExpr);
          setCaretIndex(start - 1);
          setTimeout(() => {
            inputEl.focus();
            inputEl.setSelectionRange(start - 1, start - 1);
          }, 0);
        }
      } else {
        const newExpr = expression.slice(0, -1);
        setExpression(newExpr);
        setCaretIndex(newExpr.length);
      }
      return;
    }
    
    if (latex === '__CLEAR__') {
      setExpression('');
      setCaretIndex(0);
      return;
    }
    
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
      
      const placeholderOffset = latex.indexOf('?');
      if (placeholderOffset !== -1) {
        nextSelectionStart = start + placeholderOffset;
        nextSelectionEnd = nextSelectionStart + 1;
      } else {
        nextSelectionStart = start + latex.length;
        nextSelectionEnd = nextSelectionStart;
      }
      
      setExpression(newExpr);
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
  }, [expression]);

  const handleTextOperatorMouseDown = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setCeAnim({ status: 'idle', text: '' });
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) {
      const start = activeEl.selectionStart ?? activeEl.value.length;
      const end = activeEl.selectionEnd ?? start;
      const val = activeEl.value;
      const text = '\\text{?}';
      const newVal = val.slice(0, start) + text + val.slice(end);
      
      const setter = Object.getOwnPropertyDescriptor(
        activeEl instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(activeEl, newVal);
      activeEl.dispatchEvent(new Event('input', { bubbles: true }));
      
      const nextCursor = start + 6;
      setTimeout(() => {
        activeEl.focus();
        activeEl.setSelectionRange(nextCursor, nextCursor + 1);
      }, 0);
    } else {
      handleInsert('\\text{?}');
    }
  }, [expression, handleInsert]);


  const handlePreviewClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const elements = Array.from(container.querySelectorAll('.math-placeholder, .math-token'));
    if (elements.length === 0) {
      setCaretIndex(0);
      return;
    }
    
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
    
    const firstRect = elements[0].getBoundingClientRect();
    const lastRect = elements[elements.length - 1].getBoundingClientRect();
    
    if (e.clientX < firstRect.left - 10) {
      setCaretIndex(0);
      const inputEl = expressionInputRef.current;
      if (inputEl) {
        inputEl.focus();
        inputEl.setSelectionRange(0, 0);
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
      return;
    }
    
    if (closestEl) {
      const classList = Array.from(closestEl.classList);
      const idxClass = classList.find(c => c.startsWith('placeholder-idx-') || c.startsWith('token-idx-'));
      
      if (idxClass) {
        const rawIdx = parseInt(idxClass.replace(/^(placeholder|token)-idx-/, ''), 10);
        const isPlaceholder = closestEl.classList.contains('math-placeholder');
        
        const inputEl = expressionInputRef.current;
        if (inputEl) {
          inputEl.focus();
          if (isPlaceholder) {
            inputEl.setSelectionRange(rawIdx, rawIdx + 1);
            setCaretIndex(rawIdx);
          } else {
            const elRect = closestEl.getBoundingClientRect();
            const clickXInEl = e.clientX - elRect.left;
            const newCaretIdx = clickXInEl < elRect.width / 2 ? rawIdx : rawIdx + 1;
            inputEl.setSelectionRange(newCaretIdx, newCaretIdx);
            setCaretIndex(newCaretIdx);
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

  const handleInsertText = useCallback(() => {
    if (!expression) return;
    const ta = lastTextareaRef.current;
    if (!ta || !document.body.contains(ta)) {
      toast.error("Please click/focus inside a question or option text box first to set your cursor position.");
      return;
    }
    const textToInsert = `$${expression}$`;
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? start;
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    
    const setter = Object.getOwnPropertyDescriptor(
      ta instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      'value'
    )?.set;
    setter?.call(ta, before + textToInsert + after);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    
    const pos = start + textToInsert.length;
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }, 0);
    setExpression('');
    setCaretIndex(0);
  }, [expression]);

  const topicData = TOPICS.find(t => t.id === topic) ?? TOPICS[0];

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="sy-pad-container fixed bottom-4 left-14 z-[9999] w-[740px] max-w-[95vw] rounded-2xl shadow-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-slate-100 overflow-hidden select-none"
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
        <span className="text-xs font-bold text-blue-800 tracking-wide">Sy Pad</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-blue-200/60 text-blue-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Preview & Input Area ── */}
      <div className="px-3 py-2 border-b border-blue-100 space-y-2 bg-white/60">
        {/* Rendered KaTeX Output Wrapper */}
        <div className="relative min-h-[50px] flex items-center justify-between rounded-lg bg-white border border-blue-100 overflow-hidden">
          <div
            className="flex-1 min-h-[50px] flex items-center px-3 py-1.5 overflow-x-auto text-lg cursor-pointer"
            onClick={handlePreviewClick}
            dangerouslySetInnerHTML={{ __html: renderKatex(expression, caretIndex) }}
            title="Click on any blue box or math symbol to edit that slot"
          />
          {ceAnim.status !== 'idle' && (
            <div className="shrink-0 flex items-center border-l border-blue-100 bg-blue-50/80 px-3 py-1.5 self-stretch text-sm max-w-[320px]">
              <div className="font-mono text-xs bg-white px-2.5 py-1 rounded border border-blue-100 shadow-sm flex items-center min-w-[130px] h-[28px] overflow-hidden">
                {ceAnim.status === 'typing' ? (
                  <span className="text-slate-400 font-bold whitespace-nowrap flex items-center">
                    {ceAnim.text}
                    <span className="inline-block w-[2px] h-3 bg-slate-400 ml-0.5 animate-pulse" />
                  </span>
                ) : (
                  <span
                    className="text-slate-400 font-bold scale-90 origin-left whitespace-nowrap flex items-center [&_.katex]:text-slate-400 [&_.katex]:font-bold"
                    dangerouslySetInnerHTML={{ __html: renderMhchemToHtml('2H2 + O2 -> 2H2O') }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Raw LaTeX Input */}
        <div className="flex items-center gap-2">
          <input
            ref={expressionInputRef}
            type="text"
            value={expression}
            onChange={e => {
              setExpression(e.target.value);
              setCeAnim({ status: 'idle', text: '' });
            }}
            onKeyDown={e => {
              if (e.key === ' ') {
                e.preventDefault();
                const inputEl = expressionInputRef.current;
                if (inputEl) {
                  const start = inputEl.selectionStart ?? inputEl.value.length;
                  const end = inputEl.selectionEnd ?? start;
                  const before = expression.slice(0, start);
                  const after = expression.slice(end);
                  
                  const isInsideText = isIndexInsideTextCommand(expression, start);
                  const spaceStr = isInsideText ? ' ' : '\\,';
                  const newExpr = before + spaceStr + after;
                  setExpression(newExpr);
                  
                  const nextPos = start + spaceStr.length;
                  setCaretIndex(nextPos);
                  setTimeout(() => {
                    inputEl.focus();
                    inputEl.setSelectionRange(nextPos, nextPos);
                  }, 0);
                } else {
                  const isInsideText = isIndexInsideTextCommand(expression, expression.length);
                  const spaceStr = isInsideText ? ' ' : '\\,';
                  const newExpr = expression + spaceStr;
                  setExpression(newExpr);
                  setCaretIndex(newExpr.length);
                }
              }
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
            onClick={handleInsertText}
            disabled={!expression}
            className="shrink-0 flex items-center gap-1 h-9 px-3 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors shadow-sm"
            title="Insert expression into active text box (wrapped in $...$)"
          >
            <Plus className="w-3.5 h-3.5" />
            Insert
          </button>
          <button
            onClick={() => {
              setExpression('');
              setCaretIndex(0);
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
      <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50/50 pr-3">
        <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
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

        {/* Text Mode formatting button */}
        <button
          type="button"
          onMouseDown={handleTextOperatorMouseDown}
          className="shrink-0 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 text-purple-700 shadow-sm transition-all"
          title="Insert text block \text{?} (for entering normal text inside tables, math formulas, or between $)"
        >
          \text{"{?}"}
        </button>
      </div>

      {/* ── Keyboard Grid ──── */}
      <div className="p-2">
        {tableMode ? (
          <TableEditor
            initialType={tableType}
            onInsert={latex => { handleInsert(latex); setTableMode(false); }}
            onClose={() => setTableMode(false)}
          />
        ) : abcMode ? (
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
                onClick={() => handleInsert('\\,')}
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
        ) : tableMode ? null : (
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
                        else if (k.label === 'Table') setTableMode(true);
                        else if (k.className !== 'empty') handleInsert(k.latex);
                      }}
                      disabled={k.className === 'empty'}
                      className={`h-10 rounded-lg text-sm transition-all ${
                        k.className === 'space-key'
                          ? 'flex-[2] bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100'
                          : k.className === 'action'
                          ? 'flex-grow flex-1 bg-blue-200 text-blue-800 font-bold text-xs hover:bg-blue-300'
                          : k.className === 'empty'
                          ? 'bg-transparent cursor-default flex-1'
                          : k.className === 'italic'
                          ? 'flex-1 bg-white border border-blue-200 text-blue-900 italic font-serif hover:bg-blue-50 active:bg-blue-100'
                          : 'flex-1 bg-white border border-blue-200 text-blue-900 font-medium hover:bg-blue-50 active:bg-blue-100'
                      }`}
                    >
                      {k.latex === '\\frac{?}{?}' ? (
                        <div className="flex flex-col items-center justify-center gap-[2px] w-4 h-5 mx-auto">
                          <div className="w-2 h-1.5 bg-current rounded-[1px]" />
                          <div className="w-3.5 h-[1.5px] bg-current" />
                          <div className="w-2 h-1.5 bg-current rounded-[1px]" />
                        </div>
                      ) : (
                        renderKeyLabel(k.label, k.display, k.latex)
                      )}
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
                      className={`flex-1 h-10 rounded-lg text-xs transition-all font-semibold ${
                        k.className === 'highlight'
                          ? 'bg-indigo-600 border border-indigo-700 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm'
                          : k.className === 'italic'
                          ? 'bg-blue-50 border border-blue-200 text-blue-800 italic font-serif text-sm hover:bg-blue-100 active:bg-blue-200'
                          : 'bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 active:bg-blue-200'
                      }`}
                      title={k.latex}
                    >
                      {renderKeyLabel(k.label, k.display, k.latex)}
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
