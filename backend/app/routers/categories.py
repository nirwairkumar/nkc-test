from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

from app.schemas.categories import CategoryCreate, CategoryUpdate, TestCategoryAssignment, SubCategoryCreate, SubCategoryUpdate, TestSubCategoryAssignment
import threading
from cachetools import TTLCache

_cat_cache_lock = threading.Lock()
# Cache categories list for 5 minutes (300s)
_categories_cache: TTLCache = TTLCache(maxsize=10, ttl=300)
# Cache subcategories list for 5 minutes (300s)
_subcategories_cache: TTLCache = TTLCache(maxsize=100, ttl=300)

def _bust_category_cache():
    with _cat_cache_lock:
        _categories_cache.clear()

def _bust_subcategory_cache():
    with _cat_cache_lock:
        _subcategories_cache.clear()

@router.get("/")
async def get_categories(db: Client = Depends(get_db)):
    with _cat_cache_lock:
        cached = _categories_cache.get("all")
        if cached is not None:
            return cached

    try:
        response = db.table("categories").select("*").order("name").execute()
        data = response.data or []
        with _cat_cache_lock:
            _categories_cache["all"] = data
        return data
    except Exception as e:
        print(f"Error fetching categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_category(payload: CategoryCreate, db: Client = Depends(get_db)):
    try:
        response = db.table("categories").insert({"name": payload.name}).execute()
        if response.data:
            _bust_category_cache()
            return response.data[0]
        return None
    except Exception as e:
        error_str = str(e)
        if "duplicate key" in error_str or "23505" in error_str:
             raise HTTPException(status_code=409, detail="Category already exists")
        print(f"Error creating category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{category_id}")
async def update_category(category_id: str, payload: CategoryUpdate, db: Client = Depends(get_db)):
    try:
        response = db.table("categories").update({"name": payload.name}).eq("id", category_id).execute()
        if response.data:
            _bust_category_cache()
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error updating category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{category_id}")
async def delete_category(category_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("categories").delete().eq("id", category_id).execute()
        _bust_category_cache()
        return {"success": True}
    except Exception as e:
        print(f"Error deleting category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_category_stats(db: Client = Depends(get_db)):
    try:
        # Fetch all categories
        cats_res = db.table("categories").select("id, name, created_at").order("name").execute()
        cats = cats_res.data
        
        # Fetch test_categories mappings (all)
        # Note: If this table is huge, this is inefficient. Ideally use a View or RPC.
        # But for now, acceptable.
        map_res = db.table("test_categories").select("category_id").execute()
        mapping = map_res.data
        
        # Count
        counts = {}
        for m in mapping:
            cid = m["category_id"]
            counts[cid] = counts.get(cid, 0) + 1
            
        # Enrich and Sort by count descending
        enriched = []
        for c in cats:
            enriched.append({
                **c,
                "count": counts.get(c["id"], 0)
            })
            
        # Sort by count descending
        enriched.sort(key=lambda x: x["count"], reverse=True)
            
        return enriched
        
    except Exception as e:
         print(f"Error fetching category stats: {e}")
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/test/{test_id}")
async def get_test_categories(test_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("test_categories").select("category_id").eq("test_id", test_id).execute()
        # Return list of IDs
        return [item["category_id"] for item in response.data] if response.data else []
    except Exception as e:
        print(f"Error fetching test categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/assign/{test_id}")
async def assign_categories(test_id: str, payload: TestCategoryAssignment, db: Client = Depends(get_db)):
    try:
        # 1. Delete existing
        db.table("test_categories").delete().eq("test_id", test_id).execute()
        
        # 2. Insert new
        if payload.category_ids:
            rows = [{"test_id": test_id, "category_id": cid} for cid in payload.category_ids]
            db.table("test_categories").insert(rows).execute()
            
        return {"success": True}
    except Exception as e:
        print(f"Error assigning categories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/assign/{test_id}")
async def admin_assign_categories(test_id: str, payload: TestCategoryAssignment):
    try:
        from app.core.database import supabase as admin_db
        # 1. Delete existing
        admin_db.table("test_categories").delete().eq("test_id", test_id).execute()
        
        # 2. Insert new
        if payload.category_ids:
            rows = [{"test_id": test_id, "category_id": cid} for cid in payload.category_ids]
            admin_db.table("test_categories").insert(rows).execute()
            
        return {"success": True}
    except Exception as e:
        print(f"Error assigning categories (admin): {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Sub-Category Endpoints ───

@router.get("/{category_id}/subcategories")
async def get_subcategories(category_id: str, db: Client = Depends(get_db)):
    with _cat_cache_lock:
        cached = _subcategories_cache.get(f"cat:{category_id}")
        if cached is not None:
            return cached
    try:
        response = db.table("sub_categories").select("*").eq("category_id", category_id).order("name").execute()
        data = response.data or []
        with _cat_cache_lock:
            _subcategories_cache[f"cat:{category_id}"] = data
        return data
    except Exception as e:
        print(f"Error fetching subcategories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subcategories/all")
async def get_all_subcategories(db: Client = Depends(get_db)):
    with _cat_cache_lock:
        cached = _subcategories_cache.get("all")
        if cached is not None:
            return cached
    try:
        response = db.table("sub_categories").select("*").order("name").execute()
        data = response.data or []
        with _cat_cache_lock:
            _subcategories_cache["all"] = data
        return data
    except Exception as e:
        print(f"Error fetching all subcategories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{category_id}/subcategories")
async def create_subcategory(category_id: str, payload: SubCategoryCreate, db: Client = Depends(get_db)):
    try:
        response = db.table("sub_categories").insert({
            "name": payload.name,
            "category_id": category_id
        }).execute()
        if response.data:
            _bust_subcategory_cache()
            return response.data[0]
        return None
    except Exception as e:
        error_str = str(e)
        if "duplicate key" in error_str or "23505" in error_str:
            raise HTTPException(status_code=409, detail="Sub-category already exists in this category")
        print(f"Error creating subcategory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/subcategories/{sub_category_id}")
async def update_subcategory(sub_category_id: str, payload: SubCategoryUpdate, db: Client = Depends(get_db)):
    try:
        response = db.table("sub_categories").update({"name": payload.name}).eq("id", sub_category_id).execute()
        if response.data:
            _bust_subcategory_cache()
            return response.data[0]
        return None
    except Exception as e:
        print(f"Error updating subcategory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/subcategories/{sub_category_id}")
async def delete_subcategory(sub_category_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("sub_categories").delete().eq("id", sub_category_id).execute()
        _bust_subcategory_cache()
        return {"success": True}
    except Exception as e:
        print(f"Error deleting subcategory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/assign-subcategory/{test_id}")
async def admin_assign_subcategory(test_id: str, payload: TestSubCategoryAssignment):
    try:
        from app.core.database import supabase as admin_db
        # Update all test_categories rows for this test to set the sub_category_id
        if payload.sub_category_id:
            admin_db.table("test_categories").update({
                "sub_category_id": payload.sub_category_id
            }).eq("test_id", test_id).execute()
        else:
            # Clear sub-category assignment
            admin_db.table("test_categories").update({
                "sub_category_id": None
            }).eq("test_id", test_id).execute()
        return {"success": True}
    except Exception as e:
        print(f"Error assigning subcategory (admin): {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test/{test_id}/subcategory")
async def get_test_subcategory(test_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("test_categories").select("sub_category_id").eq("test_id", test_id).execute()
        if response.data:
            # Return first non-null sub_category_id
            for row in response.data:
                if row.get("sub_category_id"):
                    return {"sub_category_id": row["sub_category_id"]}
        return {"sub_category_id": None}
    except Exception as e:
        print(f"Error fetching test subcategory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{category_id}/test-subcategory-map")
async def get_category_test_subcategory_map(category_id: str, db: Client = Depends(get_db)):
    """Returns a mapping of test_id -> sub_category_id for all tests in a category."""
    try:
        response = db.table("test_categories").select("test_id, sub_category_id").eq("category_id", category_id).execute()
        result = {}
        for row in (response.data or []):
            if row.get("sub_category_id"):
                result[row["test_id"]] = row["sub_category_id"]
        return result
    except Exception as e:
        print(f"Error fetching test-subcategory map: {e}")
        raise HTTPException(status_code=500, detail=str(e))
