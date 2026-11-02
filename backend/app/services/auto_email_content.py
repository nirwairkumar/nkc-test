"""
What the automatic emails say (sent by services/auto_email.py).

  welcome       right after an educator or institute signs up: the two ways to make a first
                test, and the tutorial videos on youtube.com/@testozaofficial
  test_created  a new test was saved: check it, go live, share
  test_live     the exam is live: the link, the join code, a ready WhatsApp message
  results       1st, 5th, 10th, 25th, 50th, then every 100th submission  ┐ one email thread
  test_ended    the educator stopped the exam: how many, top and average ┘ per test

Rules for this copy (same as the broadcast library): say "candidates", never "students" for
the people taking an exam; never "teacher" for the person running it; never "free". Every
claim must be true of the product today. User text (titles, names) is always escaped.

Builders return {subject, preheader, html, text}. Links to our sites carry
utm_source=email&utm_medium=auto&utm_campaign=<kind>, so admin → Email → Automatic can count clicks.
"""

import html
from typing import Any, Dict, List, Optional, Sequence, Tuple
from urllib.parse import quote

from app.services.email_render import APP_ORIGIN, SITE_ORIGIN, first_name_of, plain_shell, tag_link

SUPPORT_EMAIL = "support@testoza.com"
CHANNEL = "https://www.youtube.com/@testozaofficial"

# Tutorials on the TestoZa channel (checked 2026-11-02 with mcp-servers/youtube).
VIDEOS: Dict[str, Dict[str, str]] = {
    "create": {"id": "lGjJF5zKLhU", "title": "Create a test: two languages, diagrams, chemistry and maths"},
    "conduct": {"id": "rOQ1OGA2lk4", "title": "Run a cheat-proof exam: link, join code and live results"},
    "results": {"id": "RWaYA4YlRYY", "title": "Read the results: rank list, question analysis, weak candidates"},
    "pdf": {"id": "4xKXBG6W9Ug", "title": "Turn your question paper into an online test in 2 minutes"},
    "top10": {"id": "rY8kNkg8LZ0", "title": "Top 10 TestoZa features for educators"},
}

MILESTONE_NOTE = "We email you at the 1st, 5th, 10th, 25th and 50th submission, then every 100th, all in this one thread."


def video_url(key: str) -> str:
    return f"https://www.youtube.com/watch?v={VIDEOS[key]['id']}"


# ── Building blocks ───────────────────────────────────────────────────────────

def _e(text: Any) -> str:
    return html.escape("" if text is None else str(text))


def short(title: Optional[str], limit: int = 48) -> str:
    t = " ".join((title or "").split()) or "your test"
    return t if len(t) <= limit else t[: limit - 1].rstrip() + "…"


