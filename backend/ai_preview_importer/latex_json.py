r"""
JSON repair and LaTeX normalisation for the model's question output.

The model writes LaTeX inside JSON strings, and the backslashes go wrong in two ways:

1. Under-escaped: the raw JSON has "\frac" instead of "\\frac". json.loads then either
   fails outright (\s, \l, \D ... are not JSON escapes) or silently turns the command
   into a control character (\f -> form feed, \t -> tab, \b -> backspace, \r, \n).
2. Over-escaped: the raw JSON has "\\\\frac", which decodes to two backslashes before
   "frac". KaTeX reads "\\" as a line break, so the student sees a new line and the
   plain word "frac" (or a red error such as "47^\\circ").

repair_json_escapes() fixes (1) on the raw text before json.loads.
normalize_latex() fixes (2), and any control characters left by (1), on a decoded string.
"""
import re
from typing import Any, Dict

# LaTeX commands that start with a letter JSON also uses as an escape (\n \r \t).
# A backslash followed by one of these whole words is LaTeX, not a newline/CR/tab.
# ("ni" and "neg" are left out on purpose: "\ni) ..." and "\neg." are real line breaks.)
_ESCAPE_WORD_COMMANDS = {
    'n': {
        'nu', 'ne', 'neq', 'nabla', 'not', 'notin', 'newline', 'nleq', 'ngeq', 'nless',
        'ngtr', 'nmid', 'nparallel', 'nexists', 'nsubseteq', 'nsupseteq', 'nearrow',
        'nwarrow', 'natural', 'nolimits', 'nonumber',
    },
    't': {
        'text', 'textbf', 'textit', 'textrm', 'textsf', 'texttt', 'textnormal', 'textup',
        'textstyle', 'textcolor', 'textdegree', 'textsuperscript', 'textsubscript',
        'times', 'theta', 'tan', 'tanh', 'tau', 'tfrac', 'tbinom', 'tilde', 'to', 'top',
        'triangle', 'triangleq', 'triangleleft', 'triangleright', 'therefore',
        'thinspace', 'tt', 'twoheadrightarrow',
    },
    'r': {
        'right', 'rho', 'rightarrow', 'rightleftharpoons', 'rightharpoonup',
        'rightharpoondown', 'rightrightarrows', 'rightleftarrows', 'rangle', 'rceil',
        'rfloor', 'rbrace', 'rbrack', 'rm', 'rvert', 'rVert', 'root', 'restriction',
    },
}

_HEX_DIGITS = set('0123456789abcdefABCDEF')


def _letters_from(text: str, start: int) -> str:
    end = start
    while end < len(text) and text[end].isascii() and text[end].isalpha():
        end += 1
    return text[start:end]


def repair_json_escapes(text: str) -> str:
    r"""
    Make every backslash inside a JSON string a valid escape, reading LaTeX as LaTeX.

    Inside strings: \" \\ \/ and \uXXXX stay as they are. \b and \f followed by a
    letter are always LaTeX (\beta, \frac): nobody means backspace or form feed.
    \n \r \t are LaTeX only when the whole word is a known command (\nu, \right,
    \text); otherwise they stay line breaks ("\nStatement II"). Every other
    backslash (\sqrt, \alpha, \{, \,, \( ...) is LaTeX and gets escaped.

    Text that is already valid JSON with correctly escaped LaTeX comes back unchanged.
    """
    if '\\' not in text:
        return text
    out = []
    i = 0
    n = len(text)
    in_string = False
    while i < n:
        ch = text[i]
        if not in_string:
            if ch == '"':
                in_string = True
            out.append(ch)
            i += 1
            continue
        if ch == '"':
            in_string = False
            out.append(ch)
            i += 1
            continue
        if ch != '\\':
            out.append(ch)
            i += 1
            continue

        nxt = text[i + 1] if i + 1 < n else ''
        if nxt in ('"', '\\', '/'):
            out.append(text[i:i + 2])
            i += 2
            continue
        if nxt == 'u':
            hex_part = text[i + 2:i + 6]
            if len(hex_part) == 4 and all(c in _HEX_DIGITS for c in hex_part):
                out.append(text[i:i + 6])
                i += 6
                continue
            out.append('\\\\')  # \underline, \uparrow, \upsilon
            i += 1
            continue
        if nxt in ('b', 'f'):
            after = text[i + 2] if i + 2 < n else ''
            if after.isascii() and after.isalpha():
                out.append('\\\\')  # \beta, \frac, \bar ...
                i += 1
            else:
                out.append(text[i:i + 2])
                i += 2
            continue
        if nxt in _ESCAPE_WORD_COMMANDS:
            if _letters_from(text, i + 1) in _ESCAPE_WORD_COMMANDS[nxt]:
                out.append('\\\\')
                i += 1
            else:
                out.append(text[i:i + 2])
                i += 2
            continue
        # Not a JSON escape at all: a LaTeX command or control symbol.
        out.append('\\\\')
        i += 1
    return ''.join(out)


