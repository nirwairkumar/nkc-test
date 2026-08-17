from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

# --- Schemas ---

class FollowRequest(BaseModel):
    follower_id: str
    following_id: str

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    link: Optional[str] = None
    custom_test_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None

class VoteRequest(BaseModel):
    user_id: str
    vote_type: int  # 1 for upvote, -1 for downvote

# --- Follows ---

@router.post("/follows/follow")
async def follow_user(payload: FollowRequest, db: Client = Depends(get_db)):
    try:
        response = db.table("follows").insert(payload.dict()).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/follows/unfollow")
async def unfollow_user(payload: FollowRequest, db: Client = Depends(get_db)):
    try:
        response = db.table("follows").delete()\
            .eq("follower_id", payload.follower_id)\
            .eq("following_id", payload.following_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/follows/check")
async def check_follow(follower_id: str, following_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("follows").select("*")\
            .eq("follower_id", follower_id)\
            .eq("following_id", following_id)\
            .maybe_single().execute()
        return {"isFollowing": bool(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/follows/stats/{user_id}")
async def get_follow_stats(user_id: str, db: Client = Depends(get_db)):
    try:
        followers = db.table("follows").select("*", count="exact").eq("following_id", user_id).execute()
        following = db.table("follows").select("*", count="exact").eq("follower_id", user_id).execute()
        return {
            "followers_count": followers.count,
            "following_count": following.count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/follows/followers/{user_id}")
async def get_followers(user_id: str, db: Client = Depends(get_db)):
    try:
        # Fetch followers of user_id
        response = db.table("follows").select("follower_id, created_at, follower:profiles!follows_follower_id_fkey(*)")\
            .eq("following_id", user_id)\
            .execute()
        return response.data
    except Exception as e:
        # Fallback if FK name issue?
        # print(e)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/follows/following/{user_id}")
async def get_following(user_id: str, db: Client = Depends(get_db)):
    try:
        # Fetch who user_id is following
        response = db.table("follows").select("following_id, created_at, following:profiles!follows_following_id_fkey(*)")\
            .eq("follower_id", user_id)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Notifications ---

@router.get("/notifications/{user_id}")
async def get_notifications(user_id: str, limit: int = 50, db: Client = Depends(get_db)):
    try:
        response = db.table("notifications").select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notifications/create")
async def create_notification(payload: NotificationCreate, db: Client = Depends(get_db)):
    try:
        # payload.dict() works for simple inserts
        data = payload.dict(exclude_unset=True)
        response = db.table("notifications").insert(data).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/{id}/read")
async def mark_read(id: str, user_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("notifications").update({"read": True, "is_read": True})\
            .eq("id", id)\
            .eq("user_id", user_id)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/notifications/mark-all-read/{user_id}")
async def mark_all_read(user_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("notifications").update({"read": True, "is_read": True})\
            .eq("user_id", user_id)\
            .execute()
        return {"success": True, "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notifications/{id}")
async def delete_notification(id: str, user_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("notifications").delete()\
            .eq("id", id)\
            .eq("user_id", user_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/notifications/clear/{user_id}")
async def clear_all_notifications(user_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("notifications").delete()\
            .eq("user_id", user_id)\
            .execute()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# --- Test Votes ---

@router.post("/tests/{test_id}/vote")
async def toggle_test_vote(test_id: str, payload: VoteRequest, db: Client = Depends(get_db)):
    try:
        user_id = payload.user_id
        vote_type = payload.vote_type
        
        existing = db.table("test_votes").select("id, vote_type")\
            .eq("test_id", test_id)\
            .eq("user_id", user_id)\
            .maybe_single().execute()
        
        # Safely extract data
        existing_data = None
        if existing and hasattr(existing, 'data'):
            existing_data = existing.data
        elif isinstance(existing, dict):
            existing_data = existing.get("data", existing)
            
        if existing_data:
            if existing_data.get("vote_type") == vote_type:
                # Remove vote if clicking the same button again
                db.table("test_votes").delete().eq("id", existing_data["id"]).execute()
                return {"vote": 0}
            else:
                # Change vote (up to down, or down to up)
                db.table("test_votes").update({"vote_type": vote_type}).eq("id", existing_data["id"]).execute()
                return {"vote": vote_type}
        else:
            # New vote
            db.table("test_votes").insert({"test_id": test_id, "user_id": user_id, "vote_type": vote_type}).execute()
            return {"vote": vote_type}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tests/{test_id}/vote-count")
async def get_test_vote_count(test_id: str, db: Client = Depends(get_db)):
    try:
        # Get upvotes
        upvotes = db.table("test_votes").select("*", count="exact").eq("test_id", test_id).eq("vote_type", 1).execute()
        # Get downvotes
        downvotes = db.table("test_votes").select("*", count="exact").eq("test_id", test_id).eq("vote_type", -1).execute()
        
        return {
            "upvotes": upvotes.count or 0,
            "downvotes": downvotes.count or 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tests/{test_id}/vote-status")
async def get_test_vote_status(test_id: str, user_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("test_votes").select("vote_type")\
            .eq("test_id", test_id)\
            .eq("user_id", user_id)\
            .maybe_single().execute()
            
        response_data = None
        if response and hasattr(response, 'data'):
            response_data = response.data
        elif isinstance(response, dict):
            response_data = response.get("data", response)
            
        if response_data:
            return {"vote": response_data.get("vote_type")}
        return {"vote": 0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tests/batch/votes")
async def get_batch_test_votes(ids: str, user_id: str = None, db: Client = Depends(get_db)):
    try:
        id_list = [i.strip() for i in ids.split(",") if i.strip()]
        if not id_list:
            return []
            
        # Get all votes for these tests in one query
        res = db.table("test_votes").select("test_id, user_id, vote_type").in_("test_id", id_list).execute()
        votes_data = res.data or []
        
        # Aggregate manually
        stats = {tid: {"upvotes": 0, "downvotes": 0, "user_vote": 0} for tid in id_list}
        
        for v in votes_data:
            tid = v["test_id"]
            if tid not in stats:
                continue
                
            v_type = v.get("vote_type")
            if v_type == 1:
                stats[tid]["upvotes"] += 1
            elif v_type == -1:
                stats[tid]["downvotes"] += 1
                
            if user_id and v.get("user_id") == user_id:
                stats[tid]["user_vote"] = v_type
                
        # Format as list
        return [{"test_id": k, **v} for k, v in stats.items()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
