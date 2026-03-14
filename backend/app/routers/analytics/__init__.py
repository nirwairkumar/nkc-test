from fastapi import APIRouter
from . import track, stats, advanced

router = APIRouter()

router.include_router(track.router, tags=["Analytics Tracking"])
router.include_router(stats.router, prefix="/stats", tags=["Analytics Dashboard"])
router.include_router(advanced.router, prefix="/stats", tags=["Advanced Analytics"])
