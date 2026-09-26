"""
GET /api/analytics/v2/* — admin reports for analytics v2 (admin-only via the
router dependency in __init__.py).

All aggregation runs in Postgres (public.analytics_report_* functions), so there
is no 1,000-row API cap and every number is computed over the full period.
Periods are calendar-aligned in IST and compared with the same span before.
"""

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.database import supabase

router = APIRouter()
logger = logging.getLogger(__name__)

IST = timezone(timedelta(hours=5, minutes=30))  # India has no DST
# Site groups (SQL analytics_site_of): main = testoza.com + app.testoza.com.
SITES = {"all": None, "main": "main", "pdf": "pdf", "blog": "blog"}
PERIODS = ("today", "yesterday", "7d", "30d", "90d", "12m", "custom")
DIMENSIONS = (
    "page", "channel", "referrer", "utm_source", "utm_medium", "utm_campaign", "country", "region",
    "city", "device", "browser", "os", "screen", "language", "entry", "exit", "landing_type", "host",
    "visitor_type",
)
NOT_INSTALLED = "analytics_v2_not_installed"

_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="analytics-report")


# ── helpers ────────────────────────────────────────────────────────────────────
def _rpc(fn: str, params: Dict[str, Any]) -> Any:
    try:
        return supabase.rpc(fn, params).execute().data
    except Exception as exc:
        text = str(exc)
        if "PGRST202" in text or "Could not find the function" in text:
            # 424: the global handler masks 5xx details, and the admin UI needs this code.
            raise HTTPException(status_code=424, detail=NOT_INSTALLED)
        logger.error("analytics report %s failed: %s", fn, text[:500])
        raise HTTPException(status_code=502, detail="Analytics query failed")


def _parallel(calls: Dict[str, Tuple[str, Dict[str, Any]]]) -> Dict[str, Any]:
    futures = {key: _pool.submit(_rpc, fn, params) for key, (fn, params) in calls.items()}
    return {key: fut.result() for key, fut in futures.items()}


def _midnight(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, tzinfo=IST)


