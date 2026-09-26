"""
Server-side enrichment for analytics v2 beacons: device / browser / OS from the
User-Agent, bot detection, marketing channel from referrer + UTM tags, and
location from Cloudflare's edge headers.

Everything here is pure (no I/O) so it can be unit-tested without a database.
Design notes: documentation/2026-09-26-analytics-v2.md.
"""

from typing import Mapping, Optional
from urllib.parse import urlsplit

from user_agents import parse as parse_ua

# ── Sites ──────────────────────────────────────────────────────────────────────
# Beacons from any other host (previews, copies of the site, scripts) are dropped.
TRACKED_HOSTS = {
    "testoza.com", "blog.testoza.com", "news.testoza.com", "pdf.testoza.com", "app.testoza.com",
}
# Real hosts whose traffic is ours, not users'.
INTERNAL_HOSTS = {"testing.testoza.com"}
OWN_DOMAIN = "testoza.com"


def normalize_host(host: Optional[str]) -> Optional[str]:
    """Lower-case, strip port and a leading "www."; None when not a TestoZa site."""
    if not host:
        return None
    h = host.strip().lower().split(":")[0]
    if h.startswith("www."):
        h = h[4:]
    if h in TRACKED_HOSTS or h in INTERNAL_HOSTS:
        return h
    return None


def normalize_path(path: Optional[str]) -> str:
    """Path only (never the query string or hash), no trailing slash except root."""
    p = (path or "/").split("?", 1)[0].split("#", 1)[0].strip() or "/"
    if not p.startswith("/"):
        p = "/" + p
    if len(p) > 1:
        p = p.rstrip("/") or "/"
    return p[:500]


# ── User agent ─────────────────────────────────────────────────────────────────
_BROWSER_NAMES = {
    "Chrome Mobile": "Chrome",
    "Chrome Mobile iOS": "Chrome",
    "Chrome Mobile WebView": "Android WebView",
    "Mobile Safari": "Safari",
    "Mobile Safari UI/WKWebView": "Safari (in-app)",
    "Firefox Mobile": "Firefox",
    "Firefox iOS": "Firefox",
    "Edge Mobile": "Edge",
    "Opera Mobile": "Opera",
    "Facebook": "Facebook in-app",
    "Instagram": "Instagram in-app",
}
_OS_NAMES = {"Mac OS X": "macOS", "Chrome OS": "ChromeOS"}


def parse_device(ua_string: str) -> dict:
    ua = parse_ua(ua_string or "")
    if ua.is_tablet:
        device = "tablet"
    elif ua.is_mobile:
        device = "mobile"
    elif ua.is_pc:
        device = "desktop"
    else:
        device = "other"

    browser = _BROWSER_NAMES.get(ua.browser.family, ua.browser.family) or "Other"
    os_name = _OS_NAMES.get(ua.os.family, ua.os.family) or "Other"
    browser_major = (ua.browser.version_string or "").split(".")[0] or None
    # "Windows NT 10.0" is both 10 and 11, and Chrome freezes Android at "10" and
    # macOS at "10.15.7" — only iOS reports a version that means something.
    os_major = (ua.os.version_string or "").split(".")[0] if os_name == "iOS" else None
    return {
        "device_type": device,
        "browser": browser[:40],
        "browser_version": browser_major,
        "os": os_name[:40],
        "os_version": os_major or None,
        "_ua_is_bot": bool(ua.is_bot),
    }


