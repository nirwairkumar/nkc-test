import katex from 'katex';
import { balanceLatex } from './mathSyntax';

/*
 * Turns the pad's expression into TeX for the live preview: every visible token is
 * wrapped in \htmlClass so a click can be mapped back to a caret position, and the
 * blinking caret is dropped in. The output is always balanced — half-typed input
 * (open braces, a trailing "\") never reaches KaTeX as broken syntax.
 */

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
          if (subCmd) result += `\\htmlClass{math-token token-idx-${subStart}}{\\${subCmd}}`;
          continue; // skip i++ at the bottom of the loop
        } else if (charAt === '?') {
          result += `\\htmlClass{math-placeholder token-idx-${i}}{\\color{#0369a1}{?}}`;
        } else {
          result += `\\htmlClass{math-token token-idx-${i}}{\\text{${charAt}}}`;
        }
      }
      i++;
    }
  }

  return { result, newIndex: i };
}

/** Consumes one balanced {...} group starting at `i` (which must point at `{`), copying it verbatim. */
function copyGroup(expr: string, i: number, emit: (s: string) => void, mark: (idx: number) => void): number {
  mark(i);
  emit('{');
  i++;
  let braceCount = 1;
  while (i < expr.length && braceCount > 0) {
    mark(i);
    if (expr[i] === '{') braceCount++;
    if (expr[i] === '}') braceCount--;
    emit(expr[i]);
    i++;
  }
  return i;
}

type CommandStatus = 'symbol' | 'needs-args' | 'unknown';
const commandCache = new Map<string, CommandStatus>();

/** Whether KaTeX knows `\name`, and whether it renders on its own (\alpha) or needs arguments (\frac). */
function commandStatus(name: string): CommandStatus {
  let status = commandCache.get(name);
  if (status) return status;
  try {
    katex.renderToString('\\' + name, { throwOnError: true, trust: true, strict: 'ignore' });
    status = 'symbol';
  } catch (e) {
    status = /Undefined control sequence/.test(String((e as Error)?.message)) ? 'unknown' : 'needs-args';
  }
  commandCache.set(name, status);
  return status;
}

const arityCache = new Map<string, number>();

/** How many {} groups a command needs before KaTeX will render it: \sqrt → 1, \frac → 2. */
function commandArity(name: string): number {
  const cached = arityCache.get(name);
  if (cached !== undefined) return cached;
  let arity = 0;
  for (let n = 1; n <= 3; n++) {
    try {
      katex.renderToString('\\' + name + '{}'.repeat(n), { throwOnError: true, trust: true, strict: 'ignore' });
      arity = n;
      break;
    } catch {
      // needs more groups
    }
  }
  arityCache.set(name, arity);
  return arity;
}

/** A command still being typed (\xrig, or \frac with nothing after it), shown as small grey text. */
const typedCommand = (name: string) => `\\textcolor{#94a3b8}{\\texttt{\\textbackslash{}${name}}}`;

/**
 * `lenient` is the fallback pass used when the strict pass does not render: commands
 * that are unknown or missing their arguments are drawn as grey text instead of failing.
 */
