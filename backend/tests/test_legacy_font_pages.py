"""
The hybrid pipeline sends PDF pages typed in a legacy Hindi font as images: a
two-page PDF (Kruti Dev key codes, then English) is classified page by page. Run from backend/:  python -m pytest tests/test_legacy_font_pages.py -q
"""

import fitz
import pytest

from tests.test_legacy_fonts import ENGLISH, KRUTI

hybrid = pytest.importorskip("ai_preview_importer.hybrid_pipeline")


def _pdf(pages):
    doc = fitz.open()
    for text in pages:
        page = doc.new_page()
        # Kruti Dev's text layer is plain Latin, so a Latin font reproduces it exactly.
        page.insert_text((50, 72), text, fontsize=11)
    data = doc.tobytes()
    doc.close()
    return data


def test_kruti_dev_page_goes_as_an_image():
    infos = hybrid.extract_text_and_classify_pages(_pdf([KRUTI, ENGLISH]))
    assert [i["classification"] for i in infos] == ["image_only", "text_rich"]
    assert [i["legacy_font"] for i in infos] == [True, False]
