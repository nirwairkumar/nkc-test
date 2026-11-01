"""
Copying an exam paper a few pages at a time, then checking that every question is there.

Each AI call gets three pages of its own plus the page before and the page after as context.
It returns only the questions that START on its own pages, each with the number printed on
the paper ("qno"), its page and its section heading. It lists those numbers per page first
("page_index"), before writing the questions out, so a cut-off answer still shows what it
should have contained. Calls don't depend on each other: they run in parallel, and a busy
error costs a retry of three pages, not the paper.

Then the code, not the model, checks the paper:
  * a question two calls both returned (same section and number, neighbouring pages) is kept
    once; questions that merely share wording are never merged;
  * a solutions part that prints the questions again ("Hints & Solutions") is not read as more
    questions;
  * a section heading carries over to the following pages, which don't repeat it;
  * numbers missing from the paper's run (36, 39: 37 and 38 missing), numbers a call listed
    but didn't write out, and pages whose call failed are read again, just those pages, by a
    stronger model;
  * a number that still can't be read becomes a card saying so, at its place in the paper,
    and is listed in "extraction_check"; nothing disappears silently.

This replaced the chat-style reader for "Extract", which sent 5-8 pages per step with no
overlap, threw a whole step away on a 429, renumbered questions 1, 2, 3 and merged different
questions with matching wording (JEE Main 2025, 7 Apr Shift 2: Q37 and Q38 went into Q32).
"""
import asyncio
import json
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Any, Callable, Dict, List, Optional, Tuple

from google.genai import types

from ai_preview_importer.figure_crops import normalize_bbox_pages
from ai_preview_importer.hybrid_pipeline import stream_gemini_and_parse
from ai_preview_importer.latex_json import repair_json_escapes
from ai_preview_importer.models import EXTRACT_MEDIA_RESOLUTION, EXTRACT_MODEL, REPAIR_MODEL, least_thinking
from ai_preview_importer.pdf_vision_pipeline import (
    EXTRACT_PROMPT,
    append_extracted_images_to_content,
    build_prompt,
    convert_image_to_bytes,
    is_image,
    is_pdf,
    option_letter,
    render_pages_as_images,
)
from ai_preview_importer.retries import RETRY_DELAYS_S, is_retryable, wait_before_retry
from utils.logger import get_logger

logger = get_logger(__name__)

PAGES_PER_CALL = 3
CALL_CONCURRENCY = 6
MAX_REPAIR_CALLS = 8
REPAIR_MAX_PAGES = 4
# A jump bigger than this between two printed numbers is a new numbering, not lost questions.
MAX_GAP = 40
# Missing numbers become "could not be read" cards only when the evidence is strong.
MAX_PLACEHOLDER_GAP = 10


# ── Prompt ────────────────────────────────────────────────────────────────────


def _between(text: str, start: str, end: str) -> str:
    i = text.index(start)
    return text[i:text.index(end, i)]


# The formatting rules (maths, chemistry, tables, figures, options, answers) are shared with
# the classic extraction prompt, so a fix there reaches this reader too.
_JSON_AND_MATHS = _between(EXTRACT_PROMPT, "9. BACKSLASHES:", "--------------------------------------------------\n\nCRITICAL BEHAVIOR RULES:")
_SHARED_RULES = (
    _between(EXTRACT_PROMPT, "CRITICAL BEHAVIOR RULES:", "CROSS-PAGE QUESTION HANDLING (CRITICAL):")
    + _between(EXTRACT_PROMPT, "TABLE & LIST DETECTION RULE (CRITICAL):", "STRICT JSON OUTPUT FORMAT (DO NOT CHANGE):")
    + _between(EXTRACT_PROMPT, "ANSWER RULES BY TYPE:", "STRICT VALIDATION BEFORE OUTPUT")
)