# ── Bots ───────────────────────────────────────────────────────────────────────
# Most crawlers never run JavaScript, so they never reach this endpoint; these
# rules catch the ones that do (rendering crawlers, headless browsers, scripts).
_BOT_KEYWORDS = (
    # AI crawlers / assistants fetching pages
    "gptbot", "chatgpt-user", "oai-searchbot", "claudebot", "claude-user", "claude-searchbot",
    "anthropic-ai", "perplexitybot", "perplexity-user", "bytespider", "ccbot", "diffbot",
    "cohere-ai", "meta-externalagent", "meta-externalfetcher", "google-extended", "applebot",
    "amazonbot", "youbot", "duckassistbot", "mistralai-user",
    # search / SEO / social previews
    "googlebot", "google-inspectiontool", "adsbot-google", "mediapartners-google", "storebot-google",
    "bingbot", "bingpreview", "yandex", "baiduspider", "duckduckbot", "slurp", "sogou", "petalbot",
    "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "screaming frog", "seznambot",
    "facebookexternalhit", "facebookcatalog", "twitterbot", "linkedinbot", "slackbot", "discordbot",
    "whatsapp/", "telegrambot", "pinterestbot", "redditbot", "skypeuripreview",
    # tooling / automation
    "headlesschrome", "lighthouse", "chrome-lighthouse", "pagespeed", "gtmetrix", "pingdom",
    "uptimerobot", "statuscake", "puppeteer", "playwright", "selenium", "phantomjs", "cypress",
    "python-requests", "python-httpx", "aiohttp", "curl/", "wget/", "go-http-client",
    "java/", "okhttp", "apache-httpclient", "libwww-perl", "scrapy", "node-fetch", "axios/",
)


def detect_bot(ua_string: str, ua_is_bot: bool, webdriver: bool) -> Optional[str]:
    """Return a short reason when the beacon is automated, else None."""
    ua_lower = (ua_string or "").lower()
    if not ua_lower.strip():
        return "empty user agent"
    for keyword in _BOT_KEYWORDS:
        if keyword in ua_lower:
            return keyword.strip("/ ")
    if webdriver:
        return "webdriver"
    if ua_is_bot or "bot" in ua_lower or "crawler" in ua_lower or "spider" in ua_lower:
        return "bot user agent"
    return None


# ── Channels ───────────────────────────────────────────────────────────────────
_SEARCH = (
    "google.", "bing.com", "duckduckgo.com", "search.yahoo.", "yahoo.com", "yandex.", "baidu.com",
    "ecosia.org", "search.brave.com", "startpage.com", "naver.com", "qwant.com", "sogou.com", "seznam.cz",
)
_AI = (
    "chatgpt.com", "chat.openai.com", "openai.com", "perplexity.ai", "gemini.google.com",
    "bard.google.com", "copilot.microsoft.com", "claude.ai", "you.com", "phind.com",
    "chat.deepseek.com", "deepseek.com", "meta.ai", "grok.com", "x.ai", "chat.mistral.ai",
    "poe.com", "kimi.com", "doubao.com",
)
_AI_SOURCES = ("chatgpt", "openai", "perplexity", "gemini", "claude", "copilot", "deepseek", "grok", "meta.ai")
_SOCIAL = (
    "facebook.com", "fb.com", "instagram.com", "t.co", "twitter.com", "x.com", "linkedin.com",
    "lnkd.in", "youtube.com", "youtu.be", "reddit.com", "pinterest.", "quora.com", "whatsapp.com",
    "wa.me", "t.me", "telegram.org", "telegram.me", "threads.net", "snapchat.com", "discord.com",
    "sharechat.com", "koo.in", "tiktok.com", "tumblr.com", "medium.com",
)
_SOCIAL_SOURCES = (
    "whatsapp", "facebook", "fb", "instagram", "ig", "telegram", "twitter", "x", "linkedin", "youtube",
    "reddit", "pinterest", "quora", "threads", "snapchat", "discord", "sharechat",
)
_EMAIL = ("mail.google.com", "outlook.live.com", "outlook.office.com", "mail.yahoo.com", "mail.zoho.com")
_AUTH = ("accounts.google.com", "accounts.youtube.com", "appleid.apple.com", "github.com/login")
_PAID_MEDIUMS = {"cpc", "ppc", "paid", "paidsearch", "paid_search", "paid-search", "cpm", "display",
                 "banner", "paid_social", "paidsocial", "paid-social", "ads", "ad"}
