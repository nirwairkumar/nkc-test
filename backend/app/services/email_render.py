"""
Turns a broadcast email (library template or one written in the composer) into what a
person receives: subject, preheader, HTML and plain text, with their details filled in.

Body format — the same everywhere an admin writes an email:
  blank line          new paragraph
  "- " at line start  bullet
  **words**           bold
  [words](link)       link
  [[Button]](link)    a button, alone in its paragraph
  {first_name|there}  the person's detail, or the text after | when it's missing

Every testoza.com link gets utm tags (source=email, medium=broadcast, campaign=<email key>,
content=<first 8 characters of the campaign id>), which is how admin → History counts
clicks without a tracking pixel. Every email carries a one-click unsubscribe link
(signed, so nobody can unsubscribe someone else).
"""

import base64
import hashlib
import hmac
import html
import os
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

APP_ORIGIN = "https://app.testoza.com"
SITE_ORIGIN = "https://testoza.com"
PUBLIC_API = (os.getenv("PUBLIC_API_URL") or "https://apigcp.testoza.com/api").rstrip("/")
SUPPORT_EMAIL = "support@testoza.com"

FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
ACCENT = "#0284c7"

# What an admin can put in {…}. The sample is what previews show when no person is picked.
VARIABLES: Dict[str, Dict[str, str]] = {
    "first_name": {"label": "First name", "sample": "Asha"},
    "name": {"label": "Full name", "sample": "Asha Verma"},
    "email": {"label": "Email", "sample": "asha@example.in"},
    "test_title": {"label": "Their latest test", "sample": "Physics Chapter 3 Test"},
    "top_test_title": {"label": "Test with most answers", "sample": "Weekly Mock 4"},
    "top_test_results": {"label": "Answers on that test", "sample": "38"},
    "tests_created": {"label": "Tests made", "sample": "3"},
    "results": {"label": "Answer sheets received", "sample": "64"},
    # Reminders (20261102120000_email_automatic.sql): the test that has been live 2+ days with
    # fewer than 5 answers, and the person's last visit.
    "live_test_title": {"label": "Their live test", "sample": "Weekly Mock 5"},
    "live_test_link": {"label": "Link to that exam", "sample": f"{APP_ORIGIN}/test/weekly-mock-5-x1y2"},
    "live_days": {"label": "Days it has been live", "sample": "3"},
    "live_test_results": {"label": "Answers on that test", "sample": "2"},
    "last_visit": {"label": "Last visit (\"9 days ago\")", "sample": "9 days ago"},
    "results_waiting": {"label": "Line about answers since the last visit", "sample":
                        "While you were away, 12 candidates submitted your tests. Their marks are waiting."},
    "app": {"label": "app.testoza.com", "sample": APP_ORIGIN},
    "site": {"label": "testoza.com", "sample": SITE_ORIGIN},
}

SAMPLE_PERSON: Dict[str, Any] = {
    "id": None, "email": "asha@example.in", "full_name": "Asha Verma", "tests_created": 3, "results": 64,
    "latest_test_title": "Physics Chapter 3 Test", "top_test_title": "Weekly Mock 4", "top_test_results": 38,
    "live_test_title": "Weekly Mock 5", "live_test_slug": "weekly-mock-5-x1y2", "live_test_results": 2,
    "live_since": "2026-10-30T10:00:00+00:00", "last_seen_at": "2026-10-24T10:00:00+00:00", "new_results": 12,
    "_now": "2026-11-02T10:00:00+00:00",
}

_PLACEHOLDER = re.compile(r"\{([a-z_]+)(?:\|([^{}]*))?\}")
_BUTTON = re.compile(r"^\[\[(.+?)\]\]\((\S+?)\)$")
_LINK = re.compile(r"\[([^\[\]]+?)\]\((\S+?)\)")
_BOLD = re.compile(r"\*\*(.+?)\*\*")


# ── People ────────────────────────────────────────────────────────────────────

def first_name_of(full_name: Optional[str]) -> str:
    """'nirwair kumar' → 'Nirwair'. Usernames and email-like names give '' (the fallback is used)."""
    first = re.split(r"[\s._-]+", (full_name or "").strip())[0] if full_name else ""
    # Letters only (Devanagari vowel signs are "marks", not letters, so they're allowed too).
    if len(first) < 2 or not first[0].isalpha() or not all(
            ch.isalpha() or unicodedata.category(ch).startswith("M") for ch in first):
        return ""
    return first.capitalize() if first.islower() or first.isupper() else first