PAGE_PROMPT = r"""
ROLE:
You copy exam questions from document pages (printed, typed, scanned, photographed or handwritten) into JSON, exactly as they appear. You never solve, rewrite, shorten, merge or invent anything, and never translate unless a LANGUAGE REQUIREMENT below asks for it.

--------------------------------------------------

THE PAGES YOU GET (CRITICAL):
- Every page is a picture labelled "--- PAGE N of M ---". A page's text layer may follow it, marked [Text layer of page N]. The text layer is INCOMPLETE: formulas, symbols, chemical names and structures printed as pictures are simply missing from it (you will see gaps like "The unit of  is :" or "Statement (I) :  is more polar than"). Always read the question from the PICTURE and copy every formula from it; use the text layer only to confirm words and numbers.
- The line "=== YOUR PAGES ... ===" names your pages. Pages marked CONTEXT ONLY are there to finish a question that starts on your pages, or to show a passage, heading or instructions printed just before them. NEVER output a question that STARTS on a context page.
- Text at the top of your first page that finishes a question begun on the page before (it has no question number of its own) is NOT a question: leave it out. The call that has the previous page finishes that question.

WHAT TO DO (CRITICAL):
1. First fill "page_index": for each of your pages, the printed numbers of the questions that START on it, in order. Do this before writing any question.
2. Then write EVERY question from page_index into "questions", in printed order. Never skip one: a question with a figure, a table, a long passage, or one that runs onto the next page still gets a full entry. Finish a question that runs onto the context page after yours from that page.
3. NEVER merge two questions, even when their wording is identical: three questions that each say "Match List-I with List-II" are three entries.
4. If an answer key / answer table is printed on your pages, copy it into "answer_key".
5. Do not copy solutions, hints or explanations ("Sol.", "Solution", "Hint", "Explanation") into questions or options. Do use a printed "Ans." / "Answer" / "Correct option" line, an answer key, or a tick, circle or highlight on an option to fill correctAnswer. Never work an answer out yourself.
6. Pages of SOLUTIONS are not questions. A part headed "Hints & Solutions", "Solutions", "Answers & Explanations", "Detailed Solutions" or similar, or a list like "Q24 Video Solution:" with QR codes, repeats question numbers that were already asked: leave those pages out of page_index (no numbers) and write no questions for them, even when the question text is printed again there.

OUTPUT (raw JSON only: no markdown, no comments, nothing before or after):
{
  "page_index": [{"page": 4, "question_numbers": ["31", "32", "33"]}],
  "title": "Test title from the paper's own header, or null if the header is not on your pages",
  "description": "One line describing the paper, or null",
  "duration": null,
  "questions": [
    {
      "qno": "31",
      "page": 4,
      "section": "<section heading as printed, or null>",
      "subject": null,
      "type": "single",
      "question": "Exact question text with LaTeX",
      "imagePlaceholder": null,
      "diagram_bbox": null,
      "options": {"A": "Option text only - no numbering prefix", "B": "...", "C": "...", "D": "..."},
      "correctAnswer": "A",
      "marks": null,
      "negativeMarks": null,
      "passageContent": null,
      "groupId": null
    }
  ],
  "answer_key": [{"qno": "1", "section": null, "answer": "B"}]
}

FIELD RULES:
- qno: the question number as printed, as text, without "Q", "Q.", "प्रश्न" or brackets: "Q.37" -> "37", "(12)" -> "12", "5(a)" -> "5(a)". If the paper prints no numbers, use "p<page>-<n>", counting the questions on that page ("p4-1", "p4-2").
- page: the page number (from its label) where the question starts.
- section: the section heading the question is under, as printed, with the subject in front when the paper has subjects ("Physics - Section A", "Chemistry - Section B", "Part II", "Reasoning Ability"). If no heading for this question is visible on these pages (your pages or the context pages), use null: it is carried over from earlier pages. Never invent a heading the paper doesn't print.
- subject: the school subject of the question ("Physics", "Chemistry", "Mathematics", "Biology", "English", "General Knowledge", ...). Always fill it, even when every question on your pages has the same subject.
- title, description, duration (in minutes): only from the paper's own header or instructions on these pages; otherwise null.
- answer_key: only entries printed on your pages. Give the answer with the same A/B/C/D mapping as the options ("(3)" -> "C"), a list when several options are correct, or the number for a numerical answer.
- Do not write "id" fields. Every question keeps its printed number in "qno".

JSON AND MATHS:
""" + _JSON_AND_MATHS + "--------------------------------------------------\n\n" + _SHARED_RULES + r"""
FINAL CHECK BEFORE OUTPUT:
✔ every number in page_index has exactly one entry in questions, and nothing that starts on a context page was added
✔ qno is the printed number, never renumbered
✔ no two questions merged; identical wording still means separate entries
✔ every option is there (from the next page if needed), without its label
✔ ALL math wrapped in $...$ or $$...$$; every LaTeX command written with exactly two backslashes in the raw JSON (\\frac), never four
✔ chemical formulas use $\\ce{...}$
✔ every question with a figure has "diagram_bbox" with the right page_number
✔ valid JSON

Return ONLY RAW JSON.
"""

REPAIR_NOTE = (
    "RE-READ: an earlier read of these pages missed questions {numbers}. Extract ONLY those question "
    "numbers, completely, following every rule above. If one of them is not printed on these pages at all, "
    'list it in "not_on_pages": ["37"] instead of inventing it.'
)
FULL_REREAD_NOTE = (
    "RE-READ: the earlier read of these pages failed or stopped early. Extract every question that starts "
    "on your pages."
)


# ── Pages and reads ───────────────────────────────────────────────────────────


@dataclass
class Page:
    number: int   # 1-based across every uploaded file
    image: bytes  # JPEG
    text: str     # the text layer; empty for scans, photos and legacy Hindi fonts
    file: int = 0  # which uploaded file it came from (0-based)


@dataclass
class _Read:
    own: List[int]
    questions: List[Dict[str, Any]] = field(default_factory=list)
    index: Dict[int, List[str]] = field(default_factory=dict)
    answer_key: List[Dict[str, Any]] = field(default_factory=list)
    not_on_pages: List[str] = field(default_factory=list)
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Any = None
    complete: bool = False
    error: Optional[str] = None
    usage: Dict[str, int] = field(default_factory=dict)
    # The model finished and said, with a page index, that no question starts on these pages
    # (blank pages, an answer key, solutions). Not a failure: nothing to re-read.
    nothing_here: bool = False

    @property
    def failed(self) -> bool:
        return not self.questions and not self.index and not self.nothing_here


def build_pages(file_data: List[Dict[str, Any]], pdf_page_infos: List[Dict[str, Any]]) -> List[Page]:
    """
    Every uploaded page as a picture, in upload order (the numbering diagram crops use), with
    the PDF text layer where it can be trusted. pdf_page_infos: extract_text_and_classify_pages
    output for the PDFs, in the same order.
    """
    infos = iter(pdf_page_infos)
    pages: List[Page] = []
    for file_no, file_info in enumerate(file_data):
        content = file_info["content"]
        if is_pdf(content):
            for image in render_pages_as_images(content, dpi=150):
                info = next(infos, {})
                text = info.get("text", "") if info.get("classification") == "text_rich" else ""
                pages.append(Page(len(pages) + 1, image, text, file_no))
        elif is_image(file_info["filename"]):
            pages.append(Page(len(pages) + 1, convert_image_to_bytes(content), "", file_no))
    return pages


