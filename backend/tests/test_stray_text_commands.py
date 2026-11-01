r"""
Bold, italic and underlined words the model writes outside $...$ ("\textbf{Statement (I) :}")
are put inside $...$ so they display (pdf_vision_pipeline.wrap_stray_text_commands).
Run from backend/:  python -m pytest tests/test_stray_text_commands.py -q
"""
import pytest

pvp = pytest.importorskip("ai_preview_importer.pdf_vision_pipeline")
wrap = pvp.wrap_stray_text_commands
sanitize = pvp.sanitize_latex_and_mhchem


def test_bold_label_in_a_sentence_with_other_maths():
    # JEE Main 2025, 4 Apr Shift 2, Q (statements), as gemini-3.6-flash wrote it.
    raw = r"Given below are two statements : \textbf{Statement (I) :} Alcohols are formed when $\ce{R-Cl}$ reacts."
    assert sanitize(raw) == r"Given below are two statements : $\textbf{Statement (I) :}$ Alcohols are formed when $\ce{R-Cl}$ reacts."


def test_bold_label_in_plain_words():
    assert sanitize(r"\textbf{Statement (I):} Alcohols are formed") == r"$\textbf{Statement (I):}$ Alcohols are formed"
    assert sanitize(r"\textbf{कथन:} यह सही है") == r"$\textbf{कथन:}$ यह सही है"


def test_formatting_already_inside_maths_is_untouched():
    for text in (r"$\textbf{Assertion (A):}$ The sky", r"Find $\underline{\text{x}}$ now", r"$$\textbf{A}$$ b"):
        assert wrap(text) == text


def test_neighbours_share_one_pair_of_dollars():
    assert wrap(r"\textbf{Reason} \textit{(R)}: water boils") == r"$\textbf{Reason} \textit{(R)}$: water boils"


def test_right_against_a_formula_a_space_keeps_dollars_apart():
    assert wrap(r"$x$\textbf{bold}") == r"$x$ $\textbf{bold}$"
    assert wrap(r"\textbf{bold}$x$") == r"$\textbf{bold}$ $x$"


def test_an_unmatched_dollar_is_money_so_nothing_changes():
    text = r"It costs $5 and \textbf{more}"
    assert wrap(text) == text


def test_underline_with_text_inside():
    assert wrap(r"The word \underline{\text{recapture}} means") == r"The word $\underline{\text{recapture}}$ means"


def test_plain_text_command_outside_maths_becomes_words():
    assert wrap(r"Fill in \text{_____} where $x = 2$") == r"Fill in _____ where $x = 2$"
    assert wrap(r"Volume is 25 \text{ mL} when $T$ rises") == r"Volume is 25  mL when $T$ rises"


def test_characters_bold_text_cannot_hold_get_a_backslash():
    assert wrap(r"\textbf{50% of A & B_1}") == r"$\textbf{50\% of A \& B\_1}$"


def test_a_formula_with_no_dollars_still_wraps_whole_as_before():
    # Step 5 owns texts with no $ and real maths; wrapping the bold first would split it.
    out = sanitize(r"\textbf{Find} x^2 + \frac{1}{2}")
    assert out == r"$\textbf{Find} x^2 + \frac{1}{2}$"


def test_a_whole_formula_written_without_dollars_gets_them():
    # JEE Main 2026 circle question, options as gemini-3.6-flash wrote them (no \ anywhere).
    for option in ("x^2 + y^2 - 4y - 4 = 0", "x^2 + y^2 - 4x - 4y = 0", "a_n = 2n + 1", "(x + 1)^{2} ≥ 0"):
        assert sanitize(option) == f"${option}$"


def test_words_blanks_and_plain_numbers_are_not_formulas():
    for text in ("Find x^2 when x = 2", "_____", "x = 4", "10 m/s", "2nd", "4 units^2", "Both A and B"):
        assert sanitize(text) == text


def test_unbalanced_braces_are_left_alone():
    text = r"\textbf{Statement (I) : and $x$"
    assert wrap(text) == text