# Commands fixed when a string mixes correct (\frac) and over-escaped (\\frac) LaTeX.
# Only whole known words are touched, so a real row break followed by a word stays.
_KNOWN_COMMANDS = {
    # greek
    'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta',
    'vartheta', 'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'pi', 'varpi', 'rho',
    'varrho', 'sigma', 'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi', 'psi',
    'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi',
    'Psi', 'Omega',
    # structure
    'frac', 'dfrac', 'tfrac', 'cfrac', 'sqrt', 'binom', 'dbinom', 'tbinom', 'left',
    'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr', 'middle',
    'begin', 'end',
    # text and fonts
    'text', 'textbf', 'textit', 'textrm', 'textsf', 'texttt', 'textnormal', 'mathrm',
    'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal', 'mathbb', 'mathfrak',
    'boldsymbol', 'operatorname', 'displaystyle', 'textstyle', 'underline', 'overline',
    # accents
    'vec', 'hat', 'bar', 'widehat', 'widetilde', 'tilde', 'dot', 'ddot', 'acute',
    'grave', 'breve', 'check', 'overrightarrow', 'overleftarrow', 'overbrace',
    'underbrace', 'mathring',
    # operators and relations
    'times', 'div', 'cdot', 'cdots', 'ldots', 'dots', 'vdots', 'ddots', 'pm', 'mp',
    'ast', 'star', 'circ', 'bullet', 'oplus', 'ominus', 'otimes', 'odot', 'cup', 'cap',
    'setminus', 'wedge', 'vee', 'le', 'leq', 'ge', 'geq', 'ne', 'neq', 'approx',
    'equiv', 'sim', 'simeq', 'cong', 'propto', 'll', 'gg', 'subset', 'subseteq',
    'supset', 'supseteq', 'in', 'notin', 'perp', 'parallel', 'mid', 'nmid',
    # arrows
    'to', 'gets', 'rightarrow', 'leftarrow', 'leftrightarrow', 'Rightarrow', 'Leftarrow',
    'Leftrightarrow', 'longrightarrow', 'longleftarrow', 'Longrightarrow', 'uparrow',
    'downarrow', 'rightleftharpoons', 'xrightarrow', 'xleftarrow', 'mapsto', 'implies',
    'iff',
    # big operators and functions
    'sum', 'prod', 'int', 'iint', 'iiint', 'oint', 'lim', 'max', 'min', 'sup', 'inf',
    'det', 'gcd', 'log', 'ln', 'lg', 'exp', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc',
    'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'coth', 'deg', 'arg', 'dim',
    # misc symbols and delimiters
    'infty', 'partial', 'nabla', 'forall', 'exists', 'neg', 'angle', 'triangle', 'square',
    'degree', 'prime', 'hbar', 'ell', 'emptyset', 'varnothing', 'therefore', 'because',
    'langle', 'rangle', 'lfloor', 'rfloor', 'lceil', 'rceil', 'lvert', 'rvert', 'lVert',
    'rVert', 'vert', 'Vert', 'lbrace', 'rbrace', 'quad', 'qquad', 'hspace', 'mathrm',
    # chemistry and extras
    'ce', 'pu', 'cancel', 'boxed', 'stackrel', 'overset', 'underset', 'substack',
    'not', 'color', 'textcolor', 'Omega',
}