class Mail:
    """Collects matching HTML and plain-text parts, so the two versions never drift apart."""

    def __init__(self, kind: str):
        self.kind = kind
        self.html: List[str] = []
        self.text: List[str] = []

    def link(self, url: str) -> str:
        return tag_link(url, self.kind, None, medium="auto")

    def p(self, html_part: str, text_part: str, *, muted: bool = False, size: int = 15) -> "Mail":
        style = "margin:0 0 14px;" + ("font-size:13px;color:#5f6368;" if muted else "")
        self.html.append(f'<p style="{style}">{html_part}</p>')
        self.text.append(text_part)
        return self

    def heading(self, text: str) -> "Mail":
        self.html.append(f'<p style="margin:20px 0 8px;"><strong>{_e(text)}</strong></p>')
        self.text.append(text)
        return self

    def a(self, url: str, label: str) -> str:
        return f'<a href="{_e(self.link(url))}">{_e(label)}</a>'

    def button(self, url: str, label: str, *, secondary: Optional[Tuple[str, str]] = None) -> "Mail":
        """A plain bold link on its own line. Styled buttons read as marketing to Gmail."""
        second = f"<br>{self.a(secondary[0], secondary[1])}" if secondary else ""
        self.html.append(f'<p style="margin:0 0 14px;"><a href="{_e(self.link(url))}"><strong>{_e(label)}</strong></a>{second}</p>')
        self.text.append(f"{label}: {self.link(url)}" + (f"\n{secondary[1]}: {self.link(secondary[0])}" if secondary else ""))
        return self

    def steps(self, items: Sequence[Tuple[str, str]]) -> "Mail":
        """Numbered steps: (bold lead, rest), both plain text."""
        lis = "".join(f'<li style="margin:0 0 6px;"><strong>{_e(lead)}</strong> {_e(rest)}</li>' for lead, rest in items)
        self.html.append(f'<ol style="margin:0 0 14px;padding-left:22px;">{lis}</ol>')
        self.text.append("\n".join(f"{i}. {lead} {rest}" for i, (lead, rest) in enumerate(items, 1)))
        return self

    def bullets(self, items: Sequence[Tuple[str, str]]) -> "Mail":
        """(html, text) pairs."""
        lis = "".join(f'<li style="margin:0 0 6px;">{h}</li>' for h, _ in items)
        self.html.append(f'<ul style="margin:0 0 14px;padding-left:22px;">{lis}</ul>')
        self.text.append("\n".join(f"- {t}" for _, t in items))
        return self

    def facts(self, rows: Sequence[Tuple[str, str]]) -> "Mail":
        """Label: value lines (plain text values)."""
        self.html.append('<p style="margin:0 0 14px;">' + "<br>".join(f"{_e(k)}: <strong>{_e(v)}</strong>" for k, v in rows) + "</p>")
        self.text.append("\n".join(f"{k}: {v}" for k, v in rows))
        return self

    def exam_link(self, url: str, code: Optional[str]) -> "Mail":
        """The candidates' link, untagged: the educator copies it on."""
        code_html = code_text = ""
        if code:
            pretty = f"{code[:3]} {code[3:]}"
            code_html = f"<br>Join code: <strong>{_e(pretty)}</strong> (candidates type it at testoza.com/join)"
            code_text = f"\nJoin code: {pretty} (candidates type it at testoza.com/join)"
        self.html.append(f'<p style="margin:0 0 14px;">Exam link: <a href="{_e(url)}">{_e(url)}</a>{code_html}</p>')
        self.text.append(f"Exam link: {url}{code_text}")
        return self

    def videos(self, keys: Sequence[str]) -> "Mail":
        """Plain links, no thumbnails: images are one of Gmail's strongest Promotions signals."""
        lis = "".join(f'<li style="margin:0 0 6px;"><a href="{_e(video_url(k))}">{_e(VIDEOS[k]["title"])}</a></li>' for k in keys)
        self.html.append(f'<ul style="margin:0 0 14px;padding-left:22px;">{lis}</ul>')
        self.text.append("\n".join(f"- {VIDEOS[k]['title']}: {video_url(k)}" for k in keys))
        return self

    def sign(self, name: str = "Team TestoZa") -> "Mail":
        self.html.append(f'<p style="margin:20px 0 0;">{_e(name)}</p>')
        self.text.append(name)
        return self

    def build(self, subject: str, preheader: str, why: str) -> Dict[str, str]:
        """No hidden preheader any more: inboxes show the first line after the greeting, so that is
        what admin's inbox mock shows too (`preheader` is kept only as a fallback)."""
        first = next((t for t in self.text if t and not t.startswith(("Hi ", "Hello"))), preheader)
        return {
            "subject": subject,
            "preheader": " ".join(first.split())[:140],
            "html": shell("\n".join(self.html), subject, why),
            "text": "\n\n".join(self.text) + f"\n\n--\n{why} Questions? Just reply to this email.",
        }


def shell(content: str, title: str, why: str) -> str:
    """The plain frame every TestoZa email shares (email_render.plain_shell); the footer says why,
    with no unsubscribe: these are about the reader's own account and exams."""
    return plain_shell(content, title, f"{_e(why)} Questions? Just reply to this email.")


def _hello(name: Optional[str]) -> Tuple[str, str]:
    first = first_name_of(name)
    return (f"Hi {_e(first)}," if first else "Hello,", f"Hi {first}," if first else "Hello,")


def _num(v: float) -> str:
    """182.0 → '182', 121.456 → '121.5'."""
    v = round(float(v), 1)
    return str(int(v)) if v == int(v) else f"{v:.1f}"


# ── Welcome ───────────────────────────────────────────────────────────────────

