from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.database import get_db, supabase as admin_db
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class FeedbackCreate(BaseModel):
    test_id: str
    rating: int
    comment: Optional[str] = None
    custom_test_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_email: Optional[str] = None
    improvements: Optional[str] = None
    requirements: Optional[str] = None
    test_experience: Optional[str] = None
    dislikes: Optional[str] = None

@router.post("/feedback")
async def submit_feedback(payload: FeedbackCreate, db: Client = Depends(get_db)):
    try:
        data = payload.dict(exclude_unset=True)
        response = db.table("feedback").insert(data).execute()
        return response.data
    except Exception as e:
        print(f"Error submitting feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SupportMessage(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    message: str

@router.post("/message")
async def send_support_message(payload: SupportMessage, db: Client = Depends(get_db)):
    try:
        data = payload.dict()
        response = db.table("support_messages").insert(data).execute()
        return {"success": True, "message": "Support message saved successfully", "data": response.data}
    except Exception as e:
        print(f"Error sending support message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class ExitFeedbackCreate(BaseModel):
    test_id: str
    experience: str
    user_id: Optional[str] = None

@router.post("/exit-feedback")
async def submit_exit_feedback(payload: ExitFeedbackCreate, db: Client = Depends(get_db)):
    try:
        data_to_insert = {
            "test_id": payload.test_id,
            "experience": payload.experience
        }
        
        # Try to get user info if they are logged in
        if payload.user_id:
            data_to_insert["user_id"] = payload.user_id
        else:
            try:
                res = db.auth.get_user()
                if res and res.user:
                    data_to_insert["user_id"] = res.user.id
            except Exception:
                pass
                
        response = db.table("exit_feedback").insert(data_to_insert).execute()
        
        # Add Notification for Admins
        try:
            # 1. Fetch all admin emails
            admin_emails_res = admin_db.table("admins").select("email").execute()
            admin_emails = [a["email"] for a in admin_emails_res.data] if admin_emails_res.data else []
            
            if admin_emails:
                # 2. Find corresponding user IDs in profiles
                admins_res = admin_db.table("profiles").select("id").in_("email", admin_emails).execute()
                admin_ids = [a["id"] for a in admins_res.data] if admins_res.data else []
                
                # 3. Insert notification for each admin
                if admin_ids:
                    notifications = [
                        {
                            "user_id": aid,
                            "title": "New Exit Feedback",
                            "message": f"A user reported an issue/experience during a test: {payload.experience[:50]}...",
                            "link": "/admin/feedback" # Assuming an admin feedback view exists or will exist
                        } for aid in admin_ids
                    ]
                    admin_db.table("notifications").insert(notifications).execute()
        except Exception as ne:
            print(f"Failed to create admin notifications: {ne}")
            
        return response.data[0] if response.data else {"success": True}
    except Exception as e:
        print(f"Error submitting exit feedback: {e}")
        raise HTTPException(status_code=500, detail=str(e))