_ANDROID_APPS = {
    "com.google.android.googlequicksearchbox": "google.com",
    "com.google.android.gm": "mail.google.com",
    "com.google.android.youtube": "youtube.com",
    "org.telegram.messenger": "t.me",
    "com.linkedin.android": "linkedin.com",
    "com.facebook.katana": "facebook.com",
    "com.instagram.android": "instagram.com",
    "com.twitter.android": "x.com",
    "com.reddit.frontpage": "reddit.com",
    "com.whatsapp": "whatsapp.com",
}
_HOST_PREFIXES = ("www.", "m.", "l.", "lm.", "mobile.", "amp.", "mbasic.", "web.")


def _matches(host: str, patterns) -> bool:
    """"bing.com" matches bing.com and *.bing.com; "google." matches google.<any TLD> only."""
    return any(host.startswith(p) if p.endswith(".") else (host == p or host.endswith("." + p))
               for p in patterns)


def parse_referrer(referrer: Optional[str]) -> tuple:
    """(host, path) of the referring page — never its query string."""
    if not referrer:
        return None, None
    ref = referrer.strip()[:1000]
    if ref.startswith("android-app://"):
        package = ref[len("android-app://"):].split("/", 1)[0].lower()
        return _ANDROID_APPS.get(package, package[:100] or None), None
    try:
        parts = urlsplit(ref)
    except ValueError:
        return None, None
    host = (parts.hostname or "").lower()
    if not host:
        return None, None
    for prefix in _HOST_PREFIXES:
        if host.startswith(prefix) and host.count(".") >= 2:
            host = host[len(prefix):]
            break
    path = normalize_path(parts.path) if parts.path else None
    return host[:100], (path[:200] if path and path != "/" else None)


def is_own_host(host: Optional[str]) -> bool:
    return bool(host) and (host == OWN_DOMAIN or host.endswith("." + OWN_DOMAIN))


def classify_channel(ref_host: Optional[str], utm: Mapping[str, Optional[str]], paid_click: bool = False) -> str:
    """GA4-style default channel grouping, plus an "AI assistants" channel."""
    source = (utm.get("source") or "").lower()
    medium = (utm.get("medium") or "").lower()
    host = (ref_host or "").lower()

    if paid_click or medium in _PAID_MEDIUMS:
        return "Paid"
    if medium in ("email", "e-mail", "newsletter") or "newsletter" in source or source in ("email", "gmail"):
        return "Email"
    if (host and _matches(host, _AI)) or any(s in source for s in _AI_SOURCES):
        return "AI assistants"
    if medium in ("social", "social-network", "social_network", "sm", "share") or source in _SOCIAL_SOURCES:
        return "Social"
    if medium == "organic":
        return "Organic search"
    if medium in ("referral", "affiliate", "partner"):
        return "Referral"
    if source or medium:
        return "Other campaign"
    if not host or is_own_host(host) or _matches(host, _AUTH):
        return "Direct"
    if _matches(host, _EMAIL):
        return "Email"
    if _matches(host, _SEARCH):
        return "Organic search"
    if _matches(host, _SOCIAL):
        return "Social"
    return "Referral"


# ── Location (Cloudflare edge headers — the IP address is never stored) ─────────
def _header_text(value: Optional[str]) -> Optional[str]:
    """Cloudflare sends city/region as raw UTF-8; Starlette decodes headers as latin-1."""
    if not value:
        return None
    try:
        value = value.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    value = value.strip()
    return value[:80] or None


def geo_from_headers(headers: Mapping[str, str]) -> dict:
    """
    Country always (CF-IPCountry). City and region need Cloudflare → Rules →
    Transform Rules → Managed Transforms → "Add visitor location headers".
    """
    country = (headers.get("cf-ipcountry") or "").strip().upper()
    if len(country) != 2 or country == "XX":
        country = None
    return {
        "country_code": country,
        "region": _header_text(headers.get("cf-region")),
        "city": _header_text(headers.get("cf-ipcity")),
    }
