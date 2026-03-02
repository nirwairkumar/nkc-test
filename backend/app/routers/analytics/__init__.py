from fastapi import APIRouter
from . import track, stats

router = APIRouter()

router.include_router(track.router, tags=["Analytics Tracking"])
router.include_router(stats.router, prefix="/stats", tags=["Analytics Dashboard"])
