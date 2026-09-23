from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.database import get_db
from app.core.auth import verify_auth_token, verify_owner_or_admin, is_admin_user
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

import threading
from cachetools import TTLCache

_classes_cache_lock = threading.Lock()
# Cache classes for 5 minutes (300s)
_classes_cache: TTLCache = TTLCache(maxsize=100, ttl=300)

def _bust_classes_cache():
    with _classes_cache_lock:
        _classes_cache.clear()

class ClassCreate(BaseModel):
    name: str
    user_id: str

@router.get("/all")
async def get_all_classes(db: Client = Depends(get_db)):
    with _classes_cache_lock:
        cached = _classes_cache.get("all")
        if cached is not None:
            return cached

    try:
        response = db.table("classes").select("*").order("name").execute()
        data = response.data or []
        with _classes_cache_lock:
            _classes_cache["all"] = data
        return data
    except Exception as e:
        print(f"Error fetching all classes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}")
async def get_user_classes(user_id: str, db: Client = Depends(get_db)):
    cache_key = f"user:{user_id}"
    with _classes_cache_lock:
        cached = _classes_cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        response = db.table("classes").select("*").eq("user_id", user_id).order("name").execute()
        data = response.data or []
        with _classes_cache_lock:
            _classes_cache[cache_key] = data
        return data
    except Exception as e:
        print(f"Error fetching classes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_class(payload: ClassCreate, request: Request, db: Client = Depends(get_db)):
    # C5: was unguarded and took user_id straight from the body, so anyone could create
    # classes attributed to any creator. Bind the row to the caller's own id.
    verify_owner_or_admin(payload.user_id, request, db)
    try:
        response = db.table("classes").insert(payload.dict()).execute()
        if response.data:
            _bust_classes_cache()
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error creating class: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{class_id}")
async def delete_class(class_id: str, request: Request, db: Client = Depends(get_db)):
    # C5: was unguarded — anyone could delete any creator's class.
    requesting_user_id = verify_auth_token(request, db)
    owner_res = db.table("classes").select("user_id").eq("id", class_id).limit(1).execute()
    if not owner_res.data:
        raise HTTPException(status_code=404, detail="Class not found")
    if owner_res.data[0].get("user_id") != requesting_user_id and not is_admin_user(requesting_user_id, db):
        raise HTTPException(status_code=403, detail="Unauthorized access")
    try:
        response = db.table("classes").delete().eq("id", class_id).execute()
        _bust_classes_cache()
        return {"success": True}
    except Exception as e:
        print(f"Error deleting class: {e}")
        raise HTTPException(status_code=500, detail=str(e))