export function prepareExpressionForKaTeX(expr: string, caretIndex: number | null, lenient = false): string {
  let result = '';
  let i = 0;
  let depth = 0;
  // Lenient pass: commands whose argument groups are still being typed, e.g. \frac{-b│
  const argStack: { depth: number; remaining: number }[] = [];

  const emit = (s: string) => { result += s; };
  const insertCursorIfNeeded = (idx: number) => {
    if (caretIndex !== null && idx === caretIndex) {
      result += '\\htmlClass{math-cursor}{}';
    }
  };

  const copyEnvironment = (cmdName: string) => {
    result += '\\' + cmdName;
    if (cmdName === 'cline' || cmdName === 'begin' || cmdName === 'end') {
      let envName = '';
      while (i < expr.length && expr[i] !== '{') {
        insertCursorIfNeeded(i);
        result += expr[i];
        i++;
      }
      if (i < expr.length && expr[i] === '{') {
        const start = i;
        i = copyGroup(expr, i, emit, insertCursorIfNeeded);
        envName = expr.slice(start, i);
      }
      // array environments carry a column spec group, e.g. {c|c}
      if (envName.includes('array')) {
        while (i < expr.length && expr[i] !== '{') {
          insertCursorIfNeeded(i);
          result += expr[i];
          i++;
        }
        if (i < expr.length && expr[i] === '{') i = copyGroup(expr, i, emit, insertCursorIfNeeded);
      }
    }
  };

  while (i < expr.length) {
    insertCursorIfNeeded(i);
    const char = expr[i];

    // 1. Control words (\frac, \alpha, \begin, ...)
    if (char === '\\') {
      const commandStartIdx = i;
      i++;

      let cmdName = '';
      while (i < expr.length && /[a-zA-Z]/.test(expr[i])) {
        cmdName += expr[i];
        i++;
      }

      let nextIsLimits = false;
      let limitCmd = '';
      if (cmdName === 'sum' || cmdName === 'int') {
        let tempIdx = i;
        while (tempIdx < expr.length && (expr[tempIdx] === ' ' || expr[tempIdx] === '\n')) tempIdx++;
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
        // Escaped symbol like \\, \&, \{, \}, \_, \%, \#, \$ — a lone trailing "\" is dropped.
        const nextChar = expr[i] || '';
        if (!nextChar) continue;
        result += '\\' + nextChar;
        i++;
        // \\ followed by [..] is a row break with spacing: keep the bracket intact
        if (nextChar === '\\' && i < expr.length && expr[i] === '[') {
          while (i < expr.length && expr[i] !== ']') {
            result += expr[i];
            i++;
          }
          if (i < expr.length && expr[i] === ']') {
            result += ']';
            i++;
          }
        }
        continue;
      }

      if (cmdName === 'text') {
        const parsed = parseTextCommand(expr, i, caretIndex);
        result += parsed.result;
        i = parsed.newIndex;
        continue;
      }

      if (cmdName === 'ce') {
        if (lenient && expr.slice(i).trimStart()[0] !== '{') {
          // "\ce" typed but its { } not yet: show it as typed text, leave what follows alone.
          result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{${typedCommand('ce')}}`;
          continue;
        }
        let ceContent = '\\ce';
        const ceCursor = () => {
          if (caretIndex !== null && i === caretIndex) ceContent += '$\\htmlClass{math-cursor}{}$';
        };
        while (i < expr.length && expr[i] !== '{') {
          ceCursor();
          ceContent += expr[i];
          i++;
        }
        if (i < expr.length && expr[i] === '{') {
          ceCursor();
          ceContent += '{';
          i++;
          let braceCount = 1;
          while (i < expr.length && braceCount > 0) {
            ceCursor();
            const charAt = expr[i];
            if (charAt === '{') braceCount++;
            if (charAt === '}') braceCount--;
            ceContent += charAt;
            i++;
          }
          if (braceCount > 0) {
            ceCursor();
            ceContent += '}'.repeat(braceCount);
          }
        }
        if (lenient) {
          ceContent = '\\ce' + ceContent.slice(3).replace(/\\([a-zA-Z]+)/g, (m, name) =>
            name !== 'htmlClass' && commandStatus(name) === 'unknown' ? typedCommand(name) : m
          );
        }
        result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{${ceContent}}`;
        continue;
      }

      if (cmdName === 'begin' || cmdName === 'end' || cmdName === 'hline' || cmdName === 'cline') {
        copyEnvironment(cmdName);
      } else {
        // Structural command (\frac{..}) stays as-is; a bare symbol (\alpha) becomes clickable.
        let temp = i;
        while (temp < expr.length && (expr[temp] === ' ' || expr[temp] === '\n')) temp++;
        const hasBraces = temp < expr.length && (expr[temp] === '{' || expr[temp] === '[');
        const status = lenient ? commandStatus(cmdName) : 'symbol';

        if (lenient && (status === 'unknown' || (!hasBraces && !nextIsLimits && status === 'needs-args'))) {
          result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{${typedCommand(cmdName)}}`;
        } else if (hasBraces) {
          result += '\\' + cmdName;
          if (nextIsLimits) result += '\\' + limitCmd;
          if (lenient && status === 'needs-args') {
            const need = commandArity(cmdName);
            if (need > 0) argStack.push({ depth, remaining: need });
          }
        } else {
          const fullCmd = nextIsLimits ? `${cmdName}\\${limitCmd}` : cmdName;
          result += `\\htmlClass{math-token token-idx-${commandStartIdx}}{\\${fullCmd}}`;
        }
      }
      continue;
    }

    // 2. Superscript / subscript: always give KaTeX a group
    if (char === '^' || char === '_') {
      result += char;
      i++;

      const nextChar = expr[i];
      if (!nextChar) {
        result += '{';
        insertCursorIfNeeded(i);
        result += '}';
        continue;
      }
      if (nextChar !== '{') {
        result += '{';
        insertCursorIfNeeded(i);

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
            if (nextSymbol) result += '\\' + nextSymbol;
            i++;
          } else if (cmdName === 'begin' || cmdName === 'end' || cmdName === 'hline' || cmdName === 'cline') {
            copyEnvironment(cmdName);
          } else if (cmdName === 'ce') {
            result += '\\ce';
            if (i < expr.length && expr[i] === '{') i = copyGroup(expr, i, emit, insertCursorIfNeeded);
          } else {
            let temp = i;
            while (temp < expr.length && (expr[temp] === ' ' || expr[temp] === '\n')) temp++;
            const hasBraces = temp < expr.length && (expr[temp] === '{' || expr[temp] === '[');
            const status = lenient ? commandStatus(cmdName) : 'symbol';
            result += lenient && (status === 'unknown' || (!hasBraces && status === 'needs-args'))
              ? `\\htmlClass{math-token token-idx-${commandStartIdx}}{${typedCommand(cmdName)}}`
              : hasBraces
                ? '\\' + cmdName
                : `\\htmlClass{math-token token-idx-${commandStartIdx}}{\\${cmdName}}`;
          }
        } else if (nextChar === '?') {
          result += `\\htmlClass{math-placeholder token-idx-${i}}{\\color{#0369a1}{?}}`;
          i++;
        } else if (/[0-9a-zA-Z+\-*/=<>!.,()]/.test(nextChar)) {
          result += `\\htmlClass{math-token token-idx-${i}}{${nextChar}}`;
          i++;
        } else if (nextChar === '}') {
          // "x^}" while erasing: close the empty script, let the brace close its own group below
        } else {
          result += nextChar;
          i++;
        }
        result += '}';
      }
      continue;
    }

    if (char === '{') {
      depth++;
      result += char;
      i++;
      continue;
    }
    if (char === '}') {
      if (depth > 0) {
        depth--;
        result += char;
        const owner = argStack[argStack.length - 1];
        if (owner && owner.depth === depth) {
          owner.remaining--;
          if (owner.remaining > 0 && expr.slice(i + 1).trimStart()[0] !== '{') {
            result += '{}'.repeat(owner.remaining);
            owner.remaining = 0;
          }
          if (owner.remaining <= 0) argStack.pop();
        }
      }
      i++;
      continue;
    }

    if (['&', '[', ']', ' ', '\n', '\t'].includes(char)) {
      result += char;
      i++;
      continue;
    }

    // 3. Placeholders (question marks) — the blue "fill me" boxes
    if (char === '?') {
      result += `\\htmlClass{math-placeholder token-idx-${i}}{\\color{#0369a1}{?}}`;
      i++;
      continue;
    }

    // 4. Visible literal content
    if (/[0-9a-zA-Z+\-*/=<>!.,()]/.test(char)) {
      result += `\\htmlClass{math-token token-idx-${i}}{${char}}`;
    } else {
      result += char;
    }
    i++;
  }

  insertCursorIfNeeded(expr.length);
  if (caretIndex !== null && !result.includes('math-cursor')) {
    // Caret sat inside something copied verbatim (an environment name, a spec): show it at the end.
    result += '\\htmlClass{math-cursor}{}';
  }

  // Close the groups still open and give each unfinished command its missing (empty) arguments.
  while (argStack.length) {
    const owner = argStack.pop()!;
    if (depth > owner.depth) {
      result += '}'.repeat(depth - owner.depth);
      depth = owner.depth;
      owner.remaining--;
    }
    if (owner.remaining > 0) result += '{}'.repeat(owner.remaining);
  }

  return balanceLatex(result);
}
