"""
Where the visitor is, to the state/province — used by the test builder to put the
local typing language first (Maharashtra → Marathi, then Hindi; Dhaka → Bengali).

Same Cloudflare visitor-location headers the analytics beacon reads; nothing is
stored. City is left out on purpose: a language pick never needs it.
"""
from typing import Optional

from fastapi import APIRouter, Depends, Request, Response

from app.routers.analytics.enrich import _header_text, geo_from_headers
from app.utils.rate_limiter import check_analytics_rate_limit

router = APIRouter()


@router.get("", dependencies=[Depends(check_analytics_rate_limit)])
async def visitor_locale(request: Request, response: Response, tz: Optional[str] = None):
    geo = geo_from_headers(request.headers, tz)
    # The browser keeps it for a day; it is the visitor's own location, never shared.
    response.headers["Cache-Control"] = "private, max-age=86400"
    return {
        "country": geo["country_code"],
        "region": geo["region"],
        "region_code": _header_text(request.headers.get("cf-region-code")),
    }
