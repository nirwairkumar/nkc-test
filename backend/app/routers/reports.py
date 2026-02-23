from fastapi import APIRouter, HTTPException, Depends, Header
from app.core.database import get_db, supabase as admin_db
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.config import settings

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
@router.post("/")
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
            notif_data = {
                "user_id": payload.creator_id,
                "title": "New Question Report",
                "message": f"A user reported an issue ({payload.reason}) with question {payload.question_id + 1}.",
                "link": "/your-tests?tab=reports"
            }
            admin_db.table("notifications").insert(notif_data).execute()
        except Exception as ne:
            print(f"Failed to create notification: {ne}")
            
        return response.data[0] if response.data else {"success": True}
    except Exception as e:
        print(f"Error submitting report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. Get reports for a specific creator
@router.get("/creator/{creator_id}")
async def get_creator_reports(creator_id: str, db: Client = Depends(get_db)):
    try:
        # Fetch reports and join with test title to display nicely in the dashboard
        response = admin_db.table("question_reports") \
                     .select("id, created_at, question_id, reason, details, status, reporter_id, tests(title, custom_id)") \
                     .eq("creator_id", creator_id) \
                     .order("created_at", desc=True) \
                     .execute()
                     
        return response.data
    except Exception as e:
        print(f"Error fetching creator reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 3. Mark report as solved (Creator or Admin)
@router.put("/{report_id}/status")
async def update_report_status(report_id: str, payload: ReportStatusUpdate, db: Client = Depends(get_db)):
    try:
        # Will use RLS to ensure only creator can update, OR admin can update via service role if we want.
        # But normal db will rely on RLS: USING (auth.uid() = creator_id)
        if payload.status not in ["open", "solved"]:
            raise HTTPException(status_code=400, detail="Invalid status")
            
        response = db.table("question_reports") \
                     .update({"status": payload.status}) \
                     .eq("id", report_id) \
                     .execute()
                     
        return response.data[0] if response.data else {"success": True}
    except Exception as e:
        print(f"Error updating report status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 4. ADMIN ONLY: Get report stats for all users (For the Users Tab Red Dot)
@router.get("/admin/users-stats")
async def get_admin_users_report_stats():
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
        print(f"Error fetching admin user report stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 5. ADMIN ONLY: Get detailed reports for a specific users tests (For User Profile Dialog)
@router.get("/admin/user/{user_id}")
async def get_admin_user_reports(user_id: str):
    try:
        response = admin_db.table("question_reports") \
                           .select("id, created_at, question_id, reason, details, status, reporter_id, tests(title, custom_id)") \
                           .eq("creator_id", user_id) \
                           .order("created_at", desc=True) \
                           .execute()
                           
        return response.data
    except Exception as e:
        print(f"Error fetching admin user reports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