_BACKSLASH_RUN = re.compile(r'\\+')
# exactly two backslashes, then a word: "\\frac"
_DOUBLE_ESCAPED_WORD = re.compile(r'(?<!\\)\\\\([A-Za-z]{2,})')
# one backslash, then a word: "\frac"
_SINGLE_ESCAPED_WORD = re.compile(r'(?<!\\)\\([A-Za-z]{2,})')

_TAB_COMMAND = re.compile(
    r'\t(ext|extbf|extit|extrm|imes|heta|an|anh|au|frac|ilde|o|op|riangle|herefore)(?![A-Za-z])'
)
_CR_COMMAND = re.compile(r'\r(ight|ho|ightarrow|angle|ceil|floor|m)(?![A-Za-z])')


def _halve_even_runs(text: str) -> str:
    def half(match: re.Match) -> str:
        run = match.group(0)
        return run[:len(run) // 2] if len(run) % 2 == 0 else run
    return _BACKSLASH_RUN.sub(half, text)


def _single_known(match: re.Match) -> str:
    word = match.group(1)
    if word in ('hline', 'cline'):
        return '\\\\ \\' + word  # "\\hline" means a row break before \hline
    if word in _KNOWN_COMMANDS:
        return '\\' + word
    return match.group(0)


def normalize_latex(text: Any) -> Any:
    r"""
    Repair LaTeX backslashes in one decoded string.

    - Control characters left by under-escaped commands become commands again
      (form feed + "rac" -> \frac, tab + "ext" -> \text, backspace + "eta" -> \beta).
    - A string whose commands are all over-escaped (\\frac, \\sqrt, "\\ \\Omega") has
      every even run of backslashes halved: \\frac -> \frac, and a table row break
      written as four backslashes becomes \\ again.
    - A string that mixes correct and over-escaped commands only has the known
      over-escaped commands fixed.

    Anything else is returned unchanged, so running it twice is harmless.
    """
    if not isinstance(text, str) or not text:
        return text

    if '\x0c' in text or '\x08' in text:
        text = re.sub(r'\x0c(?=[A-Za-z])', r'\\f', text)
        text = re.sub(r'\x08(?=[A-Za-z])', r'\\b', text)
        text = text.replace('\x0c', '').replace('\x08', '')
    if '\t' in text:
        text = _TAB_COMMAND.sub(r'\\t\1', text)
    if '\r' in text:
        text = _CR_COMMAND.sub(r'\\r\1', text)
        text = text.replace('\r\n', '\n').replace('\r', '\n')

    if '\\\\' not in text or not _DOUBLE_ESCAPED_WORD.search(text):
        return text
    if not _SINGLE_ESCAPED_WORD.search(text):
        return _halve_even_runs(text)
    return _DOUBLE_ESCAPED_WORD.sub(_single_known, text)


def normalize_question_latex(question: Dict[str, Any]) -> Dict[str, Any]:
    """Apply normalize_latex to the text fields of one question dict, in place."""
    if not isinstance(question, dict):
        return question
    for key in ('question', 'questionText', 'passageContent', 'explanation'):
        if isinstance(question.get(key), str):
            question[key] = normalize_latex(question[key])
    options = question.get('options')
    if isinstance(options, dict):
        for key, value in options.items():
            if isinstance(value, str):
                options[key] = normalize_latex(value)
            elif isinstance(value, dict) and isinstance(value.get('text'), str):
                value['text'] = normalize_latex(value['text'])
    return question