def welcome(full_name: Optional[str], designation: Optional[str] = None) -> Dict[str, str]:
    m = Mail("welcome")
    hi_html, hi_text = _hello(full_name)
    first = first_name_of(full_name)
    m.p(hi_html, hi_text)
    m.p("Thanks for joining TestoZa. You can turn a question paper into an online exam, send one link to "
        "your candidates, and see every mark the moment they submit.",
        "Thanks for joining TestoZa. You can turn a question paper into an online exam, send one link to "
        "your candidates, and see every mark the moment they submit.")
    m.p(f"The quickest start is a paper you already have. {m.a(APP_ORIGIN + '/generate-with-ai', 'Upload it')} as a "
        f"PDF, a Word file or a photo, and TestoZa reads the questions and options for you. You check them, fix "
        f"anything, and it's ready. If you'd rather type, {m.a(APP_ORIGIN + '/create-test', 'build it question by question')}.",
        f"The quickest start is a paper you already have. Upload it as a PDF, a Word file or a photo, and TestoZa "
        f"reads the questions and options for you ({APP_ORIGIN}/generate-with-ai). You check them, fix anything, "
        f"and it's ready. If you'd rather type, build it question by question: {APP_ORIGIN}/create-test")
    m.p("Candidates don't need an app or an account. They open your link on their phone, and every answer is "
        "marked for you as they submit.",
        "Candidates don't need an app or an account. They open your link on their phone, and every answer is "
        "marked for you as they submit.")
    m.p("Three short videos, if you'd like to see it first:", "Three short videos, if you'd like to see it first:")
    m.videos(["create", "conduct", "results"])
    m.p("Stuck anywhere? Just reply to this email. A real person reads every reply.",
        "Stuck anywhere? Just reply to this email. A real person reads every reply.")
    m.sign()
    subject = f"Welcome to TestoZa, {first}" if first else "Welcome to TestoZa"
    return m.build(subject, "Your first test in a few minutes, and short videos that show you how.",
                   "You're getting this because you just made a TestoZa account.")


# ── Test created ──────────────────────────────────────────────────────────────

def test_created(full_name: Optional[str], test: Dict[str, Any]) -> Dict[str, str]:
    m = Mail("test_created")
    title = test.get("title") or "Your test"
    hi_html, hi_text = _hello(full_name)
    m.p(hi_html, hi_text)
    facts = []
    n = int(test.get("total_questions") or len(test.get("questions") or []) or 0)
    if n:
        facts.append(f"{n} question{'s' if n != 1 else ''}")
    if test.get("duration"):
        facts.append(f"{_num(test['duration'])} min")
    if test.get("total_max_marks"):
        facts.append(f"{_num(test['total_max_marks'])} marks")
    tail = f": {' · '.join(facts)}." if facts else "."
    m.p(f"Your test <strong>{_e(title)}</strong> is saved{_e(tail)}",
        f"Your test \"{title}\" is saved{tail}")
    m.p("Three steps to your first results:", "Three steps to your first results:")
    m.steps([
        ("Check it.", "Open it once the way a candidate will, and fix anything that looks off."),
        ("Go live.", "On My Tests, tap Conduct exam. You get one exam link, and a 6-digit join code if you want one."),
        ("Share it.", "Send the link to your class WhatsApp group. Candidates open it on their phone, with no app to install."),
    ])
    m.button(f"{APP_ORIGIN}/my-tests", "Go live from My Tests")
    m.p(f"Worried about copying? A live exam's Settings can keep candidates in full screen and warn them, or "
        f"submit for them, when they switch apps. {m.a(video_url('conduct'), 'See how in this video')}.",
        f"Worried about copying? A live exam's Settings can keep candidates in full screen and warn them, or "
        f"submit for them, when they switch apps. Video: {video_url('conduct')}", muted=True, size=15)
    return m.build(f'"{short(title)}" is ready', "Check it once, go live, and send the link to your candidates.",
                   "You're getting this because you saved a new test on TestoZa. We send it at most once a day.")


# ── Test live ─────────────────────────────────────────────────────────────────

def exam_url(test: Dict[str, Any]) -> str:
    conduct = (test.get("settings") or {}).get("conduct_exam") or {}
    slug = conduct.get("conduct_slug") or test.get("slug")
    return f"{APP_ORIGIN}/test/{slug}" if slug else f"{APP_ORIGIN}/test-intro/{test.get('id')}"