def _add_page(parts: list, page: Page, total: int, note: Optional[str]) -> None:
    parts.append(f"\n--- PAGE {page.number} of {total}{f' ({note})' if note else ''} ---\n")
    parts.append(types.Part.from_bytes(data=page.image, mime_type="image/jpeg"))
    if page.text:
        parts.append(f"[Text layer of page {page.number}]\n{page.text}\n")


def _call_parts(prompt: str, pages: Dict[int, Page], own: List[int], embedded: List[Dict], note: Optional[str] = None) -> list:
    total = len(pages)
    first, last = own[0], own[-1]
    span = f"{first}" if first == last else f"{first} to {last}"
    parts: list = [prompt, f"\n=== YOUR PAGES: {span} (of {total}). Extract every question that STARTS on these pages. ==="]
    if note:
        parts.append(note)
    if first - 1 in pages:
        _add_page(parts, pages[first - 1], total, "CONTEXT ONLY: the page before yours; never extract a question that starts here")
    for n in own:
        _add_page(parts, pages[n], total, None)
    if last + 1 in pages:
        _add_page(parts, pages[last + 1], total, "CONTEXT ONLY: the page after yours; use it only to finish a question that starts on your pages")
    append_extracted_images_to_content(parts, [img for img in embedded if first <= img.get("page", 0) <= last])
    return parts


def _raw_json(raw: str) -> Dict[str, Any]:
    """The answer's JSON, or whatever of it can be read (the page index comes first)."""
    clean = (raw or "").strip()
    if clean.startswith("```"):
        clean = clean.split("\n", 1)[1] if "\n" in clean else clean[3:]
        clean = clean.rsplit("```", 1)[0]
    try:
        data = json.loads(repair_json_escapes(clean))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        pass
    m = re.search(r'"page_index"\s*:\s*(\[.*?\])\s*,\s*"', clean, re.S)
    if m:
        try:
            return {"page_index": json.loads(m.group(1))}
        except json.JSONDecodeError:
            pass
    return {}


def _absolute_page(value: Any, window_first: int, window_len: int) -> Optional[int]:
    """A page number from the model as a document page (it sometimes counts from 1 in the window)."""
    try:
        page = int(value)
    except (TypeError, ValueError):
        return None
    if not (window_first <= page < window_first + window_len) and 1 <= page <= window_len:
        page += window_first - 1
    return page


def _to_read(result: Dict[str, Any], own: List[int], pages: Dict[int, Page], complete: bool, error: Optional[str]) -> _Read:
    meta = result.get("_meta") or {}
    data = _raw_json(meta.get("raw") or "")
    window_first = max(own[0] - 1, 1)
    window_len = min(own[-1] + 1, len(pages)) - window_first + 1

    read = _Read(own=own, complete=complete, error=error, usage=meta.get("usage") or {})
    for entry in data.get("page_index") or []:
        if isinstance(entry, dict):
            page = _absolute_page(entry.get("page"), window_first, window_len)
            numbers = [str(n) for n in entry.get("question_numbers") or [] if str(n).strip()]
            if page and numbers:
                read.index.setdefault(page, []).extend(numbers)
    read.answer_key = [e for e in data.get("answer_key") or [] if isinstance(e, dict)]
    read.not_on_pages = [qno(n) for n in data.get("not_on_pages") or []]
    read.title = result.get("title") or data.get("title") or None
    read.description = result.get("description") or data.get("description") or None
    read.duration = data.get("duration")

    questions = [q for q in result.get("questions") or [] if isinstance(q, dict)]
    normalize_bbox_pages(questions, window_first - 1, window_len)
    for q in questions:
        if not q.get("section_name") and q.get("section"):
            q["section_name"] = q["section"]  # streamed questions (unparseable answer) keep the raw key
        page = _absolute_page(q.get("page"), window_first, window_len)
        q["page"] = page if page in pages else own[0]
        if q["page"] < own[0] or q["page"] > own[-1]:
            # It says it starts on a context page: that page's own call returns it.
            if q["page"] == own[0] - 1 or not qno(q.get("qno")):
                continue
            q["page"] = min(max(q["page"], own[0]), own[-1])
        read.questions.append(q)
    read.nothing_here = (complete and not read.questions and not read.index
                         and isinstance(data.get("page_index"), list) and isinstance(data.get("questions"), list))
    return read