def resolve_period(period: str, start: Optional[str] = None, end: Optional[str] = None,
                   now: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Calendar periods in IST. `to` is "now" for periods that include today, so the
    comparison period covers the same elapsed time (today until 3 pm vs yesterday
    until 3 pm), which keeps the change percentages fair.
    """
    now = (now or datetime.now(timezone.utc)).astimezone(IST)
    today = now.date()

    if period == "today":
        frm, to, shift = _midnight(today), now, timedelta(days=1)
    elif period == "yesterday":
        frm, to, shift = _midnight(today - timedelta(days=1)), _midnight(today), timedelta(days=1)
    elif period in ("7d", "30d", "90d"):
        days = int(period[:-1])
        frm, to, shift = _midnight(today - timedelta(days=days - 1)), now, timedelta(days=days)
    elif period == "12m":
        first = date(today.year, today.month, 1)
        y, m = first.year, first.month - 11
        while m <= 0:
            y, m = y - 1, m + 12
        frm, to = _midnight(date(y, m, 1)), now
        shift = frm - _midnight(date(y - 1, m, 1))
    elif period == "custom":
        try:
            d1 = date.fromisoformat(start or "")
            d2 = date.fromisoformat(end or "")
        except ValueError:
            raise HTTPException(status_code=400, detail="start and end must be YYYY-MM-DD")
        if d2 < d1:
            d1, d2 = d2, d1
        if (d2 - d1).days > 800:
            raise HTTPException(status_code=400, detail="Custom range is limited to 800 days")
        frm, to = _midnight(d1), min(_midnight(d2 + timedelta(days=1)), now)
        shift = timedelta(days=(d2 - d1).days + 1)
    else:
        raise HTTPException(status_code=400, detail=f"period must be one of {', '.join(PERIODS)}")

    span_days = (to - frm).total_seconds() / 86400
    if span_days <= 2:
        bucket = "hour"
    elif span_days <= 120:
        bucket = "day"
    elif span_days <= 400:
        bucket = "week" if period != "12m" else "month"
    else:
        bucket = "month"

    return {
        "period": period,
        "from": frm.isoformat(),
        "to": to.isoformat(),
        "prev_from": (frm - shift).isoformat(),
        "prev_to": (to - shift).isoformat(),
        "bucket": bucket,
        "timezone": "Asia/Kolkata",
    }


def _site(site: str) -> Optional[str]:
    if site not in SITES:
        raise HTTPException(status_code=400, detail=f"site must be one of {', '.join(SITES)}")
    return SITES[site]


def _range_args(r: Dict[str, Any], site: Optional[str], prev: bool = False) -> Dict[str, Any]:
    return {
        "p_from": r["prev_from"] if prev else r["from"],
        "p_to": r["prev_to"] if prev else r["to"],
        "p_site": site,
    }


# ── endpoints (sync: supabase-py blocks, FastAPI runs these in its threadpool) ──
@router.get("/overview")
def overview(period: str = "7d", site: str = "all", start: Optional[str] = None, end: Optional[str] = None):
    r = resolve_period(period, start, end)
    site_key = _site(site)
    cur, prev = _range_args(r, site_key), _range_args(r, site_key, prev=True)
    data = _parallel({
        "summary": ("analytics_report_summary", cur),
        "previous": ("analytics_report_summary", prev),
        "series": ("analytics_report_timeseries", {**cur, "p_bucket": r["bucket"]}),
        "prev_series": ("analytics_report_timeseries", {**prev, "p_bucket": r["bucket"]}),
        "pages": ("analytics_report_breakdown", {**cur, "p_dim": "page", "p_limit": 8}),
        "channels": ("analytics_report_breakdown", {**cur, "p_dim": "channel", "p_limit": 8}),
        "referrers": ("analytics_report_breakdown", {**cur, "p_dim": "referrer", "p_limit": 8}),
        "countries": ("analytics_report_breakdown", {**cur, "p_dim": "country", "p_limit": 8}),
        "regions": ("analytics_report_breakdown", {**cur, "p_dim": "region", "p_limit": 8}),
        "devices": ("analytics_report_breakdown", {**cur, "p_dim": "device", "p_limit": 5}),
        "landing": ("analytics_report_breakdown", {**cur, "p_dim": "landing_type", "p_limit": 8}),
    })
    return {"range": r, **data}


@router.get("/timeseries")
def timeseries(period: str = "7d", site: str = "all", bucket: Optional[str] = None,
               start: Optional[str] = None, end: Optional[str] = None):
    r = resolve_period(period, start, end)
    b = bucket or r["bucket"]
    if b not in ("hour", "day", "week", "month"):
        raise HTTPException(status_code=400, detail="bucket must be hour, day, week or month")
    return {"range": r, "series": _rpc("analytics_report_timeseries", {**_range_args(r, _site(site)), "p_bucket": b})}


@router.get("/breakdown")
def breakdown(dim: str, period: str = "7d", site: str = "all", limit: int = Query(20, ge=1, le=500),
              start: Optional[str] = None, end: Optional[str] = None):
    if dim not in DIMENSIONS:
        raise HTTPException(status_code=400, detail=f"dim must be one of {', '.join(DIMENSIONS)}")
    r = resolve_period(period, start, end)
    rows = _rpc("analytics_report_breakdown", {**_range_args(r, _site(site)), "p_dim": dim, "p_limit": limit})
    return {"range": r, "dim": dim, "rows": rows}


@router.get("/traffic")
def traffic(period: str = "7d", site: str = "all", start: Optional[str] = None, end: Optional[str] = None):
    """Everything the Traffic tab shows, in one round trip."""
    r = resolve_period(period, start, end)
    cur = _range_args(r, _site(site))
    dims = {
        "channels": ("channel", 12), "referrers": ("referrer", 25), "utm_sources": ("utm_source", 15),
        "utm_mediums": ("utm_medium", 15), "utm_campaigns": ("utm_campaign", 20),
        "landing": ("landing_type", 10), "pages": ("page", 50), "entries": ("entry", 25), "exits": ("exit", 25),
        "countries": ("country", 30), "regions": ("region", 30), "cities": ("city", 30),
        "devices": ("device", 5), "browsers": ("browser", 12), "oses": ("os", 12), "screens": ("screen", 12),
        "languages": ("language", 12), "visitor_types": ("visitor_type", 2), "hosts": ("host", 6),
    }
    calls = {key: ("analytics_report_breakdown", {**cur, "p_dim": d, "p_limit": n}) for key, (d, n) in dims.items()}
    calls["heatmap"] = ("analytics_report_heatmap", cur)
    return {"range": r, **_parallel(calls)}


@router.get("/realtime")
def realtime(site: str = "all"):
    return _rpc("analytics_report_realtime", {"p_site": _site(site)})


@router.get("/sessions")
def sessions(period: str = "7d", site: str = "all", traffic: str = "humans", q: Optional[str] = None,
             before: Optional[str] = None, limit: int = Query(50, ge=1, le=200),
             visitor: Optional[UUID] = None, user: Optional[UUID] = None,
             start: Optional[str] = None, end: Optional[str] = None):
    if traffic not in ("humans", "bots", "internal", "all"):
        raise HTTPException(status_code=400, detail="traffic must be humans, bots, internal or all")
    if before:
        try:
            datetime.fromisoformat(before.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(status_code=400, detail="before must be an ISO timestamp")
    r = resolve_period(period, start, end)
    rows = _rpc("analytics_report_sessions", {
        **_range_args(r, _site(site)),
        "p_traffic": traffic,
        "p_q": (q or "").strip()[:100] or None,
        "p_before": before,
        "p_limit": limit,
        "p_visitor": str(visitor) if visitor else None,
        "p_user": str(user) if user else None,
    })
    return {"range": r, "rows": rows, "next_before": rows[-1]["started_at"] if len(rows) == limit else None}


@router.get("/sessions/{session_id}")
def session_detail(session_id: UUID):
    return _rpc("analytics_report_session", {"p_session": str(session_id)})


@router.get("/person")
def person(visitor: Optional[UUID] = None, user: Optional[UUID] = None):
    if not visitor and not user:
        raise HTTPException(status_code=400, detail="visitor or user is required")
    return _rpc("analytics_report_person", {
        "p_visitor": str(visitor) if visitor else None,
        "p_user": str(user) if user else None,
    })


@router.get("/growth")
def growth(period: str = "30d", start: Optional[str] = None, end: Optional[str] = None):
    r = resolve_period(period, start, end)
    now = datetime.now(timezone.utc).astimezone(IST)
    monday = _midnight(now.date() - timedelta(days=now.weekday()))
    ns_from = monday - timedelta(weeks=11)
    data = _parallel({
        "growth": ("analytics_report_growth", {"p_from": r["from"], "p_to": r["to"]}),
        "previous": ("analytics_report_growth", {"p_from": r["prev_from"], "p_to": r["prev_to"]}),
        "active": ("analytics_report_active_users", {"p_from": r["from"], "p_to": r["to"]}),
        "retention": ("analytics_report_retention", {"p_weeks": 8}),
        # North Star: tests taken per week, last 12 weeks (IST Monday weeks)
        "north_star": ("analytics_report_timeseries", {
            "p_from": ns_from.isoformat(), "p_to": now.isoformat(), "p_site": None, "p_bucket": "week"}),
    })
    return {"range": r, **data}


@router.get("/tests")
def tests(period: str = "30d", limit: int = Query(25, ge=1, le=200),
          start: Optional[str] = None, end: Optional[str] = None):
    r = resolve_period(period, start, end)
    data = _parallel({
        "report": ("analytics_report_tests", {"p_from": r["from"], "p_to": r["to"], "p_limit": limit}),
        "summary": ("analytics_report_summary", _range_args(r, None)),
        "previous": ("analytics_report_summary", _range_args(r, None, prev=True)),
    })
    return {"range": r, **data["report"], "summary": data["summary"], "previous": data["previous"]}


@router.get("/health")
def health():
    return _rpc("analytics_report_health", {})
