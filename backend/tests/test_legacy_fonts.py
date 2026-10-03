"""
Legacy Hindi font detection (ai_preview_importer/legacy_fonts.py), used by the hybrid
pipeline to send Kruti Dev / DevLys PDF pages as images. Run from backend/:
python -m pytest tests/test_legacy_fonts.py -q
"""

from ai_preview_importer.legacy_fonts import looks_like_legacy_hindi

# A question paper typed in Kruti Dev 010, as PyMuPDF extracts it (Latin key codes).
KRUTI = "\n".join(
    [
        "iz'u 1- fuEufyf[kr esa ls dkSu lk dFku lR; gS\\",
        "¼d½ vory ysal lnSo okLrfod izfrfcEc cukrk gS",
        "¼[k½ mÙky ysal izdk'k dh fdj.kksa dks vfHklfjr djrk gS",
        "¼x½ lery niZ.k dh Qksdl nwjh 'kwU; gksrh gS",
        "¼?k½ izdk'k lnSo oØ js[kk esa pyrk gS",
    ]
)

ENGLISH = "\n".join(
    [
        "Q5. Which of the following statements is true?",
        "(a) A concave lens always forms a real image.",
        "(b) A convex lens converges rays of light.",
        "(c) The focal length of a plane mirror is zero.",
        "(d) Light always travels in a curved line.",
        "Q6. A spherical mirror has a radius of curvature of 20 cm. What is its focal length?",
    ]
)

ROMANISED_HINDI = "\n".join(
    [
        "nirvat mein prakash ki chaal kitni hoti hai",
        "nimnalikhit mein se kaun sa kathan satya hai",
        "prakash ka apvartan kyon hota hai, samjhaiye",
        "uttal darpan sadaiv seedha aur chhota pratibimb banata hai",
    ]
)

UNICODE_HINDI = "\n".join(
    [
        "प्रश्न 5. निम्नलिखित में से कौन-सा कथन सत्य है?",
        "(क) अवतल लेंस सदैव वास्तविक प्रतिबिंब बनाता है।",
        "(ख) उत्तल लेंस प्रकाश की किरणों को अभिसरित करता है।",
        "उत्तर: (ख)",
    ]
)

MATHS = "\n".join(
    [
        "1. If x^2 + 5x + 6 = 0, find both values of x.",
        "2. Solve for y: 3y - 7 = 11 and check your answer.",
        "3. The sum of two numbers is 42 and their difference is 6. Find them.",
        "4. Evaluate sin 30 + cos 60 + tan 45.",
    ]
)


def test_kruti_dev_page_is_flagged():
    assert looks_like_legacy_hindi(KRUTI)


def test_bilingual_page_with_kruti_dev_hindi_is_flagged():
    english = ENGLISH.splitlines()
    kruti = KRUTI.splitlines()
    mixed = "\n".join(line for pair in zip(english, kruti) for line in pair)
    assert looks_like_legacy_hindi(mixed)


def test_english_page_is_not_flagged():
    assert not looks_like_legacy_hindi(ENGLISH)


def test_romanised_hindi_is_not_flagged():
    assert not looks_like_legacy_hindi(ROMANISED_HINDI)


def test_unicode_hindi_is_not_flagged():
    assert not looks_like_legacy_hindi(UNICODE_HINDI)


def test_maths_page_is_not_flagged():
    assert not looks_like_legacy_hindi(MATHS)


def test_short_or_empty_text_is_not_flagged():
    assert not looks_like_legacy_hindi("")
    assert not looks_like_legacy_hindi("Hkkjr dh jkt/kkuh")
