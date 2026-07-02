from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query, Request
from app.core.database import get_db, supabase
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import time
import random
import os

router = APIRouter()

# --- Pydantic Models ---
class PostCreate(BaseModel):
    title: str
    content: dict         # Tiptap JSON document
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    category: str = "general"
    tags: List[str] = []
    status: str = "draft"

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[dict] = None
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None
    is_pinned: Optional[bool] = None

# --- Helpers ---
def _verify_auth_token(request: Request, db: Client) -> str:
    """Verify JWT from Authorization header and return requesting user's ID."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    token = auth_header.replace("Bearer ", "")
    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def _verify_owner_or_admin(user_id: str, request: Request, db: Client) -> str:
    requesting_user_id = _verify_auth_token(request, db)
    if requesting_user_id == user_id:
        return requesting_user_id
        
    # Check if admin
    profile_res = db.table("profiles").select("email").eq("id", requesting_user_id).execute()
    is_admin = False
    if profile_res.data:
        email = profile_res.data[0].get("email")
        if email:
            admin_res = db.table("admins").select("email").eq("email", email).execute()
            is_admin = bool(admin_res.data)
            
    if not is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return requesting_user_id

def require_verified_creator(user_id: str, request: Request, db: Client):
    _verify_owner_or_admin(user_id, request, db)
    profile = db.table("profiles").select("is_verified_creator").eq("id", user_id).execute()
    admin_check = db.table("admins").select("*").eq("user_id", user_id).execute()
    
    is_verified = bool(profile.data and profile.data[0].get("is_verified_creator"))
    is_admin = bool(admin_check.data)
    
    if not is_verified and not is_admin:
        raise HTTPException(status_code=403, detail="Only verified creators or admins can perform this action")

def generate_slug(title: str) -> str:
    import re
    # Remove special characters, replace spaces with hyphens, lowercase
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', title).strip().lower()
    slug = re.sub(r'[-\s]+', '-', slug)
    
    # Add random suffix to avoid collisions
    suffix = str(int(time.time() % 100000))
    return f"{slug}-{suffix}"

# --- Endpoints ---

@router.get("/feed")
async def get_posts_feed(
    page: int = 1,
    limit: int = 12,
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    db: Client = Depends(get_db)
):
    try:
        query = db.table("posts").select(
            "id, title, slug, summary, cover_image, category, tags, published_at, view_count, like_count, is_pinned, author_id, profiles(id, full_name, avatar_url, is_verified_creator)"
        ).eq("status", "published")
        
        if category and category != "all":
            query = query.eq("category", category)
            
        if search:
            query = query.ilike("title", f"%{search}%")
            
        if tag:
            query = query.contains("tags", [tag])
            
        query = query.order("is_pinned", desc=True).order("published_at", desc=True)
        
        # Pagination
        start = (page - 1) * limit
        end = start + limit - 1
        query = query.range(start, end)
        
        response = query.execute()
        return response.data
    except Exception as e:
        print(f"Error fetching feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my")
async def get_my_posts(
    request: Request,
    user_id: str = Query(...), # Passed by frontend or auth middleware
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(user_id, request, db)
        response = db.table("posts").select("id, author_id, title, slug, summary, cover_image, category, tags, status, is_pinned, view_count, like_count, published_at, created_at, updated_at").eq("author_id", user_id).order("created_at", desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching my posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{slug}")
async def get_post_by_slug(
    slug: str,
    db: Client = Depends(get_db)
):
    try:
        response = db.table("posts").select(
            "*, profiles(id, full_name, avatar_url, is_verified_creator, bio)"
        ).eq("slug", slug).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Post not found")
            
        post = response.data[0]
        
        # Increment view count (if published)
        if post.get("status") == "published":
            db.table("posts").update({"view_count": post["view_count"] + 1}).eq("id", post["id"]).execute()
            post["view_count"] += 1
            
        return post
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("")
async def create_post(
    payload: PostCreate,
    request: Request,
    user_id: str = Query(...), 
    db: Client = Depends(get_db)
):
    try:
        # 1. Verify user can post
        require_verified_creator(user_id, request, db)
        
        # 2. Prepare data
        post_data = payload.dict()
        post_data["author_id"] = user_id
        post_data["slug"] = generate_slug(payload.title)
        
        if payload.status == "published":
            post_data["published_at"] = datetime.now(timezone.utc).isoformat()
            
        response = db.table("posts").insert(post_data).execute()
        if response.data:
            return response.data[0]
        raise HTTPException(status_code=500, detail="Failed to create post")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error creating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{post_id}")
async def update_post(
    post_id: str,
    payload: PostUpdate,
    request: Request,
    user_id: str = Query(...),
    db: Client = Depends(get_db)
):
    try:
        # Check ownership / permissions of user_id
        _verify_owner_or_admin(user_id, request, db)
        
        # Check ownership of the post itself
        post_res = db.table("posts").select("author_id, status").eq("id", post_id).execute()
        if not post_res.data:
            raise HTTPException(status_code=404, detail="Post not found")
            
        if post_res.data[0]["author_id"] != user_id:
            # Check if admin
            admin_check = db.table("admins").select("*").eq("user_id", user_id).execute()
            if not admin_check.data:
                raise HTTPException(status_code=403, detail="Not authorized to edit this post")
                
        update_data = payload.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # If toggling to published for the first time
        if update_data.get("status") == "published" and post_res.data[0]["status"] != "published":
            update_data["published_at"] = datetime.now(timezone.utc).isoformat()
            
        response = db.table("posts").update(update_data).eq("id", post_id).execute()
        
        if response.data:
            return response.data[0]
        raise HTTPException(status_code=500, detail="Failed to update post")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    request: Request,
    user_id: str = Query(...),
    db: Client = Depends(get_db)
):
    try:
        # Check ownership / permissions of user_id
        _verify_owner_or_admin(user_id, request, db)
        
        # Check ownership of the post itself
        post_res = db.table("posts").select("author_id, cover_image").eq("id", post_id).execute()
        if not post_res.data:
            raise HTTPException(status_code=404, detail="Post not found")
            
        if post_res.data[0]["author_id"] != user_id:
             # Check if admin
            admin_check = db.table("admins").select("*").eq("user_id", user_id).execute()
            if not admin_check.data:
                raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
        # Optional: Delete cover image from storage if it belongs to our bucket
        cover = post_res.data[0].get("cover_image")
        if cover and "post-images" in cover:
            try:
                parts = cover.split("/post-images/")
                if len(parts) > 1:
                    file_path = parts[1]
                    db.storage.from_("post-images").remove([file_path])
            except Exception as store_err:
                print(f"Failed to delete cover image: {store_err}")
                
        # Delete post
        db.table("posts").delete().eq("id", post_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting post: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload-image")
async def upload_post_image(
    request: Request,
    file: UploadFile = File(...),
    user_id: str = Form(...),
    db: Client = Depends(get_db)
):
    """Upload an inline or cover image for a post"""
    try:
        require_verified_creator(user_id, request, db)
        
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'webp'
        file_name = f"{user_id}/{int(time.time())}_{random.randint(1000,9999)}.{file_ext}"
        file_content = await file.read()
        
        # Upload
        db.storage.from_("post-images").upload(file_name, file_content)
        
        # Get public URL
        public_url = db.storage.from_("post-images").get_public_url(file_name)
        
        return {"url": public_url}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{post_id}/like")
async def toggle_like(
    post_id: str,
    request: Request,
    user_id: str = Query(...),
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(user_id, request, db)
        
        # Check if already liked
        like_check = db.table("post_likes").select("id").eq("post_id", post_id).eq("user_id", user_id).execute()
        
        post_res = db.table("posts").select("like_count").eq("id", post_id).execute()
        if not post_res.data:
            raise HTTPException(status_code=404, detail="Post not found")
            
        current_likes = post_res.data[0]["like_count"]
        
        if like_check.data and len(like_check.data) > 0:
            # Unlike
            db.table("post_likes").delete().eq("id", like_check.data[0]["id"]).execute()
            new_likes = max(0, current_likes - 1)
            db.table("posts").update({"like_count": new_likes}).eq("id", post_id).execute()
            return {"liked": False, "likeCount": new_likes}
        else:
            # Like
            db.table("post_likes").insert({"post_id": post_id, "user_id": user_id}).execute()
            new_likes = current_likes + 1
            db.table("posts").update({"like_count": new_likes}).eq("id", post_id).execute()
            return {"liked": True, "likeCount": new_likes}
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error toggling like: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{post_id}/liked")
async def check_liked(
    post_id: str,
    request: Request,
    user_id: str = Query(...),
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(user_id, request, db)
        like_check = db.table("post_likes").select("id").eq("post_id", post_id).eq("user_id", user_id).execute()
        is_liked = bool(like_check.data and len(like_check.data) > 0)
        return {"liked": is_liked}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking like status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
