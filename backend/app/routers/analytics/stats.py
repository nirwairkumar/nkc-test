from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db, supabase
from supabase import Client
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter()

@router.get("/overview")
async def get_analytics_overview(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Compute visitor stats LIVE from raw tables (visitors, sessions, page_views).
    No dependency on a pre-aggregated daily_stats table.
    """
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    try:
        # Count unique visitors
        visitors_res = supabase.table("visitors").select("id", count="exact").gte("created_at", start_date).limit(0).execute()
        total_visitors = visitors_res.count if hasattr(visitors_res, 'count') and visitors_res.count is not None else 0

        # Count sessions
        sessions_res = supabase.table("sessions").select("id", count="exact").gte("created_at", start_date).limit(0).execute()
        total_sessions = sessions_res.count if hasattr(sessions_res, 'count') and sessions_res.count is not None else 0

        # Count page views
        page_views_res = supabase.table("page_views").select("id", count="exact").gte("created_at", start_date).limit(0).execute()
        total_page_views = page_views_res.count if hasattr(page_views_res, 'count') and page_views_res.count is not None else 0

        # Bounce rate
        bounce_res = supabase.table("sessions").select("id", count="exact").gte("created_at", start_date).eq("is_bounce", True).limit(0).execute()
        bounce_count = bounce_res.count if hasattr(bounce_res, 'count') and bounce_res.count is not None else 0
        
        bounce_rate = round((bounce_count / total_sessions * 100), 2) if total_sessions > 0 else 0

        return {
            "total_visitors": total_visitors,
            "total_page_views": total_page_views,
            "total_sessions": total_sessions,
            "bounce_rate": bounce_rate
        }
    except Exception as e:
        print(f"Error in analytics overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/daily")
async def get_daily_trends(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Compute daily trend from raw page_views and visitors tables.
    """
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    try:
        # Get page views with date
        pv_res = supabase.table("page_views")\
            .select("created_at")\
            .gte("created_at", start_date)\
            .order("created_at", desc=False)\
            .execute()

        # Get visitors with date
        v_res = supabase.table("visitors")\
            .select("created_at")\
            .gte("created_at", start_date)\
            .order("created_at", desc=False)\
            .execute()

        # Get sessions with date
        s_res = supabase.table("sessions")\
            .select("created_at")\
            .gte("created_at", start_date)\
            .order("created_at", desc=False)\
            .execute()

        # Aggregate by day
        daily: dict = defaultdict(lambda: {"total_page_views": 0, "total_visitors": 0, "total_sessions": 0})

        for pv in (pv_res.data or []):
            day = (pv.get("created_at") or "")[:10]
            if day:
                daily[day]["total_page_views"] += 1

        for v in (v_res.data or []):
            day = (v.get("created_at") or "")[:10]
            if day:
                daily[day]["total_visitors"] += 1

        for s in (s_res.data or []):
            day = (s.get("created_at") or "")[:10]
            if day:
                daily[day]["total_sessions"] += 1

        result = [
            {"stat_date": date, **counts}
            for date, counts in sorted(daily.items())
        ]
        return result

    except Exception as e:
        print(f"Error in daily trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/pages")
async def get_top_pages(
    days: int = 30,
    limit: int = 10,
    db: Client = Depends(get_db)
):
    """
    Get top pages by view count from raw page_views.
    """
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    try:
        pv_res = supabase.table("page_views")\
            .select("page_path")\
            .gte("created_at", start_date)\
            .execute()

        page_counts: dict = defaultdict(int)
        for pv in (pv_res.data or []):
            path = pv.get("page_path", "/")
            page_counts[path] += 1

        result = sorted(
            [{"path": path, "views": count} for path, count in page_counts.items()],
            key=lambda x: x["views"],
            reverse=True
        )
        return result[:limit]

    except Exception as e:
        print(f"Error in top pages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/referrers")
async def get_top_referrers(
    days: int = 30,
    db: Client = Depends(get_db)
):
    """
    Get top referrers from raw sessions table.
    """
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    try:
        s_res = supabase.table("sessions")\
            .select("referrer")\
            .gte("created_at", start_date)\
            .execute()

        ref_counts: dict = defaultdict(int)
        for s in (s_res.data or []):
            ref = s.get("referrer") or "Direct"
            if not ref or ref.strip() == "":
                ref = "Direct"
            ref_counts[ref] += 1

        result = sorted(
            [{"source": src, "count": count} for src, count in ref_counts.items()],
            key=lambda x: x["count"],
            reverse=True
        )
        return result[:10]

    except Exception as e:
        print(f"Error in referrers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live")
async def get_live_visitors(
    db: Client = Depends(get_db)
):
    """
    Active visitors in the last 5 minutes.
    """
    five_mins_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    try:
        active = supabase.table("sessions")\
            .select("id", count="exact")\
            .gte("ended_at", five_mins_ago)\
            .execute()
        return {"live_visitors": active.count if hasattr(active, 'count') and active.count else 0}
    except Exception as e:
        return {"live_visitors": 0}
