"""
Regression checks for the AI import's JSON/LaTeX repair and live question streaming.
No network or credentials needed. Run from backend/:  python scripts/test_ai_import_parsing.py
"""
import sys, os, json, asyncio, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_preview_importer.latex_json import repair_json_escapes, normalize_latex, normalize_question_latex
from ai_preview_importer.figure_crops import normalize_bbox_pages, drop_unresolved_tags

results = []


def check(label, got, want):
    ok = got == want
    print(("PASS " if ok else "FAIL ") + label + ("" if ok else f"\n   got:  {got!r}\n   want: {want!r}"))
    results.append(ok)


def decoded(raw):
    return json.loads(repair_json_escapes(raw))["q"]


# ── Raw JSON from the model: LaTeX written with single backslashes ───────────
check("correct JSON untouched", repair_json_escapes(r'{"q": "$\\frac{1}{2}$\nNext"}'), r'{"q": "$\\frac{1}{2}$\nNext"}')
check("\\frac \\sqrt (form feed / invalid escape)", decoded(r'{"q": "$\frac{1}{2}$, $\sqrt{3}$"}'), r'$\frac{1}{2}$, $\sqrt{3}$')
check("line break stays a line break", decoded(r'{"q": "Statement I\nStatement II"}'), "Statement I\nStatement II")
check("\\nu \\neq are LaTeX", decoded(r'{"q": "$\nu \neq 0$"}'), r'$\nu \neq 0$')
check("line break before (i) item", decoded(r'{"q": "Options:\ni) one"}'), "Options:\ni) one")
check("\\text \\theta \\times", decoded(r'{"q": "$5\text{eV}\theta\times$"}'), r'$5\text{eV}\theta\times$')
check("\\right \\rho \\beta", decoded(r'{"q": "$\left(\rho\beta\right)$"}'), r'$\left(\rho\beta\right)$')
check("unicode escape", decoded(r'{"q": "30°C"}'), "30°C")
check("\\underline", decoded(r'{"q": "$\underline{x}$"}'), r'$\underline{x}$')
check("\\( \\) delimiters kept", decoded(r'{"q": "\( x \)"}'), r'\( x \)')
check("escaped quotes", decoded(r'{"q": "say \"hi\""}'), 'say "hi"')

# ── Decoded text with over-escaped LaTeX (JEE Main 2026 21 Jan S2, physics step) ──
check("47^\\\\circ\\\\text{C}", normalize_latex(r'$47^\\circ\\text{C}$'), r'$47^\circ\text{C}$')
check("R\\\\ \\\\Omega", normalize_latex(r'$R\\ \\Omega$'), r'$R\ \Omega$')
check("over-escaped table", normalize_latex(r'$$\\begin{array}{ll} a & b \\\\ c & d \\end{array}$$'),
      r'$$\begin{array}{ll} a & b \\ c & d \end{array}$$')
check("correct table untouched", normalize_latex(r'$$\begin{array}{ll} a & b \\ c & d \end{array}$$'),
      r'$$\begin{array}{ll} a & b \\ c & d \end{array}$$')
check("mixed: only known commands fixed", normalize_latex(r'$\frac{1}{2} + \\sqrt{3}$'), r'$\frac{1}{2} + \sqrt{3}$')
check("form feed from \\frac", normalize_latex('$\x0crac{1}{2}$'), r'$\frac{1}{2}$')
q = {"question": r"$\\sigma$", "options": {"A": r"$\\rho$", "B": {"text": r"$\\eta$"}}}
normalize_question_latex(q)
check("question fields", (q["question"], q["options"]["A"], q["options"]["B"]["text"]), (r"$\sigma$", r"$\rho$", r"$\eta$"))

# ── Diagram page numbers: batch covering pages 5..10 (overlap page 5) ─────────
qs = [{"diagram_bbox": {"page_number": p, "box_2d": [0, 0, 9, 9]}} for p in (5, 2, 9)]
normalize_bbox_pages(qs, 4, 6)
normalize_bbox_pages(qs, 4, 6)
check("bbox pages absolute/relative, idempotent", [q["diagram_bbox"]["page_number"] for q in qs], [5, 6, 9])

q = {"question": "Compound (X) ![image](image_4) is", "options": {"A": "x ![figure](fig)"}}
drop_unresolved_tags(q)
check("dangling image tags removed", (q["question"], q["options"]["A"]), ("Compound (X) is", "x"))

# ── Live streaming: sectioned papers must stream every question ───────────────
import ai_preview_importer.hybrid_pipeline as hp

QUESTION = r'{"id": %d, "type": "single", "question": "Q%d: $\\frac{1}{%d}$ {braces} [brackets] \"q\"", "options": {"A": "a", "B": "b"}, "correctAnswer": "A"}'
SECTIONED = ('{"title": "t", "enable_section_mode": true, "sections": ['
             + ", ".join('{"id": "s%d", "name": "S%d", "attempt_control": {"enabled": false}, "questions": [%s]}'
                         % (s, s, ", ".join(QUESTION % (n, n, n) for n in range(s * 5 + 1, s * 5 + 6))) for s in range(3))
             + "]}")


class _Chunk:
    def __init__(self, text):
        self.text = text


class _Models:
    def __init__(self, text, seed):
        self.text, self.seed = text, seed

    def generate_content_stream(self, **kwargs):
        rnd, i = random.Random(self.seed), 0
        while i < len(self.text):
            n = rnd.randint(1, 30)
            yield _Chunk(self.text[i:i + n])
            i += n


class _Client:
    def __init__(self, text, seed):
        self.models = _Models(text, seed)


async def _stream(seed):
    hp.client = _Client(SECTIONED, seed)
    live = []

    async def on_question(event):
        live.append(event["question"]["id"])
    result = await hp.stream_gemini_and_parse(["prompt"], [], progress_callback=None, question_callback=on_question)
    return live, len(result["questions"])

for seed in range(3):
    live, final = asyncio.run(_stream(seed))
    check(f"sectioned stream (chunking {seed}): 15 live, 15 final", (live, final), (list(range(1, 16)), 15))

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
