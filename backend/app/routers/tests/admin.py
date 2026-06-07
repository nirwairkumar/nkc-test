from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_db
from supabase import Client

from typing import Optional, List, Dict, Any
from app.routers.tests.utils import enrich_tests
from app.routers.tests.cache_config import bust_test_cache

router = APIRouter()

@router.get("/all")
async def get_all_tests(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search_query: Optional[str] = None,
    db: Client = Depends(get_db)
):
    try:
        # 1. Calculate Pagination
        start = (page - 1) * limit
        end = start + limit - 1

        # 2. Build Query
        if search_query:
            try:
                # RPC Search
                response = db.rpc("search_tests_ranked", {
                    "search_query": search_query,
                    "limit_val": limit,
                    "offset_val": start,
                    "is_admin": True # Ensures admin sees all visible relevant tests
                }).execute()
                tests = response.data
            except Exception as rpc_error:
                print(f"RPC Admin Search Error: {rpc_error}")
                # Fallback
                cleaned_query = search_query.replace(",", "")
                query = db.table("tests")\
                    .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, classes(name)")\
                    .order("created_at", desc=True)
                query = query.or_(f"title.ilike.%{cleaned_query}%,custom_id.ilike.%{cleaned_query}%")
                response = query.range(start, end).execute()
                tests = response.data
        else:
            query = db.table("tests")\
                .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, classes(name)")\
                .order("created_at", desc=True)
            response = query.range(start, end).execute()
            tests = response.data

        enriched = enrich_tests(tests, db)

        return {
            "tests": enriched,
            "meta": {
                "page": page,
                "has_more": len(tests) == limit
            }
        }
    except Exception as e:
        print(f"Error fetching all tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/next-id")
async def get_next_test_id(
    prefix: str = Query("M", pattern="^(M|YT)$"),
    db: Client = Depends(get_db)
):
    try:
        # Fetch latest ID with prefix
        # We want custom_id like 'M001' or 'YT005'
        # Supabase doesn't support complex regex in 'like' easily, so we use ilike 'prefix%' and order desc
        response = db.table("tests")\
            .select("custom_id")\
            .ilike("custom_id", f"{prefix}%")\
            .order("custom_id", desc=True)\
            .limit(1)\
            .execute()
        
        last_id_str = response.data[0]["custom_id"] if response.data else None
        
        if not last_id_str:
             return {"next_id": f"{prefix}001"}
        
        # Parse number
        try:
            # Assuming format prefix + 3 digits
            num_part = last_id_str[len(prefix):]
            next_num = int(num_part) + 1
            return {"next_id": f"{prefix}{next_num:03d}"}
        except ValueError:
             # Fallback if format is weird
             return {"next_id": f"{prefix}001"}

    except Exception as e:
        print(f"Error fetching next ID: {e}")
        # Default fallback
        return {"next_id": f"{prefix}001"}

@router.put("/admin/{test_id}")
async def admin_update_test(
    test_id: str,
    payload: Dict[str, Any],
):
    try:
        from app.core.database import supabase as admin_db
        # Update using Service Role Key (bypasses RLS)
        response = admin_db.table("tests").update(payload).eq("id", test_id).execute()
        if response.data:
            bust_test_cache(test_id)
        return response.data[0] if response.data else None
    except Exception as e:
        print(f"Error updating test (admin): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/{test_id}")
async def admin_delete_test(
    test_id: str
):
    try:
        from app.core.database import supabase as admin_db
        # Delete using Service Role Key (bypasses RLS)
        response = admin_db.table("tests").delete().eq("id", test_id).execute()
        bust_test_cache(test_id)
        return {"success": True}
    except Exception as e:
        print(f"Error deleting test (admin): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/{test_id}/clone")