def _instruction(settings: Dict[str, Any]) -> str:
    """Mirrors frontend lib/conductExam.ts examInstruction()."""
    if settings.get("login_required"):
        return "Open the link, sign in when asked, then tap Start."
    form = settings.get("start_form") or {}
    labels = [str(f.get("label") or "").strip() for f in (form.get("fields") or []) if isinstance(f, dict)]
    labels = [lbl for lbl in labels if lbl]
    if not form.get("enabled") or not labels:
        return "Open the link and tap Start."
    words = [" ".join(w if (w.isupper() and len(w) > 1) else w.lower() for w in lbl.split()) for lbl in labels]
    if len(words) > 3:
        return "Open the link, fill in your details, then tap Start."
    asked = words[0] if len(words) == 1 else f"{', '.join(words[:-1])} and {words[-1]}"
    return f"Open the link, enter your {asked}, then tap Start."


def invite_text(test: Dict[str, Any]) -> str:
    """The WhatsApp message, as frontend examInviteText() writes it (without the schedule line)."""
    settings = test.get("settings") or {}
    plain = lambda v: str(v or "").replace("*", "").strip()  # noqa: E731
    by = plain(test.get("institution_name")) or plain(test.get("creator_name"))
    title = plain(test.get("title")) or "Exam"
    lines = [f"*{title} — {by}*" if by else f"*{title}*"]
    n = int(test.get("total_questions") or len(test.get("questions") or []) or 0)
    facts = " · ".join(x for x in (f"⏱️ {_num(test['duration'])} min" if test.get("duration") else "",
                                   f"{n} questions" if n else "") if x)
    if facts:
        lines.append(facts)
    lines += ["", "Exam link:", exam_url(test), "", _instruction(settings)]
    code = ((settings.get("conduct_exam") or {}).get("join_code") or "").strip()
    if code:
        lines.append(f"Or open testoza.com/join and enter code {code[:3]} {code[3:]}.")
    return "\n".join(lines)


def test_live(full_name: Optional[str], test: Dict[str, Any]) -> Dict[str, str]:
    m = Mail("test_live")
    title = test.get("title") or "Your exam"
    settings = test.get("settings") or {}
    code = ((settings.get("conduct_exam") or {}).get("join_code") or "").strip() or None
    hi_html, hi_text = _hello(full_name)
    m.p(hi_html, hi_text)
    m.p(f"<strong>{_e(title)}</strong> is live. Candidates can start as soon as they open the link.",
        f"\"{title}\" is live. Candidates can start as soon as they open the link.")
    m.exam_link(exam_url(test), code)
    wa = "https://wa.me/?text=" + quote(invite_text(test), safe="")
    m.button(wa, "Send it on WhatsApp", secondary=(f"{APP_ORIGIN}/my-tests", "Open My Tests"))
    if not code:
        m.p("Want a code to write on the board instead? In the live exam's ••• menu on My Tests, tap Get a join code.",
            "Want a code to write on the board instead? In the live exam's ••• menu on My Tests, tap Get a join code.",
            muted=True, size=15)
    m.heading("What happens next")
    m.bullets([
        ("Marks appear on My Tests the moment each candidate submits.",
         "Marks appear on My Tests the moment each candidate submits."),
        ("We'll email you when the first candidate submits, then at 5, 10, 25 and 50.",
         "We'll email you when the first candidate submits, then at 5, 10, 25 and 50."),
        ("When the exam is over, stop it on My Tests. Every result stays saved.",
         "When the exam is over, stop it on My Tests. Every result stays saved."),
    ])
    return m.build(f'"{short(title)}" is live', "Your exam link is inside. Send it to your candidates now.",
                   "You're getting this because you started an exam on TestoZa.")


# ── Submissions and exam ended (one thread per test) ──────────────────────────

def thread_subject(title: Optional[str]) -> str:
    return f'Results: "{short(title, 56)}"'


def _score_rows(stats: Dict[str, Any]) -> List[Tuple[str, str]]:
    rows: List[Tuple[str, str]] = []
    out_of = f" / {_num(stats['max_marks'])}" if stats.get("max_marks") else ""
    if stats.get("top") is not None:
        rows.append(("Top score", f"{_num(stats['top'])}{out_of}"))
    if stats.get("average") is not None:
        rows.append(("Average", f"{_num(stats['average'])}{out_of}"))
    return rows


