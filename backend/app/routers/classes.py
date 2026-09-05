from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
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
async def create_class(payload: ClassCreate, db: Client = Depends(get_db)):
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
async def delete_class(class_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("classes").delete().eq("id", class_id).execute()
        _bust_classes_cache()
        return {"success": True}
    except Exception as e:
        print(f"Error deleting class: {e}")
        raise HTTPException(status_code=500, detail=str(e))
