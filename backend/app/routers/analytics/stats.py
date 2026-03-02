from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.main import get_current_user  # Assuming get_current_user logic exists in main
from supabase import Client
from datetime import datetime, timedelta
from typing import List

router = APIRouter()

# Dependency to check if user is an admin
def require_admin(user = Depends(get_current_user), db: Client = Depends(get_db)):
    # Check admin role from profiles/admins table or JWT
    # Simplified mock approach for this example:
    try:
        admin_check = db.table("admins").select("id").eq("user_id", user.id).execute()
        if not admin_check.data:
            raise HTTPException(status_code=403, detail="Admin privileges required")
    except Exception:
        # Fallback if admins table doesn't exist, check app metadata role
        if getattr(user, 'app_metadata', {}).get('role') != 'admin':
             raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

@router.get("/overview")
async def get_analytics_overview(
    days: int = 30,
    user = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """
    Get high-level overview metrics for the dashboard.
    """
    start_date = (datetime.utcnow() - timedelta(days=days)).date()
    
    try:
        stats = db.table("daily_stats").select("*").gte("stat_date", str(start_date)).order("stat_date", desc=True).execute()
        
        if not stats.data:
            return {
                "total_visitors": 0,
                "total_page_views": 0,
                "total_sessions": 0,
                "bounce_rate": 0
            }
            
        # Aggregate the daily stats
        total_visitors = sum([day["new_visitors"] for day in stats.data])
        total_page_views = sum([day["total_page_views"] for day in stats.data])
        total_sessions = sum([day["total_sessions"] for day in stats.data])
        
        # Weighted average bounce rate
        if total_sessions > 0:
            bounce_rate = sum([day["bounce_rate"] * day["total_sessions"] for day in stats.data]) / total_sessions
        else:
            bounce_rate = 0
            
        return {
            "total_visitors": total_visitors,
            "total_page_views": total_page_views,
            "total_sessions": total_sessions,
            "bounce_rate": round(bounce_rate, 2)
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/daily")
async def get_daily_trends(
    days: int = 30,
    user = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """
    Get daily breakdown for charts.
    """
    start_date = (datetime.utcnow() - timedelta(days=days)).date()
    stats = db.table("daily_stats").select("*").gte("stat_date", str(start_date)).order("stat_date", desc=False).execute()
    return stats.data

@router.get("/pages")
async def get_top_pages(
    days: int = 30,
    limit: int = 10,
    user = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """
    Get top pages by view count. This normally aggregates from daily_stats.top_pages
    or raw page_views depending on scale.
    """
    # Simplified approach: query raw page views for accuracy (if scale is med/small)
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Supabase grouping isn't natively supported via Rest API like this easily
    # So we call an RPC function or do it via raw SQL on the server.
    # For now, returning mock structure to fit the plan
    return [
         {"path": "/", "views": 1520},
         {"path": "/tests", "views": 850},
         {"path": "/generate-with-ai", "views": 420},
    ]

@router.get("/referrers")
async def get_top_referrers(
    days: int = 30,
    user = Depends(require_admin),
    db: Client = Depends(get_db)
):
    # Mocking implementation per plan
    return [
         {"source": "Direct", "count": 1200},
         {"source": "Google", "count": 850},
         {"source": "Twitter", "count": 320},
    ]

@router.get("/live")
async def get_live_visitors(
    user = Depends(require_admin),
    db: Client = Depends(get_db)
):
    """
    Active visitors in the last 5 minutes.
    """
    five_mins_ago = (datetime.utcnow() - timedelta(minutes=5)).isoformat()
    try:
        active = db.table("sessions").select("id", count="exact").gte("ended_at", five_mins_ago).execute()
        return {"live_visitors": active.count if hasattr(active, 'count') else 0}
    except Exception as e:
        return {"live_visitors": 0}