def _when(v: Any) -> Optional[datetime]:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _days_ago(days: int) -> str:
    if days <= 0:
        return "today"
    return "yesterday" if days == 1 else f"{days} days ago"


def person_vars(p: Dict[str, Any]) -> Dict[str, str]:
    def s(v: Any) -> str:
        return "" if v is None else str(v).strip()

    now = _when(p.get("_now")) or datetime.now(timezone.utc)
    live_since, seen = _when(p.get("live_since")), _when(p.get("last_seen_at"))
    slug = s(p.get("live_test_slug"))
    new_results = int(p.get("new_results") or 0)
    return {
        "first_name": first_name_of(p.get("full_name")),
        "name": s(p.get("full_name")),
        "email": s(p.get("email")),
        "test_title": s(p.get("latest_test_title")),
        "top_test_title": s(p.get("top_test_title")),
        "top_test_results": s(p.get("top_test_results") or ""),
        "tests_created": s(p.get("tests_created") or 0),
        "results": s(p.get("results") or 0),
        "live_test_title": s(p.get("live_test_title")),
        "live_test_link": f"{APP_ORIGIN}/test/{slug}" if slug else "",
        "live_days": str(max(1, (now - live_since).days)) if live_since else "",
        "live_test_results": s(p.get("live_test_results")) if p.get("live_test_title") else "",
        "last_visit": _days_ago((now - seen).days) if seen else "",
        "results_waiting": (
            f"While you were away, {new_results} candidate{'s' if new_results != 1 else ''} "
            f"submitted your tests. Their marks are waiting." if new_results > 0 else ""),
        "app": APP_ORIGIN,
        "site": SITE_ORIGIN,
    }


def fill(text: str, values: Dict[str, str], escape: bool = False, warnings: Optional[List[str]] = None) -> str:
    """Replace {name|fallback}. Unknown names stay as typed so the preview shows the mistake."""

    def sub(m: "re.Match[str]") -> str:
        key, fallback = m.group(1), m.group(2)
        if key not in VARIABLES:
            if warnings is not None:
                warnings.append(f"{{{key}}} isn't a detail TestoZa knows. Check the spelling.")
            return m.group(0)
        value = values.get(key) or ""
        if not value:
            value = fallback or ""
            if fallback is None and warnings is not None and key not in ("app", "site"):
                warnings.append(f"{{{key}}} is empty for this person. Add a fallback: {{{key}|…}}")
        return html.escape(value) if escape else value

    return _PLACEHOLDER.sub(sub, text or "")


# ── Links ─────────────────────────────────────────────────────────────────────

def _safe_url(url: str) -> Optional[str]:
    url = url.strip()
    if url.startswith("mailto:"):
        return url
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return None
    return url


def tag_link(url: str, campaign_key: Optional[str], campaign_tag: Optional[str], medium: str = "broadcast") -> str:
    """utm tags on our own links, so a click shows up in analytics (and in History).
    medium: "broadcast" for admin sends, "auto" for the automatic emails (services/auto_email.py)."""
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if not campaign_key or not (host == "testoza.com" or host.endswith(".testoza.com")):
        return url
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    if "utm_source" in query:
        return url
    query.update({
        "utm_source": "email",
        "utm_medium": medium,
        "utm_campaign": re.sub(r"[^a-z0-9-]+", "-", campaign_key.lower())[:60],
    })
    if campaign_tag:
        query["utm_content"] = campaign_tag
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


# ── Unsubscribe links ─────────────────────────────────────────────────────────

def _secret() -> bytes:
    from app.core.config import settings

    seed = os.getenv("EMAIL_LINK_SECRET") or settings.SUPABASE_SERVICE_KEY or settings.SUPABASE_KEY or ""
    return hashlib.sha256(f"testoza-email-links:{seed}".encode()).digest()


def _sign(email: str) -> str:
    return hmac.new(_secret(), email.encode(), hashlib.sha256).hexdigest()[:24]