def results(full_name: Optional[str], test_id: str, title: str, count: int,
            stats: Optional[Dict[str, Any]] = None, subject: Optional[str] = None) -> Dict[str, str]:
    m = Mail("results")
    hi_html, hi_text = _hello(full_name)
    m.p(hi_html, hi_text)
    if count == 1:
        m.p(f"Your first candidate has just submitted <strong>{_e(title)}</strong>. The link works, and their marks are waiting for you.",
            f"Your first candidate has just submitted \"{title}\". The link works, and their marks are waiting for you.")
        pre = "Your first candidate just submitted. The link works."
    else:
        m.p(f"<strong>{count} candidates</strong> have now submitted <strong>{_e(title)}</strong>.",
            f"{count} candidates have now submitted \"{title}\".")
        pre = f"{count} candidates have submitted so far."
    rows = _score_rows(stats or {}) if count >= 5 else []
    if rows:
        m.facts([("Submitted", str(count))] + rows)
    m.button(f"{APP_ORIGIN}/test-analysis/{test_id}", "See their marks" if count == 1 else "See all marks")
    m.p(MILESTONE_NOTE, MILESTONE_NOTE, muted=True, size=13)
    return m.build(subject or thread_subject(title), pre,
                   "You're getting this because candidates are taking your exam on TestoZa.")


def test_ended(full_name: Optional[str], test_id: str, title: str, count: int,
               stats: Optional[Dict[str, Any]] = None, subject: Optional[str] = None) -> Dict[str, str]:
    m = Mail("test_ended")
    hi_html, hi_text = _hello(full_name)
    m.p(hi_html, hi_text)
    if count == 0:
        m.p(f"You ended <strong>{_e(title)}</strong>. Nobody submitted it this time.",
            f"You ended \"{title}\". Nobody submitted it this time.")
        m.p("If candidates couldn't open the link or got stuck, reply and tell us what they saw. We'll help you fix it before the next exam.",
            "If candidates couldn't open the link or got stuck, reply and tell us what they saw. We'll help you fix it before the next exam.")
        m.button(f"{APP_ORIGIN}/my-tests", "Open My Tests")
        pre = "The exam has ended. Nobody submitted this time."
    else:
        word = "candidate" if count == 1 else "candidates"
        m.p(f"You ended <strong>{_e(title)}</strong>. {count} {word} submitted, and every paper is marked.",
            f"You ended \"{title}\". {count} {word} submitted, and every paper is marked.")
        m.facts([("Submitted", str(count))] + _score_rows(stats or {}))
        m.button(f"{APP_ORIGIN}/test-analysis/{test_id}", "See all results",
                 secondary=(f"{APP_ORIGIN}/analytics/full?testId={test_id}", "Full report"))
        m.p("The full report has the rank list, the questions most candidates got wrong, and each candidate's answers.",
            "The full report has the rank list, the questions most candidates got wrong, and each candidate's answers.",
            muted=True, size=15)
        top = stats.get("top") if stats else None
        pre = f"Exam ended · {count} submitted" + (f" · top score {_num(top)}" if top is not None else "")
    return m.build(subject or thread_subject(title), pre,
                   "You're getting this because you ended an exam on TestoZa.")


# ── Samples for admin → Email → Automatic (preview and "send me a test") ─────

SAMPLE_TEST: Dict[str, Any] = {
    "id": "00000000-0000-4000-8000-000000000000", "title": "Weekly Mock 5 — Physics", "slug": "weekly-mock-5-x1y2",
    "duration": 60, "total_questions": 45, "total_max_marks": 180, "institution_name": "Sharma Classes",
    "settings": {"conduct_exam": {"enabled": True, "conduct_slug": "weekly-mock-5-x1y2", "join_code": "835006"},
                 "start_form": {"enabled": True, "fields": [{"label": "Name"}, {"label": "Roll No"}]}},
}
SAMPLE_STATS = {"top": 172, "average": 118.4, "max_marks": 180}


def sample(kind: str, full_name: str = "Asha Verma") -> Dict[str, str]:
    t = SAMPLE_TEST
    if kind == "welcome":
        return welcome(full_name, "Teacher")
    if kind == "test_created":
        return test_created(full_name, t)
    if kind == "test_live":
        return test_live(full_name, t)
    if kind == "results":
        return results(full_name, t["id"], t["title"], 10, SAMPLE_STATS)
    if kind == "test_ended":
        return test_ended(full_name, t["id"], t["title"], 37, SAMPLE_STATS)
    raise KeyError(kind)
