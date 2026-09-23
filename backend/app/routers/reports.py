from fastapi import APIRouter, HTTPException, Depends, Header, Request
from app.core.database import get_db, supabase as admin_db
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.core.auth import verify_auth_token, verify_is_admin, verify_owner_or_admin, is_admin_user
import logging
from app.utils.rate_limiter import check_support_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter()

class ReportCreate(BaseModel):
    test_id: str
    question_id: int
    creator_id: str
    reason: str
    details: Optional[str] = None

class ReportStatusUpdate(BaseModel):
    status: str # "open" or "solved"

# 1. Submit a new report (Public/Anonymous allowed)
@router.post("/", dependencies=[Depends(check_support_rate_limit)])
async def submit_report(payload: ReportCreate, db: Client = Depends(get_db)):
    try:
        data_to_insert = {
            "test_id": payload.test_id,
            "question_id": payload.question_id,
            "creator_id": payload.creator_id,
            "reason": payload.reason,
            "details": payload.details,
            "status": "open"
        }
        
        # Try to get user info if they are logged in via JWT Header
        try:
            res = db.auth.get_user()
            if res and res.user:
                data_to_insert["reporter_id"] = res.user.id
        except Exception:
            pass
             
        response = db.table("question_reports").insert(data_to_insert).execute()
        
        # Add Notification for the Creator
        try:
            from app.utils.notifications import send_notification
            send_notification(
                user_id=payload.creator_id,
                title="Question Flagged",
                message=f"A student reported an issue ({payload.reason}) with Question {payload.question_id + 1}.",
                link="/my-tests?tab=reports",
                custom_test_id=payload.test_id,
                db=admin_db
            )
        except Exception as ne:
            logger.error(f"Failed to create notification: {ne}")
            
        return response.data[0] if response.data else {"success": True}
    except Exception as e:
        logger.error(f"Error submitting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get reports for a specific creator
@router.get("/creator/{creator_id}")
async def get_creator_reports(creator_id: str, request: Request, db: Client = Depends(get_db)):
    # C5: was unguarded — anyone could read any creator's question reports.
    verify_owner_or_admin(creator_id, request, db)
    try:
        # Fetch reports and join with test title to display nicely in the dashboard
        response = admin_db.table("question_reports") \
                     .select("id, created_at, test_id, question_id, reason, details, status, reporter_id, tests(title, custom_id)") \
                     .eq("creator_id", creator_id) \
                     .order("created_at", desc=True) \
                     .execute()
                     
        return response.data
    except Exception as e:
        logger.error(f"Error fetching creator reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 3. Mark report as solved (Creator or Admin)
@router.put("/{report_id}/status")
async def update_report_status(report_id: str, payload: ReportStatusUpdate, request: Request, db: Client = Depends(get_db)):
    # C5: the old comment relied on RLS, but this router talks to Supabase with the
    # service-role key, which bypasses RLS — so anyone could mark any report solved.
    requesting_user_id = verify_auth_token(request, db)
    owner_res = admin_db.table("question_reports").select("creator_id").eq("id", report_id).limit(1).execute()
    if not owner_res.data:
        raise HTTPException(status_code=404, detail="Report not found")
    if owner_res.data[0].get("creator_id") != requesting_user_id and not is_admin_user(requesting_user_id, db):
        raise HTTPException(status_code=403, detail="Unauthorized access")
    try:
        if payload.status not in ["open", "solved"]:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        response = db.table("question_reports") \
                     .update({"status": payload.status}) \
                     .eq("id", report_id) \
                     .execute()
                     
        return response.data[0] if response.data else {"success": True}
    except Exception as e:
        logger.error(f"Error updating report status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4. ADMIN ONLY: Get report stats for all users (For the Users Tab Red Dot)
@router.get("/admin/users-stats")
async def get_admin_users_report_stats(request: Request):
    verify_is_admin(request)
    try:
        # Use service role key to query all reports
        response = admin_db.table("question_reports") \
                           .select("creator_id, status") \
                           .execute()
                           
        # Aggregate by creator_id
        stats = {}
        for r in response.data:
            cid = r["creator_id"]
            if cid not in stats:
                stats[cid] = {"total": 0, "open": 0, "solved": 0}
            
            stats[cid]["total"] += 1
            if r["status"] == "open":
                stats[cid]["open"] += 1
            else:
                stats[cid]["solved"] += 1
                
        return stats
    except Exception as e:
        logger.error(f"Error fetching admin user report stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 5. ADMIN ONLY: Get detailed reports for a specific users tests (For User Profile Dialog)
@router.get("/admin/user/{user_id}")
async def get_admin_user_reports(user_id: str, request: Request):
    verify_is_admin(request)
    try:
        response = admin_db.table("question_reports") \
                           .select("id, created_at, test_id, question_id, reason, details, status, reporter_id, tests(title, custom_id)") \
                           .eq("creator_id", user_id) \
                           .order("created_at", desc=True) \
                           .execute()
                           
        return response.data
    except Exception as e:
        logger.error(f"Error fetching admin user reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