def unsubscribe_token(email: str) -> str:
    e = (email or "").strip().lower()
    b = base64.urlsafe_b64encode(e.encode()).decode().rstrip("=")
    return f"{b}.{_sign(e)}"


def email_from_token(token: str) -> Optional[str]:
    try:
        b, sig = token.rsplit(".", 1)
        email = base64.urlsafe_b64decode(b + "=" * (-len(b) % 4)).decode()
    except Exception:
        return None
    if not email or "@" not in email or not hmac.compare_digest(sig, _sign(email)):
        return None
    return email


def unsubscribe_url(email: str) -> str:
    return f"{PUBLIC_API}/email-broadcast/u/{unsubscribe_token(email)}"


# ── Body → HTML / text ────────────────────────────────────────────────────────

def _blocks(body: str) -> List[str]:
    return [b.strip("\n") for b in re.split(r"\n\s*\n", (body or "").replace("\r\n", "\n").strip()) if b.strip()]


def _inline_html(text: str, values: Dict[str, str], link: "LinkFn", warnings: List[str]) -> str:
    out = html.escape(text, quote=False)

    def a(m: "re.Match[str]") -> str:
        url = _safe_url(html.unescape(fill(m.group(2), values)))
        if not url:
            warnings.append(f"The link “{html.unescape(m.group(1))}” doesn't start with https://")
            return m.group(1)
        return (f'<a href="{html.escape(link(url))}" style="color:{ACCENT};text-decoration:underline;">'
                f"{m.group(1)}</a>")

    out = _LINK.sub(a, out)
    out = _BOLD.sub(r"<strong>\1</strong>", out)
    out = fill(out, values, escape=True, warnings=warnings)
    return out.replace("\n", "<br>")


LinkFn = Any  # Callable[[str], str]


def body_html(body: str, values: Dict[str, str], link: LinkFn, warnings: List[str]) -> str:
    parts: List[str] = []
    for block in _blocks(body):
        button = _BUTTON.match(block.strip())
        lines = block.split("\n")
        if button:
            url = _safe_url(fill(button.group(2), values))
            label = html.escape(fill(button.group(1), values))
            if not url:
                warnings.append(f"The button “{label}” needs a link that starts with https://")
                continue
            # A bold link on its own line, not a styled button: buttons read as marketing to Gmail.
            parts.append(f'<p style="margin:0 0 14px;"><a href="{html.escape(link(url))}"><strong>{label}</strong></a></p>')
        elif all(line.lstrip().startswith("- ") for line in lines):
            items = "".join(
                f'<li style="margin:0 0 8px;">{_inline_html(line.lstrip()[2:], values, link, warnings)}</li>'
                for line in lines
            )
            parts.append(f'<ul style="margin:0 0 18px;padding-left:22px;">{items}</ul>')
        else:
            inner = _inline_html(block, values, link, warnings)
            # A paragraph that is only an empty detail ({results_waiting|}) disappears.
            if inner.replace("<br>", "").strip():
                parts.append(f'<p style="margin:0 0 16px;">{inner}</p>')
    return "\n".join(parts)


def body_text(body: str, values: Dict[str, str], link: LinkFn) -> str:
    out: List[str] = []
    for block in _blocks(body):
        button = _BUTTON.match(block.strip())
        if button:
            url = _safe_url(fill(button.group(2), values))
            if url:
                out.append(f"{fill(button.group(1), values)}: {link(url)}")
            continue
        text = fill(block, values)
        text = _LINK.sub(lambda m: f"{m.group(1)} ({link(_safe_url(m.group(2)) or m.group(2))})", text)
        text = _BOLD.sub(r"\1", text)
        if text.strip():
            out.append(text)
    return "\n\n".join(out)


def _preview_line(text: str) -> str:
    """The inbox preview: the first paragraph that isn't the greeting."""
    for para in (text or "").split("\n\n"):
        p = " ".join(para.split())
        if p and not re.match(r"^(hi|hello|dear)\b[^.!?]{0,40},$", p, re.I):
            return p[:140]
    return ""


