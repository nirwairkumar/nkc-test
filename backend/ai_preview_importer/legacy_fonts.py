"""
Spot PDF text typed in a legacy (non-Unicode) Hindi font.

Kruti Dev, DevLys, Chanakya and similar fonts store ordinary Latin characters and
only draw them as Devanagari, so a PDF typed in them has a text layer such as
"Hkkjr dh jkt/kkuh" (भारत की राजधानी). Sent to the model as text, that is
gibberish; rendered and sent as a picture, the page reads as Hindi. The hybrid
pipeline uses this to send such pages as images.

Signals (Kruti Dev 010 key map): "k" is the ā sign (ा), the commonest mark in Hindi,
so it makes up a large share of the letters, while "a" (the anusvara) is rare;
"¼" and "½" are the brackets; capitals sit inside words (gS = है). English and Hindi
written in English letters are the other way round, and English has stop-words.
Lines are judged one by one, so a bilingual paper with Unicode English and
Kruti Dev Hindi is caught too.
"""
import re

_DEVANAGARI = re.compile(r"[ऀ-ॿ]")
_LATIN = re.compile(r"[A-Za-z]")
_WORD = re.compile(r"[a-z]+")
_MID_CAPS = re.compile(r"[a-z][A-Z]")
_ENGLISH = frozenset(
    "the is of and to in an what which who are was for on with by this that from it "
    "be as at or not its following correct statement answer".split()
)


def _line_is_legacy(line: str) -> bool:
    letters = _LATIN.findall(line)
    if len(letters) < 12 or _DEVANAGARI.search(line):
        return False
    n = len(letters)
    k = letters.count("k") / n
    a = sum(1 for c in letters if c in "aA") / n
    words = _WORD.findall(line.lower())
    english = sum(1 for w in words if w in _ENGLISH)
    brackets = line.count("¼") + line.count("½")
    mid_caps = len(_MID_CAPS.findall(line))
    if english >= 2 and k < 0.2:
        return False
    return a < 0.12 and (k >= 0.1 or (k >= 0.06 and (mid_caps >= 1 or brackets >= 1)))


def looks_like_legacy_hindi(text: str) -> bool:
    """True when a page's text layer reads like a legacy Hindi font rather than real text."""
    if not text or len(_LATIN.findall(text)) < 40:
        return False
    lines = [ln for ln in text.splitlines() if len(_LATIN.findall(ln)) >= 12]
    if not lines:
        return False
    legacy = sum(1 for ln in lines if _line_is_legacy(ln))
    return legacy >= 2 and legacy / len(lines) >= 0.3
