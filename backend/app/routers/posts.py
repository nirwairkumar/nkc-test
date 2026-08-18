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
    slug: Optional[str] = None
    summary: Optional[str] = None
    cover_image: Optional[str] = None
    category: str = "general"
    tags: List[str] = []
    status: str = "draft"

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[dict] = None
    slug: Optional[str] = None
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

def _is_user_admin(user_id: str, db: Client) -> bool:
    try:
        profile_res = db.table("profiles").select("email").eq("id", user_id).execute()
        if profile_res.data:
            email = profile_res.data[0].get("email")
            if email:
                admin_res = db.table("admins").select("email").eq("email", email).execute()
                return bool(admin_res.data)
    except Exception as e:
        print(f"Error checking admin status: {e}")
    return False

def _verify_owner_or_admin(user_id: str, request: Request, db: Client) -> str:
    requesting_user_id = _verify_auth_token(request, db)
    if requesting_user_id == user_id:
        return requesting_user_id
        
    if not _is_user_admin(requesting_user_id, db):
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return requesting_user_id

def require_verified_creator(user_id: str, request: Request, db: Client):
    _verify_owner_or_admin(user_id, request, db)
    if _is_user_admin(user_id, db):
        return
    profile = db.table("profiles").select("is_verified_creator").eq("id", user_id).execute()
    is_verified = bool(profile.data and profile.data[0].get("is_verified_creator"))
    
    if not is_verified:
        raise HTTPException(status_code=403, detail="Only verified creators or admins can perform this action")

from fastapi.responses import Response

def generate_slug(title: str, custom_slug: Optional[str] = None) -> str:
    import re
    raw = (custom_slug.strip() if custom_slug and custom_slug.strip() else title).strip().lower()
    # Remove special characters, replace spaces with hyphens
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', raw).strip()
    slug = re.sub(r'[-\s]+', '-', slug)
    
    if not slug:
        slug = "blog-post"
        
    # If custom slug was provided, don't append random suffix unless needed
    if custom_slug and custom_slug.strip():
        return slug
        
    # Add timestamp suffix for default title generated slugs
    suffix = str(int(time.time() % 100000))
    return f"{slug}-{suffix}"

def _attach_author_profiles(posts: List[Dict[str, Any]], db: Client) -> List[Dict[str, Any]]:
    """Resiliently attach author profile information without relying on PostgREST foreign key embedding."""
    if not posts:
        return posts
    author_ids = list({p.get("author_id") for p in posts if p.get("author_id")})
    profiles_map = {}
    if author_ids:
        try:
            prof_res = db.table("profiles").select("id, full_name, avatar_url, is_verified_creator, bio").in_("id", author_ids).execute()
            for prof in (prof_res.data or []):
                profiles_map[prof["id"]] = prof
        except Exception as pe:
            print(f"Warning: Failed to fetch author profiles: {pe}")
            
    for p in posts:
        p["profiles"] = profiles_map.get(p.get("author_id"), {
            "id": p.get("author_id"),
            "full_name": "TestoZa Team",
            "avatar_url": None,
            "is_verified_creator": True,
            "bio": ""
        })
    return posts

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
            "id, title, slug, summary, cover_image, category, tags, published_at, view_count, like_count, is_pinned, author_id, created_at, updated_at"
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
        posts = response.data or []
        return _attach_author_profiles(posts, db)
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
        is_admin = _is_user_admin(user_id, db)
        if is_admin:
            # Admins can view and manage all posts across the platform (includes content for editing)
            response = db.table("posts").select("*").order("created_at", desc=True).execute()
        else:
            response = db.table("posts").select("*").eq("author_id", user_id).order("created_at", desc=True).execute()
        posts = response.data or []
        return _attach_author_profiles(posts, db)
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching my posts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/id/{post_id}")
async def get_post_by_id(
    post_id: str,
    db: Client = Depends(get_db)
):
    try:
        response = db.table("posts").select("*").eq("id", post_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Post not found")
        posts = _attach_author_profiles(response.data, db)
        return posts[0]
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching post by id: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sitemap.xml")
async def get_blog_sitemap(db: Client = Depends(get_db)):
    """Generate XML sitemap of all published blog posts for Google Search Console."""
    try:
        response = db.table("posts").select("slug, updated_at, published_at").eq("status", "published").order("published_at", desc=True).execute()
        posts = response.data or []
        
        xml_items = []
        for p in posts:
            slug = p.get("slug")
            date = (p.get("updated_at") or p.get("published_at") or "").split("T")[0] or datetime.now(timezone.utc).strftime("%Y-%m-%d")
            xml_items.append(f"""  <url>
    <loc>https://blog.testoza.com/{slug}</loc>
    <lastmod>{date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://testoza.com/blog/{slug}</loc>
    <lastmod>{date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")
            
        xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://blog.testoza.com</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://testoza.com/blog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
{ "".join(xml_items) }
</urlset>"""
        return Response(content=xml_content, media_type="application/xml")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{slug}")
async def get_post_by_slug(
    slug: str,
    db: Client = Depends(get_db)
):
    try:
        response = db.table("posts").select("*").eq("slug", slug).execute()
        
        if not response.data:
            # Fallback: check if slug is a post ID UUID
            response = db.table("posts").select("*").eq("id", slug).execute()
            if not response.data:
                raise HTTPException(status_code=404, detail="Post not found")
            
        posts = _attach_author_profiles(response.data, db)
        post = posts[0]
        
        # Increment view count (if published)
        if post.get("status") == "published":
            try:
                db.table("posts").update({"view_count": (post.get("view_count") or 0) + 1}).eq("id", post["id"]).execute()
                post["view_count"] = (post.get("view_count") or 0) + 1
            except Exception as ve:
                print(f"Warning: Failed to increment view count: {ve}")
            
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
        post_data["slug"] = generate_slug(payload.title, payload.slug)
        
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
            if not _is_user_admin(user_id, db):
                raise HTTPException(status_code=403, detail="Not authorized to edit this post")
                
        update_data = payload.dict(exclude_unset=True)
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # If slug provided in update, sanitize
        if payload.slug:
            update_data["slug"] = generate_slug("", payload.slug)
        
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
            if not _is_user_admin(user_id, db):
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
