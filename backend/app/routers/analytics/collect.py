"""
POST /api/analytics/collect — the analytics v2 beacon endpoint (public, rate-limited).

The browser sends `text/plain` JSON through navigator.sendBeacon, which needs no
CORS preflight, so the body is read raw and validated here. One beacon becomes
one database call: public.analytics_ingest() applies the visitor, session and
all events atomically.

Privacy: the IP address is used only by the rate limiter (in memory) and by
Cloudflare at the edge for location; it is never stored or sent anywhere else.
"""

import json
import logging
from typing import Annotated, Dict, List, Literal, Optional, Union
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field, ValidationError, field_validator
from starlette.concurrency import run_in_threadpool

from app.core.config import ALLOWED_ORIGINS
from app.core.database import supabase
from app.utils.rate_limiter import check_analytics_rate_limit

from . import enrich

router = APIRouter()
logger = logging.getLogger(__name__)

MAX_BODY_BYTES = 16 * 1024
MAX_EVENTS = 20


class PageviewEvent(BaseModel):
    t: Literal["pageview"]
    id: UUID
    path: str = Field(..., max_length=2000)
    title: Optional[str] = Field(None, max_length=300)


class EngagementEvent(BaseModel):
    t: Literal["engagement"]
    id: UUID
    ms: int = Field(0, ge=0, le=86_400_000)
    scroll: Optional[int] = Field(None, ge=0, le=100)
    title: Optional[str] = Field(None, max_length=300)


PropValue = Union[str, int, float, bool, None]


class CustomEvent(BaseModel):
    t: Literal["event"]
    name: str = Field(..., pattern=r"^[a-z][a-z0-9_]{1,39}$")
    props: Optional[Dict[str, PropValue]] = None
    pvid: Optional[UUID] = None
    path: Optional[str] = Field(None, max_length=2000)

    @field_validator("props")
    @classmethod
    def small_props(cls, v):
        if v is None:
            return v
        if len(v) > 12:
            raise ValueError("too many props")
        clean = {}
        for key, value in v.items():
            if not isinstance(key, str) or not key or len(key) > 40:
                raise ValueError("bad prop key")
            clean[key] = value[:200] if isinstance(value, str) else value
        return clean


class IdentifyEvent(BaseModel):
    t: Literal["identify"]


AnyEvent = Annotated[Union[PageviewEvent, EngagementEvent, CustomEvent, IdentifyEvent], Field(discriminator="t")]


class Utm(BaseModel):
    source: Optional[str] = Field(None, max_length=150)
    medium: Optional[str] = Field(None, max_length=150)
    campaign: Optional[str] = Field(None, max_length=150)
    term: Optional[str] = Field(None, max_length=150)
    content: Optional[str] = Field(None, max_length=150)


class Beacon(BaseModel):
    v: Literal[2]
    vid: UUID
    sid: UUID
    uid: Optional[UUID] = None
    host: str = Field(..., max_length=253)
    path: str = Field("/", max_length=2000)
    referrer: Optional[str] = Field(None, max_length=2000)
    utm: Optional[Utm] = None
    paid: bool = False                   # a Google Ads click id was on the landing URL
    sw: Optional[int] = Field(None, ge=0, le=20000)
    sh: Optional[int] = Field(None, ge=0, le=20000)
    lang: Optional[str] = Field(None, max_length=35)
    tz: Optional[str] = Field(None, max_length=64)
    webdriver: bool = False
    internal: bool = False               # the device opted out with ?tz_internal=1
    events: List[AnyEvent] = Field(default_factory=list, max_length=MAX_EVENTS)


async def _read_body(request: Request) -> Optional[bytes]:
    """Read at most MAX_BODY_BYTES; None when the body is larger."""
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_BODY_BYTES:
        return None
    chunks, size = [], 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_BODY_BYTES:
            return None
        chunks.append(chunk)
    return b"".join(chunks)


def build_ingest_payload(beacon: Beacon, host: str, headers) -> dict:
    """Validated beacon + request headers → the jsonb analytics_ingest() expects."""
    ua_string = headers.get("user-agent", "")
    device = enrich.parse_device(ua_string)
    bot_reason = enrich.detect_bot(ua_string, device.pop("_ua_is_bot"), beacon.webdriver)

    ref_host, ref_path = enrich.parse_referrer(beacon.referrer)
    utm = beacon.utm.model_dump() if beacon.utm else {}
    utm = {k: (v.strip()[:150] if isinstance(v, str) and v.strip() else None) for k, v in utm.items()}
    channel = enrich.classify_channel(ref_host, utm, beacon.paid)
    if enrich.is_own_host(ref_host):
        ref_host, ref_path = None, None  # moving between our own sites is not a referral

    screen = f"{beacon.sw}x{beacon.sh}" if beacon.sw and beacon.sh else None
    events = []
    for e in beacon.events:
        item = e.model_dump(mode="json", exclude_none=True)
        if "path" in item:
            item["path"] = enrich.normalize_path(item["path"])
        events.append(item)

    return {
        "vid": str(beacon.vid),
        "sid": str(beacon.sid),
        "uid": str(beacon.uid) if beacon.uid else None,
        "host": host,
        "path": enrich.normalize_path(beacon.path),
        "internal": beacon.internal or host in enrich.INTERNAL_HOSTS,
        "bot": bot_reason is not None,
        "bot_reason": bot_reason,
        "ctx": {
            "channel": channel,
            "referrer_host": ref_host,
            "referrer_path": ref_path,
            "utm_source": utm.get("source"),
            "utm_medium": utm.get("medium"),
            "utm_campaign": utm.get("campaign"),
            "utm_term": utm.get("term"),
            "utm_content": utm.get("content"),
            **enrich.geo_from_headers(headers),
            **device,
            "screen": screen,
            "language": beacon.lang,
            "timezone": beacon.tz,
        },
        "events": events,
    }


def _ingest(payload: dict) -> None:
    supabase.rpc("analytics_ingest", {"p": payload}).execute()


@router.post("/collect", status_code=204, dependencies=[Depends(check_analytics_rate_limit)])
async def collect(request: Request):
    """
    Always answers 204: a beacon has nobody to report errors to, and a uniform
    answer gives probing scripts nothing to learn from. Problems are logged.
    """
    origin = request.headers.get("origin")
    if origin and origin.rstrip("/") not in ALLOWED_ORIGINS:
        return Response(status_code=204)

    body = await _read_body(request)
    if not body:
        return Response(status_code=204)

    try:
        beacon = Beacon.model_validate(json.loads(body))
    except (ValueError, ValidationError) as exc:
        logger.info("analytics beacon rejected: %s", str(exc)[:300])
        return Response(status_code=204)

    host = enrich.normalize_host(beacon.host)
    if not host or not beacon.events:
        return Response(status_code=204)

    payload = build_ingest_payload(beacon, host, request.headers)
    try:
        # One short RPC; running it in the request (not a background task) keeps
        # Cloud Run from throttling CPU after the response has been sent.
        await run_in_threadpool(_ingest, payload)
    except Exception as exc:
        logger.warning("analytics ingest failed: %s", str(exc)[:300])
    return Response(status_code=204)
