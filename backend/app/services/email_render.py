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
    "app": {"label": "app.testoza.com", "sample": APP_ORIGIN},
    "site": {"label": "testoza.com", "sample": SITE_ORIGIN},
}

SAMPLE_PERSON: Dict[str, Any] = {
    "id": None, "email": "asha@example.in", "full_name": "Asha Verma", "tests_created": 3, "results": 64,
    "latest_test_title": "Physics Chapter 3 Test", "top_test_title": "Weekly Mock 4", "top_test_results": 38,
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


def person_vars(p: Dict[str, Any]) -> Dict[str, str]:
    def s(v: Any) -> str:
        return "" if v is None else str(v).strip()

    return {
        "first_name": first_name_of(p.get("full_name")),
        "name": s(p.get("full_name")),
        "email": s(p.get("email")),
        "test_title": s(p.get("latest_test_title")),
        "top_test_title": s(p.get("top_test_title")),
        "top_test_results": s(p.get("top_test_results") or ""),
        "tests_created": s(p.get("tests_created") or 0),
        "results": s(p.get("results") or 0),
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


def tag_link(url: str, campaign_key: Optional[str], campaign_tag: Optional[str]) -> str:
    """utm tags on our own links, so a click shows up in analytics (and in History)."""
    parts = urlsplit(url)
    host = (parts.hostname or "").lower()
    if not campaign_key or not (host == "testoza.com" or host.endswith(".testoza.com")):
        return url
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    if "utm_source" in query:
        return url
    query.update({
        "utm_source": "email",
        "utm_medium": "broadcast",
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
            parts.append(
                '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 22px;">'
                f'<tr><td style="border-radius:12px;background:{ACCENT};">'
                f'<a href="{html.escape(link(url))}" style="display:inline-block;padding:13px 22px;font-family:{FONT};'
                f'font-size:15px;font-weight:600;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:12px;">'
                f"{label}</a></td></tr></table>"
            )
        elif all(line.lstrip().startswith("- ") for line in lines):
            items = "".join(
                f'<li style="margin:0 0 8px;">{_inline_html(line.lstrip()[2:], values, link, warnings)}</li>'
                for line in lines
            )
            parts.append(f'<ul style="margin:0 0 18px;padding-left:22px;">{items}</ul>')
        else:
            parts.append(f'<p style="margin:0 0 16px;">{_inline_html(block, values, link, warnings)}</p>')
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
        out.append(text)
    return "\n\n".join(out)


def shell(content: str, preheader: str, unsubscribe: str, title: str) -> str:
    # Spacer characters after the preheader keep mail apps from pulling body text into the preview line.
    spacer = "&#8199;&#847; " * 40
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>{html.escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">{html.escape(preheader)}{spacer}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;">
<tr><td style="padding:26px 28px 6px;font-family:{FONT};font-size:14px;font-weight:700;letter-spacing:-0.01em;color:{ACCENT};">TestoZa</td></tr>
<tr><td style="padding:10px 28px 12px;font-family:{FONT};font-size:16px;line-height:1.6;color:#0f172a;">
{content}
</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:16px 28px 8px;font-family:{FONT};font-size:12px;line-height:1.6;color:#64748b;text-align:center;">
You're getting this because you have a TestoZa account.
<a href="{html.escape(unsubscribe)}" style="color:#64748b;text-decoration:underline;">Unsubscribe</a><br>
TestoZa · testoza.com · {SUPPORT_EMAIL}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""


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
        "preheader": final_pre,
        "html": shell(content, final_pre, unsub, final_subject),
        "text": text,
        "warnings": seen,
    }


def check_template(subject: str, body: str) -> Tuple[bool, List[str]]:
    """Render with the sample person: (ok, warnings). Used before saving an edit."""
    out = render(subject, "", body, SAMPLE_PERSON)
    return (not any("isn't a detail" in w for w in out["warnings"]), out["warnings"])