async def _read_pages(
    prompt: str,
    pages: Dict[int, Page],
    own: List[int],
    embedded: List[Dict],
    model: str,
    question_callback: Optional[Callable],
    label: str,
    note: Optional[str] = None,
) -> _Read:
    """One call over `own` pages, retried on busy errors and once on a cut-off answer."""
    parts = _call_parts(prompt, pages, own, embedded, note)
    page_embedded = [img for img in embedded if own[0] <= img.get("page", 0) <= own[-1]]
    best: Optional[Tuple[Dict[str, Any], str]] = None
    error: Optional[str] = None
    cut_off_retries = 1

    for attempt in range(len(RETRY_DELAYS_S) + 1):
        try:
            result = await stream_gemini_and_parse(
                parts, page_embedded, question_callback=question_callback,
                model=model, thinking=least_thinking(model), media_resolution=EXTRACT_MEDIA_RESOLUTION,
            )
        except asyncio.CancelledError:
            raise
        except Exception as e:
            error = str(e)
            if attempt == len(RETRY_DELAYS_S) or not is_retryable(e):
                break
            logger.warning(f"{label}: try {attempt + 1} failed ({error[:120]}), trying again")
            await wait_before_retry(attempt)
            continue

        meta = result.get("_meta") or {}
        if not meta.get("error") and meta.get("finish_reason") in (None, "STOP"):
            read = _to_read(result, own, pages, complete=True, error=None)
            listed = [qno(n) for page in sorted(read.index) for n in read.index[page]]
            logger.info(f"{label}: listed {listed}; returned {[qno(q.get('qno')) for q in read.questions]}")
            return read
        error = meta.get("error") or f"the answer stopped early ({meta.get('finish_reason')})"
        logger.warning(f"{label}: {error}; {len(result.get('questions') or [])} questions so far")
        if best is None or len(result.get("questions") or []) > len(best[0].get("questions") or []):
            best = (result, error)
        if cut_off_retries == 0:
            break
        cut_off_retries -= 1
        await wait_before_retry(0)

    if best:
        return _to_read(best[0], own, pages, complete=False, error=best[1])
    logger.error(f"{label}: could not be read: {error}")
    return _Read(own=own, complete=False, error=error)


# ── Checking the paper ────────────────────────────────────────────────────────

_QNO_PREFIX = re.compile(r'^\s*(?:q(?:ue(?:s(?:tion)?)?)?|प्रश्न|no)\s*[.:\-]?\s*', re.I)
_MADE_UP_QNO = re.compile(r'p\d+-\d+')  # the prompt's "p<page>-<n>" for unnumbered questions
_PART = re.compile(r'\b(section|sec|part)\b\.?\s*[-–:]?\s*([a-z0-9]{1,4})\b', re.I)


def qno(value: Any) -> str:
    """A printed question number in comparable form: "Q.37" / "(37)" / "37." -> "37"."""
    text = _QNO_PREFIX.sub('', str(value if value is not None else '')).strip().strip('.:;- ')
    m = re.fullmatch(r'[(\[]?(\d+)[)\]]?', text)
    if m:
        return str(int(m.group(1)))
    return re.sub(r'\s+', '', text.lower())


def qno_int(value: Any) -> Optional[int]:
    m = re.match(r'\d+', qno(value))
    return int(m.group()) if m else None


def section_key(name: Any) -> Optional[str]:
    if not name or not str(name).strip():
        return None
    return re.sub(r'[\W_]+', '', str(name).lower()) or None


def split_section(raw: str) -> Tuple[Optional[str], Optional[str]]:
    """
    A heading as (subject, part): "CHEMISTRY - SECTION-A" -> ("Chemistry", "Section A"),
    "SECTION-B" -> (None, "Section B"), "Reasoning Ability" -> ("Reasoning Ability", None).
    Calls write the same heading differently; this is the form they agree on.
    """
    text = re.sub(r'\s+', ' ', raw).strip()
    part = None
    m = _PART.search(text)
    if m:
        word = "Part" if m.group(1).lower() == "part" else "Section"
        part = f"{word} {m.group(2).upper()}"
        text = f"{text[:m.start()]} {text[m.end():]}"
    subject = re.sub(r'^[\s\-–:|,()]+|[\s\-–:|,()]+$', '', text).strip() or None
    if subject and subject.isupper():
        subject = subject.title()
    return subject, part


def paper_subjects(questions: List[Dict[str, Any]]) -> List[str]:
    """The subjects that at least three questions belong to, in order of first appearance."""
    counts: Dict[str, int] = {}
    for q in questions:
        s = str(q.get("subject") or "").strip().title()
        if s:
            counts[s] = counts.get(s, 0) + 1
    return [s for s, n in counts.items() if n >= 3]


def carry_sections(questions: List[Dict[str, Any]], use_subjects: bool = False) -> None:
    """
    Give every question the section heading in effect where it starts. A call that saw no
    heading gets the previous one; a heading that names only the subject ("CHEMISTRY") or
    only the part ("SECTION-B") keeps the other half. A part going back to one already used
    for this subject ("Section A" after Physics' B) means a new subject whose name wasn't seen.
    use_subjects (a paper of several subjects): a printed "SECTION-A" takes its subject from
    the question itself, so Physics' A and Chemistry's A never end up as one section.
    """
    subject: Optional[str] = None
    part: Optional[str] = None
    parts_seen: set = set()

    for q in questions:
        raw = str(q.get("section_name") or "").strip()
        if raw:
            new_subject, new_part = split_section(raw)
            own = str(q.get("subject") or "").strip().title()
            if use_subjects and not new_subject and new_part and own:
                new_subject = own
            if new_subject and section_key(new_subject) != section_key(subject):
                subject, part, parts_seen = new_subject, new_part, set()
            elif new_part and new_part != part:
                if new_part in parts_seen and not new_subject:
                    subject = None
                    parts_seen = set()
                part = new_part
            if part:
                parts_seen.add(part)
        name = " - ".join(x for x in (subject, part) if x) or None
        q["section_name"] = name
        q["_section"] = section_key(name)


