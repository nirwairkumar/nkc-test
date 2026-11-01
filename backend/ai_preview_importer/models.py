"""
Which Gemini model each AI-import job uses, decided in one place.

Extracting copies what is printed or written on the page; generating writes new questions and
needs reasoning. The defaults below come from running real papers through the page reader on
1 Nov 2026 (JEE Main 2026 21 Jan Shift 1, 25 scanned pages; JEE Main 2025 7 Apr Shift 2,
11 digital pages with an answer key):

  model (thinking)         questions  wrong types  lost options  invented options  time*      cost/paper**
  gemini-3.1-flash-lite    75 / 75    2-3          1             1                 ~45 s      ~Rs 6
  gemini-3.5-flash-lite    75 / 75    1-5          0             1                 ~40 s      ~Rs 9
  gemini-3.6-flash (min)   75 / 75    0            0             0                 ~50-60 s   ~Rs 14-16
  gemini-3.8-flash (low)   75 / 75    0            0-1           0                 ~280-500 s ~Rs 15-16
  (the old pipeline: gemini-3.5-flash, default thinking: 68-76 of 75, ~430 s, ~Rs 115-135)
  * one paper at a time    ** intro prices until 31 Dec 2026, ~double after

The Flash-Lite models invented options for fill-in-the-blank questions and cropped diagrams
badly; gemini-3.8-flash matched gemini-3.6-flash but was several times slower. So copying and
diagram boxes run on gemini-3.6-flash.

Generating 15 questions from 8 pages of notes: gemini-3.5-flash ~Rs 17 (10.8k thinking
tokens), gemini-3.8-flash ~Rs 5, gemini-3.6-flash ~Rs 6 but every answer was option A. So
generation runs on gemini-3.8-flash (and answers are shuffled; see shuffle_generated_options).

Every choice can be changed with an environment variable on Cloud Run, without a code change.

Gemini 3 models are called without temperature/top_p: Google says setting temperature below
its default of 1.0 can make these models loop or lose quality.
"""
import os
from typing import Optional

from google.genai import types

# Copying questions from PDFs and photos.
EXTRACT_MODEL = os.environ.get("AI_EXTRACT_MODEL", "gemini-3.6-flash")
# Re-reading the pages where the first read missed question numbers, and photos the
# extraction model couldn't read: a different, stronger model.
REPAIR_MODEL = os.environ.get("AI_REPAIR_MODEL", "gemini-3.8-flash")
# Tight boxes around diagrams, one call per page that has figures (figure_crops.py).
LOCATE_MODEL = os.environ.get("AI_LOCATE_MODEL", "gemini-3.6-flash")
# Writing new questions from the uploaded material ("Generate").
GENERATE_MODEL = os.environ.get("AI_GENERATE_MODEL", "gemini-3.8-flash")
# Last attempt when GENERATE_MODEL keeps failing.
FALLBACK_MODEL = os.environ.get("AI_FALLBACK_MODEL", "gemini-3.5-flash")

# gemini-3.8-flash stops at 64,000 output tokens; the others allow a little more.
MAX_OUTPUT_TOKENS = 64000

# Models that accept thinking_level "minimal"; every Gemini 3 model accepts "low".
_MINIMAL_THINKING = {
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3-flash-preview",
}


def least_thinking(model: str) -> types.ThinkingConfig:
    """The lowest thinking level `model` accepts: copying text needs no reasoning."""
    return types.ThinkingConfig(thinking_level="minimal" if model in _MINIMAL_THINKING else "low")


def _media_resolution(name: str) -> Optional[types.MediaResolution]:
    levels = {
        "low": types.MediaResolution.MEDIA_RESOLUTION_LOW,
        "medium": types.MediaResolution.MEDIA_RESOLUTION_MEDIUM,
        "high": types.MediaResolution.MEDIA_RESOLUTION_HIGH,
    }
    return levels.get(name.strip().lower())


# Tokens per page picture for extraction: high = 1120 (the default for images), medium = 560.
EXTRACT_MEDIA_RESOLUTION = _media_resolution(os.environ.get("AI_EXTRACT_MEDIA_RESOLUTION", "high"))
