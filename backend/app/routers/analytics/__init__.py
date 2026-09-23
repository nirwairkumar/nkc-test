from fastapi import APIRouter, Depends, Request
from . import track, stats, advanced
from app.core.auth import verify_is_admin

router = APIRouter()


def _require_admin(request: Request) -> None:
    """
    C5 / H3: every /api/analytics/stats/* endpoint is an admin dashboard — funnels,
    attempt logs with per-candidate timelines, visitor geolocation and session tokens,
    and the user matrix (profile PII). They had no auth at all, and because the backend
    talks to Supabase with the service-role key, RLS did not cover them either.

    Applied as a router-level dependency so a newly added dashboard route is guarded by
    default instead of being forgotten.
    """
    verify_is_admin(request)


# Tracking stays public: the browser beacon posts to it (rate-limited in track.py).
router.include_router(track.router, tags=["Analytics Tracking"])

router.include_router(
    stats.router, prefix="/stats", tags=["Analytics Dashboard"],
    dependencies=[Depends(_require_admin)],
)
router.include_router(
    advanced.router, prefix="/stats", tags=["Advanced Analytics"],
    dependencies=[Depends(_require_admin)],
)