def subject_sections(questions: List[Dict[str, Any]]) -> bool:
    """
    A paper that prints no headings but runs subject by subject (JEE Main 2025, 7 Apr Shift 2:
    Physics, then Chemistry, then Mathematics) gets one section per subject. Each call names
    every question's subject; a run of one or two that sits inside another subject's block is
    taken as that subject. When the subjects don't form clean blocks (a mixed GK quiz), or most
    questions have none, the paper stays unsectioned rather than half-sectioned.
    """
    if not questions or any(q.get("section_name") for q in questions):
        return False
    subjects = [str(q.get("subject") or "").strip().title() or None for q in questions]
    if sum(s is not None for s in subjects) < 0.8 * len(questions):
        return False

    runs: List[List[Any]] = []  # [subject, count]
    for s in subjects:
        if runs and (s is None or s == runs[-1][0]):
            runs[-1][1] += 1
        else:
            runs.append([s, 1])
    for i in range(1, len(runs) - 1):
        if runs[i][1] <= 2 and runs[i - 1][0] == runs[i + 1][0]:
            runs[i][0] = runs[i - 1][0]
    blocks: List[List[Any]] = []
    for s, n in runs:
        if blocks and s == blocks[-1][0]:
            blocks[-1][1] += n
        else:
            blocks.append([s, n])
    names = [s for s, _ in blocks]
    if len(blocks) < 2 or None in names or len(set(names)) != len(names) or min(n for _, n in blocks) < 3:
        return False

    i = 0
    for s, n in blocks:
        for q in questions[i:i + n]:
            q["section_name"] = s
            q["_section"] = section_key(s)
        i += n
    return True


def _filled(q: Dict[str, Any]) -> Tuple[int, int]:
    options = q.get("options") if isinstance(q.get("options"), dict) else {}
    filled = sum(1 for v in options.values() if (v.get("text") if isinstance(v, dict) else v))
    return filled, len(str(q.get("question") or ""))


def merge_repeats(questions: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
    """
    Keep one copy of a question two calls both returned: same section, same printed number,
    starting on the same or a neighbouring page. Wording is never compared, so different
    questions with identical text stay separate.
    """
    kept: List[Dict[str, Any]] = []
    where: Dict[Tuple[Optional[str], str], int] = {}
    merged = 0
    for q in questions:
        key = (q.get("_section"), qno(q.get("qno")))
        if key[1] and key in where:
            i = where[key]
            other = kept[i]
            if abs((q.get("page") or 0) - (other.get("page") or 0)) <= 1:
                best, rest = (other, q) if _filled(other) >= _filled(q) else (q, other)
                best = dict(best)
                for k in ("correctAnswer", "diagram_bbox", "imagePlaceholder", "image", "passageContent", "marks", "negativeMarks"):
                    if best.get(k) in (None, "", {}, []) and rest.get(k) not in (None, "", {}, []):
                        best[k] = rest[k]
                kept[i] = best
                merged += 1
                continue
        where[key] = len(kept)
        kept.append(q)
    return kept, merged


def _plain(text: Any) -> str:
    return re.sub(r"[\W_]+", "", str(text or "")).lower()


def _similar(a: Any, b: Any) -> float:
    a, b = _plain(a)[:600], _plain(b)[:600]
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b, autojunk=False).ratio()


def _is_reprint(q: Dict[str, Any], original: Dict[str, Any]) -> bool:
    """A later copy of `original` that only repeats it (a solutions page), not a question of its own."""
    options, length = _filled(q)
    original_options, original_length = _filled(original)
    if options < original_options:
        return True  # "Q24 Video Solution:" with no options, or a solution that lists fewer
    if original_length >= 40 and length < original_length / 2:
        return True
    return _similar(q.get("question"), original.get("question")) >= 0.6


def drop_reprints(questions: List[Dict[str, Any]], file_of: Dict[int, int]) -> int:
    """
    Drop questions a solutions part prints again. PW's JEE Main 2025 4 Apr Shift 2 PDF has the
    75 questions on pages 1-11, then "Hints & Solutions" lists Q1-Q75 again with a QR code
    each; Q24-Q75 came back a second time (127 questions).

    A copy is dropped when the same printed number was already read at least two pages earlier
    in the same uploaded file (merge_repeats handles neighbouring pages) and the copy is thinner
    or reads the same. Separate files are never compared: two worksheets that both start at 1
    keep all their questions. Returns how many were dropped.
    """
    first: Dict[Tuple[Optional[str], str, int], Dict[str, Any]] = {}
    by_number: Dict[Tuple[str, int], List[Dict[str, Any]]] = {}
    kept: List[Dict[str, Any]] = []
    for q in questions:
        number = qno(q.get("qno"))
        page = q.get("page") or 0
        if number and not q.get("unreadable") and not _MADE_UP_QNO.fullmatch(number):
            file_no = file_of.get(page, 0)
            original = first.get((q.get("_section"), number, file_no))
            if original is not None and page - (original.get("page") or 0) >= 2 and _is_reprint(q, original):
                continue
            # The copy got a different section (a solutions heading): only the same wording counts.
            if original is None and any(
                page - (o.get("page") or 0) >= 2 and _similar(q.get("question"), o.get("question")) >= 0.85
                for o in by_number.get((number, file_no), [])
            ):
                continue
            first.setdefault((q.get("_section"), number, file_no), q)
            by_number.setdefault((number, file_no), []).append(q)
        kept.append(q)
    dropped = len(questions) - len(kept)
    questions[:] = kept
    return dropped