async def admin_clone_test(
    test_id: str,
    payload: dict, # Using dict directly to avoid import issues or schema complexity
):
    try:
        target_user_id = payload.get("target_user_id")
        if not target_user_id:
            raise HTTPException(status_code=400, detail="target_user_id is required")

        from app.core.database import supabase as admin_db
        # 1. Fetch the source test in full
        src_res = admin_db.table("tests").select("*").eq("id", test_id).single().execute()
        if not src_res.data:
            raise HTTPException(status_code=404, detail="Source test not found")

        src = src_res.data

        # 2. Build the clone payload — strip identity & conduct fields
        skip_fields = {
            "id", "created_at", "updated_at", "slug", "custom_id",
            "is_public", "visibility", "settings", "is_cloned", "cloned_from_id",
            "og_image", "total_questions", "total_max_marks"
        }
        clone_data = {k: v for k, v in src.items() if k not in skip_fields and v is not None}

        # Override with target user identity
        clone_data["created_by"] = target_user_id
        clone_data["title"] = f"Copy of {src.get('title', 'Untitled')}"
        clone_data["is_public"] = False
        clone_data["visibility"] = "private"
        clone_data["is_cloned"] = True
        clone_data["cloned_from_id"] = test_id
        clone_data["class_id"] = None  # Don't carry over original class assignment

        # Strip conduct_exam from settings if present
        src_settings = src.get("settings") or {}
        safe_settings = {k: v for k, v in src_settings.items() if k != "conduct_exam"}
        if safe_settings:
            clone_data["settings"] = safe_settings

        # Remove creator branding fields that belong to original creator
        for branding_key in ["creator_name", "creator_avatar", "institution_name",
                              "institution_logo", "institution_color", "institution_font"]:
            clone_data.pop(branding_key, None)

        # 3. Insert clone
        insert_res = admin_db.table("tests").insert(clone_data).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to create clone")

        cloned_test = insert_res.data[0]
        clone_id = cloned_test["id"]

        # 4. Copy test_categories to the new clone
        try:
            tc_res = admin_db.table("test_categories").select("category_id").eq("test_id", test_id).execute()
            if tc_res.data:
                new_tc_rows = [{"test_id": clone_id, "category_id": tc["category_id"]} for tc in tc_res.data]
                admin_db.table("test_categories").insert(new_tc_rows).execute()
        except Exception as cat_err:
            print(f"Warning: Failed to copy categories for admin clone {clone_id}: {cat_err}")

        print(f"[admin clone] Test {test_id} cloned as {clone_id} for user {target_user_id}")
        return cloned_test

    except Exception as e:
        print(f"Error cloning test (admin): {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/conduct-mode-tests")
async def get_conduct_mode_tests():
    try:
        from app.core.database import supabase as admin_db
        # 1. Fetch all tests with settings, created_by, created_at
        response = admin_db.table("tests")\
            .select("id, title, custom_id, settings, created_by, created_at")\
            .execute()
        
        all_tests = response.data or []
        if not all_tests:
            return []
            
        # 2. Filter conduct mode tests
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        conduct_candidates = []
        creator_ids = set()
        
        for t in all_tests:
            settings = t.get("settings") or {}
            conduct_exam = settings.get("conduct_exam") or {}
            if conduct_exam.get("enabled"):
                # Check if schedule end_time has passed
                schedule = settings.get("schedule") or {}
                end_time_str = schedule.get("end_time")
                if end_time_str:
                    try:
                        end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
                        if end_time < now:
                            continue # Has ended
                    except Exception as parse_err:
                        print(f"Error parsing schedule end_time for test {t['id']}: {parse_err}")
                
                conduct_candidates.append(t)
                if t.get("created_by"):
                    creator_ids.add(t["created_by"])
                    
        if not conduct_candidates:
            return []
            
        # 3. Fetch profiles for creators in a single query
        profiles_map = {}
        if creator_ids:
            profiles_res = admin_db.table("profiles")\
                .select("id, full_name, email")\
                .in_("id", list(creator_ids))\
                .execute()
            for p in (profiles_res.data or []):
                profiles_map[p["id"]] = p
                
        # 4. Enrich and format response
        conduct_tests = []
        for t in conduct_candidates:
            creator_id = t.get("created_by")
            profile = profiles_map.get(creator_id) or {}
            creator_name = profile.get("full_name") or "Unknown"
            
            settings = t.get("settings") or {}
            schedule = settings.get("schedule") or {}
            end_time_str = schedule.get("end_time")
            
            conduct_tests.append({
                "id": t["id"],
                "title": t["title"],
                "custom_id": t.get("custom_id"),
                "creator_name": creator_name,
                "creator_email": profile.get("email"),
                "created_by": creator_id,
                "end_time": end_time_str,
                "settings": settings
            })
            
        return conduct_tests
    except Exception as e:
        print(f"Error fetching conduct mode tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