def plain_shell(content: str, title: str, footer_html: str) -> str:
    """
    The frame of every TestoZa email: one column of text, as if typed in Gmail. No background,
    card, logo bar, images, styled buttons or hidden preview text: Gmail's Promotions tab keys on
    exactly those, and a new sending domain gets no benefit of the doubt. The inbox preview is
    the first line of the email, so the first sentence must carry the message.
    """
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
</head>
<body>
<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#202124;max-width:600px;">
{content}
<p style="margin:28px 0 0;font-size:12px;color:#5f6368;">{footer_html}</p>
</div>
</body>
</html>"""


def shell(content: str, preheader: str, unsubscribe: str, title: str) -> str:
    """Broadcasts: the plain frame with a one-line unsubscribe. `preheader` is no longer embedded
    (hidden preview text is a marketing signal); admin's inbox mock still shows it."""
    return plain_shell(content, title, "You're getting this because you have a TestoZa account. "
                       f'<a href="{html.escape(unsubscribe)}">Unsubscribe</a>')


def render(
    subject: str,
    preheader: str,
    body: str,
    person: Dict[str, Any],
    *,
    campaign_key: Optional[str] = None,
    campaign_tag: Optional[str] = None,
    unsubscribe: Optional[str] = None,
) -> Dict[str, Any]:
    """Everything one person receives. `warnings` lists mistakes worth fixing before sending."""
    values = person_vars(person)
    warnings: List[str] = []

    def link(url: str) -> str:
        return tag_link(url, campaign_key, campaign_tag)

    unsub = unsubscribe or (unsubscribe_url(person["email"]) if person.get("email") else "#")
    final_subject = re.sub(r"\s+", " ", fill(subject, values, warnings=warnings)).strip()
    final_pre = re.sub(r"\s+", " ", fill(preheader, values, warnings=warnings)).strip()
    content = body_html(body, values, link, warnings)
    text = body_text(body, values, link) + f"\n\n—\nYou're getting this because you have a TestoZa account.\nUnsubscribe: {unsub}"

    if not final_subject:
        warnings.append("The subject is empty.")
    elif len(final_subject) > 70:
        warnings.append(f"The subject is {len(final_subject)} characters. Phones cut it after about 40–50.")
    if not _BUTTON.search(body or "") and "[" not in (body or "") and "reply" not in (body or "").lower():
        warnings.append("There's no button, no link and no ask to reply. What should the reader do?")

    # Same warning twice (a placeholder used in many places) is noise.
    seen: List[str] = []
    for w in warnings:
        if w not in seen:
            seen.append(w)

    return {
        "subject": final_subject,
        # What the inbox shows under the subject: the first line after the greeting (no hidden preheader).
        "preheader": _preview_line(text) or final_pre,
        "html": shell(content, final_pre, unsub, final_subject),
        "text": text,
        "warnings": seen,
    }


_BARE_URL = re.compile(r"(?:https?://|www\.)[^\s<>()\[\]\"'{}|]+", re.I)


def link_hosts(subject: str, body: str) -> List[str]:
    """
    Every web address an email points to (links, buttons, and bare addresses, which Gmail turns
    into links by itself), details filled with the sample person. Hosts only, lowercase.
    Used to keep emails sent from team.testoza.com on our own sites.
    The unfilled text is scanned too: a detail's fallback ({first_name|https://…}) is what
    people without that detail receive.
    """
    raw = f"{subject}\n\n{body}"
    text = fill(raw, person_vars(SAMPLE_PERSON))
    urls = [m.group(2) for m in _LINK.finditer(text)]
    urls += [m.group(2) for block in _blocks(text) if (m := _BUTTON.match(block.strip()))]
    urls += _BARE_URL.findall(text) + _BARE_URL.findall(raw)
    hosts: List[str] = []
    for u in urls:
        u = u.strip()
        if u.lower().startswith("www."):
            u = "https://" + u
        try:
            host = (urlsplit(u).hostname or "").lower()
        except ValueError:
            host = ""
        host = host or u[:60].lower()  # mailto:, javascript: and the like: name them as written
        if host not in hosts:
            hosts.append(host)
    return hosts


def check_template(subject: str, body: str) -> Tuple[bool, List[str]]:
    """Render with the sample person: (ok, warnings). Used before saving an edit."""
    out = render(subject, "", body, SAMPLE_PERSON)
    return (not any("isn't a detail" in w for w in out["warnings"]), out["warnings"])