def absorb_fragments(questions: List[Dict[str, Any]]) -> int:
    """
    In a paper that numbers its questions, an unnumbered "question" at the top of a page is the
    end of the previous page's question (JEE Main 2025, 7 Apr Shift 2: Q20 ran onto page 4 and
    its tail came back as a question of its own). Fold it into that question: its options or
    figure when the question has none. Returns how many were folded.
    """
    numbered = sum(1 for q in questions if qno_int(q.get("qno")) is not None)
    if numbered < max(3, len(questions) // 2):
        return 0
    kept: List[Dict[str, Any]] = []
    for q in questions:
        prev = kept[-1] if kept else None
        if (prev and not q.get("unreadable") and _MADE_UP_QNO.fullmatch(qno(q.get("qno")))
                and (prev.get("page") or 0) < (q.get("page") or 0)):
            if not _filled(prev)[0] and _filled(q)[0]:
                prev["options"] = q["options"]
                if prev.get("correctAnswer") in (None, "") and q.get("correctAnswer") not in (None, ""):
                    prev["correctAnswer"] = q["correctAnswer"]
            for key in ("diagram_bbox", "imagePlaceholder"):
                if not prev.get(key) and q.get(key):
                    prev[key] = q[key]
            continue
        kept.append(q)
    absorbed = len(questions) - len(kept)
    questions[:] = kept
    return absorbed


@dataclass
class Gap:
    numbers: List[str]
    pages: List[int]
    section_name: Optional[str]
    listed: bool  # a call's page index named these numbers


def find_gaps(questions: List[Dict[str, Any]], reads: List[_Read], total_pages: int) -> List[Gap]:
    """Printed numbers that should be there but aren't, with the pages to look on."""
    present: Dict[str, List[int]] = {}
    for q in questions:
        present.setdefault(qno(q.get("qno")), []).append(q.get("page") or 0)

    def found_near(number: str, lo: int, hi: int) -> bool:
        return any(lo - 2 <= p <= hi + 2 for p in present.get(number, []))

    gaps: List[Gap] = []
    seen: set = set()

    # Numbers a call listed for a page but never wrote out.
    for read in reads:
        for page, numbers in sorted(read.index.items()):
            missing = [n for n in (qno(x) for x in numbers) if n and not found_near(n, page, page) and (n, page) not in seen]
            if missing:
                seen.update((n, page) for n in missing)
                section = next((q.get("section_name") for q in questions if q.get("page") == page), None)
                gaps.append(Gap(missing, [page], section, listed=True))

    # Holes in the printed numbering (…36, 39…).
    prev: Optional[Dict[str, Any]] = None
    for q in questions:
        n = qno_int(q.get("qno"))
        if n is None:
            continue
        if prev is not None:
            p = qno_int(prev.get("qno"))
            if p is not None and p + 1 < n <= p + MAX_GAP:
                lo, hi = prev.get("page") or 1, q.get("page") or prev.get("page") or 1
                missing = [str(x) for x in range(p + 1, n) if not found_near(str(x), lo, hi)]
                missing = [x for x in missing if not any((x, pg) in seen for pg in range(lo, hi + 1))]
                if missing:
                    seen.update((x, lo) for x in missing)
                    gaps.append(Gap(missing, list(range(lo, min(hi, total_pages) + 1)), prev.get("section_name"), listed=False))
        prev = q
    return gaps


def _stretches(pages: List[int]) -> List[Tuple[int, int]]:
    """[3, 4, 5, 9] -> [(3, 5), (9, 9)]"""
    out: List[Tuple[int, int]] = []
    for p in pages:
        if out and p == out[-1][1] + 1:
            out[-1] = (out[-1][0], p)
        else:
            out.append((p, p))
    return out


def insert_in_order(questions: List[Dict[str, Any]], q: Dict[str, Any]) -> None:
    """Put a re-read question where it is printed: before the first later question of its section."""
    page, n, sec = q.get("page") or 0, qno_int(q.get("qno")), q.get("_section")
    for i, other in enumerate(questions):
        other_page = other.get("page") or 0
        if other_page > page:
            questions.insert(i, q)
            return
        if other_page == page and other.get("_section") == sec and n is not None:
            m = qno_int(other.get("qno"))
            if m is not None and m > n:
                questions.insert(i, q)
                return
    questions.append(q)


def _set_answer(q: Dict[str, Any], answer: Any) -> None:
    if answer is None or answer == "":
        return
    if isinstance(answer, list):
        letters = [option_letter(a, q) for a in answer]
        if letters and all(letters):
            q["correctAnswer"] = letters if len(letters) > 1 else letters[0]
            q["type"] = "multiple" if len(letters) > 1 else q.get("type") or "single"
        return
    if isinstance(answer, dict):
        q["correctAnswer"] = answer
        return
    letter = option_letter(answer, q)
    if letter:
        q["correctAnswer"] = letter
        return
    try:
        value = float(str(answer).strip())
    except ValueError:
        return
    if q.get("type") == "numerical" or not _filled(q)[0]:
        q["correctAnswer"] = {"min": value, "max": value}
        q["type"] = "numerical"


def settle_type(q: Dict[str, Any]) -> None:
    """
    Make a question's type agree with what came back. No options and a number for an answer
    is a numerical question (a model sometimes calls it "single" and writes "1333"); a
    "numerical" with printed options and a letter answer is a choice question.
    """
    if q.get("unreadable"):
        return
    filled = _filled(q)[0]
    answer = q.get("correctAnswer")
    if q.get("type") != "numerical" and filled == 0 and answer not in (None, "", [], {}):
        value = answer.get("min") if isinstance(answer, dict) else answer
        try:
            number = float(str(value).strip())
        except (TypeError, ValueError):
            return
        q["type"] = "numerical"
        q["correctAnswer"] = answer if isinstance(answer, dict) else {"min": number, "max": number}
        q["options"] = {}
        q["optionImages"] = {}
    elif q.get("type") == "numerical" and filled >= 2 and isinstance(answer, str) and option_letter(answer, q):
        q["type"] = "single"
        q["correctAnswer"] = option_letter(answer, q)


def apply_answer_key(questions: List[Dict[str, Any]], entries: List[Dict[str, Any]]) -> int:
    """Fill unanswered questions from an answer key printed in the paper. Returns how many."""
    by_number: Dict[str, List[Dict[str, Any]]] = {}
    for e in entries:
        n = qno(e.get("qno"))
        if n:
            by_number.setdefault(n, []).append(e)
    counts: Dict[str, int] = {}
    for q in questions:
        counts[qno(q.get("qno"))] = counts.get(qno(q.get("qno")), 0) + 1

    filled = 0
    for q in questions:
        if q.get("correctAnswer") not in (None, "", [], {}):
            continue
        n = qno(q.get("qno"))
        candidates = by_number.get(n) or []
        entry = None
        if len(candidates) == 1 and counts.get(n) == 1:
            entry = candidates[0]
        else:
            entry = next((e for e in candidates if section_key(e.get("section")) == q.get("_section")), None)
        if entry:
            _set_answer(q, entry.get("answer"))
            filled += q.get("correctAnswer") not in (None, "", [], {})
    return filled


def missing_card(text: str, page: int, section_name: Optional[str], number: str = "") -> Dict[str, Any]:
    """
    A visible card where a question could not be read, so the teacher sees the hole and can
    type the question in. It has no answer, so the review screen marks it "needs an answer".
    """
    return {
        "qno": number,
        "page": page,
        "section_name": section_name,
        "_section": section_key(section_name),
        "type": "single",
        "question": text,
        "options": {"A": "", "B": "", "C": "", "D": ""},
        "correctAnswer": None,
        "marks": None,
        "negativeMarks": None,
        "unreadable": True,
    }


# ── The whole paper ───────────────────────────────────────────────────────────


async def extract_questions(
    pages: List[Page],
    embedded_images: List[Dict],
    prompt_options: Dict[str, Any],
    progress_callback: Optional[Callable] = None,
    question_callback: Optional[Callable] = None,
) -> Dict[str, Any]:
    """
    Copy every question of `pages`. Returns {"title", "description", ["duration"], "questions",
    "extraction_check"}; each question keeps "qno", "page" and "section_name" for the caller's
    finishing steps (diagram crops, answer key, sections).
    """
    if not pages:
        raise ValueError("No pages could be processed")
    by_number = {p.number: p for p in pages}
    total = len(pages)
    prompt = build_prompt(mode="extract", base_prompt=PAGE_PROMPT, **prompt_options)

    calls = [list(range(start, min(start + PAGES_PER_CALL, total + 1))) for start in range(1, total + 1, PAGES_PER_CALL)]
    logger.info(f"Page reader: {total} pages in {len(calls)} calls of up to {PAGES_PER_CALL} pages ({EXTRACT_MODEL})")
    if progress_callback:
        await progress_callback({
            "stage": "processing",
            "percent": 40,
            "message": f"Reading {total} pages in {len(calls)} batches...",
            "data": {"pipeline": "pages", "total_pages": total, "total_batches": len(calls)},
        })

    semaphore = asyncio.Semaphore(CALL_CONCURRENCY)
    done = 0
    found = 0
    progress_lock = asyncio.Lock()

    async def run(i: int, own: List[int]) -> _Read:
        nonlocal done, found

        async def live(event: Dict[str, Any]) -> None:
            if question_callback and event.get("type") == "question":
                await question_callback({**event, "batch": i + 1})

        async with semaphore:
            read = await _read_pages(prompt, by_number, own, embedded_images, EXTRACT_MODEL, live, f"Pages {own[0]}-{own[-1]}")
        async with progress_lock:
            done += 1
            found += len(read.questions)
            if progress_callback:
                await progress_callback({
                    "stage": "processing",
                    "percent": 40 + int(done / len(calls) * 40),
                    "message": f"Processing batch {done}/{len(calls)} ({found} questions found)...",
                    "data": {"batch": done, "total_batches": len(calls), "questions_found": found},
                })
        return read

    reads = list(await asyncio.gather(*[run(i, own) for i, own in enumerate(calls)]))

    questions: List[Dict[str, Any]] = [q for read in reads for q in read.questions]
    several_subjects = len(paper_subjects(questions)) >= 2
    carry_sections(questions, several_subjects)
    questions, merged = merge_repeats(questions)
    file_of = {p.number: p.file for p in pages}
    reprints = drop_reprints(questions, file_of)
    folded = absorb_fragments(questions)

    # ── Re-read what is missing ──
    targets: List[Tuple[List[int], Optional[Gap]]] = []
    for read in reads:
        if read.failed:
            targets.append((read.own, None))  # the whole call failed
        elif not read.complete:
            last = max((q.get("page") or read.own[0] for q in read.questions), default=read.own[0])
            pages_left = [p for p in read.own if p >= last]
            if not read.index or max(read.index) < read.own[-1]:
                targets.append((pages_left, None))  # cut off, and its index doesn't cover the rest
    gaps = find_gaps(questions, reads, total)
    targets.extend((g.pages[:REPAIR_MAX_PAGES], g) for g in gaps)
    targets = targets[:MAX_REPAIR_CALLS]

    repaired = 0
    not_printed: set = set()
    repair_reads: List[_Read] = []
    if targets:
        wanted = sorted({n for _, g in targets if g for n in g.numbers}, key=lambda n: (qno_int(n) or 0, n))
        logger.info(f"Page reader: re-reading {len(targets)} spot(s); missing numbers {wanted}")
        if progress_callback:
            await progress_callback({
                "stage": "processing",
                "percent": 82,
                "message": f"Checking every question number: re-reading {len(targets)} spot(s)...",
                "data": {"questions_found": len(questions)},
            })

        async def repair(own: List[int], gap: Optional[Gap]) -> Tuple[_Read, Optional[Gap]]:
            note = REPAIR_NOTE.format(numbers=", ".join(gap.numbers)) if gap else FULL_REREAD_NOTE
            async with semaphore:
                read = await _read_pages(prompt, by_number, own, embedded_images, REPAIR_MODEL, None,
                                         f"Re-read pages {own[0]}-{own[-1]}", note=note)
            return read, gap

        for read, gap in await asyncio.gather(*[repair(own, gap) for own, gap in targets]):
            repair_reads.append(read)
            not_printed.update(read.not_on_pages)
            wanted_here = {qno(n) for n in gap.numbers} if gap else None
            new = [q for q in read.questions if wanted_here is None or qno(q.get("qno")) in wanted_here]
            for q in new:
                if not q.get("section_name") and gap:
                    q["section_name"] = gap.section_name
                q["_section"] = section_key(q.get("section_name"))
                insert_in_order(questions, q)
            repaired += len(new)
        carry_sections(questions, several_subjects)
        questions, merged_again = merge_repeats(questions)
        merged += merged_again
        reprints += drop_reprints(questions, file_of)
        folded += absorb_fragments(questions)

    # ── Whatever is still missing becomes a visible card ──
    still_missing: List[str] = []
    for gap in find_gaps(questions, [], total) + [g for g in gaps if g.listed]:
        for number in gap.numbers:
            if number in not_printed or any(qno(q.get("qno")) == number and abs((q.get("page") or 0) - gap.pages[0]) <= 2 for q in questions):
                continue
            if number in still_missing:
                continue
            still_missing.append(number)
            if gap.listed or len(gap.numbers) <= MAX_PLACEHOLDER_GAP:
                page = gap.pages[0] if gap.pages else 0
                text = f"Question {number} could not be read from your file (page {page}). Type it in here, or delete this question."
                insert_in_order(questions, missing_card(text, page, gap.section_name, number))

    # Pages whose first read and re-read both failed: their numbers are unknown, so one card per stretch.
    failed = {p for read in reads if read.failed for p in read.own}
    recovered = {p for read in repair_reads if read.questions or read.index or read.complete for p in read.own}
    unreadable_pages = sorted(failed - recovered)
    for start, end in _stretches(unreadable_pages):
        span = f"Page {start}" if start == end else f"Pages {start}–{end}"
        section = next((q.get("section_name") for q in reversed(questions) if (q.get("page") or 0) < start), None)
        insert_in_order(questions, missing_card(
            f"{span} of your file could not be read. Upload {'it' if start == end else 'them'} again, "
            f"or type {'its' if start == end else 'their'} questions in here, then delete this question.",
            start, section))

    sectioned_by_subject = subject_sections(questions)
    reads.extend(repair_reads)
    answer_key = [e for read in reads for e in read.answer_key]
    keyed = apply_answer_key(questions, answer_key) if answer_key else 0

    usage = {k: sum((r.usage or {}).get(k, 0) for r in reads) for k in ("input", "output", "thinking")}
    first = next((r for r in reads[:len(calls)] if r.title), None)
    duration = next((r.duration for r in reads[:len(calls)] if r.duration), None)
    check = {
        "pages": total,
        "calls": len(calls),
        "repair_calls": len(targets),
        "questions": sum(1 for q in questions if not q.get("unreadable")),
        "repaired": repaired,
        "merged_repeats": merged,
        "solution_reprints_dropped": reprints,
        "fragments_folded": folded,
        "sections_from_subjects": sectioned_by_subject,
        "missing": still_missing,
        "unreadable_pages": unreadable_pages,
        "answers_from_key": keyed,
        "model": EXTRACT_MODEL,
        "repair_model": REPAIR_MODEL,
        "tokens": usage,
    }
    logger.info(f"Page reader check: {check}")

    for q in questions:
        q.pop("_section", None)
        settle_type(q)
    if not any(not q.get("unreadable") for q in questions):
        raise ValueError("No questions could be extracted from the document.")

    for i, q in enumerate(questions):
        q["id"] = i + 1
    result: Dict[str, Any] = {
        "title": first.title if first else "Extracted Exam",
        "description": (first.description if first else None) or f"Extracted from {total} pages",
        "questions": questions,
        "extraction_check": check,
    }
    if duration:
        result["duration"] = duration
    return result
