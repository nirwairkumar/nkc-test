from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_db
from supabase import Client
from typing import Optional, List, Dict, Any
from app.routers.tests.schemas import *
from app.utils.attempt_control import calculate_test_max_marks
import uuid
from cachetools import TTLCache
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

router = APIRouter()

# ─── In-Memory TTL Caches ────────────────────────────────
_cache_lock = threading.Lock()
# Cache individual test data for 5 minutes (300s)
_test_cache: TTLCache = TTLCache(maxsize=500, ttl=300)
# Cache feed page 1 for 2 minutes
_feed_cache: TTLCache = TTLCache(maxsize=50, ttl=120)

def _cache_set(cache: TTLCache, key: str, value: Any):
    with _cache_lock:
        cache[key] = value

def _cache_get(cache: TTLCache, key: str):
    with _cache_lock:
        return cache.get(key)

def _cache_bust(cache: TTLCache, key: str):
    with _cache_lock:
        cache.pop(key, None)


@router.get("/batch")
async def get_tests_batch(
    ids: str = Query(..., description="Comma-separated list of test IDs"),
    db: Client = Depends(get_db)
):
    try:
        id_list = [id.strip() for id in ids.split(",")]
        # Fetch tests including class name
        response = db.table("tests").select("*, classes(name)").in_("id", id_list).execute()
        
        # Enrich with creator info and categories (similar to feed logic)
        tests = response.data
        if not tests:
            return []
            
        # Re-use the enrichment logic if possible, or just return basic for now
        # For simplicity in proxying, we return what Supabase would return
        return tests
    except Exception as e:
        print(f"Error fetching batch tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feed")
async def get_tests_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search_query: Optional[str] = None,
    category_id: Optional[str] = None,
    db: Client = Depends(get_db)
):
    try:
        # ─ Cache key for pages 1-2, no search (most common loads)
        feed_cache_key = f"feed:p{page}:l{limit}:c{category_id or ''}" if page <= 2 and not search_query else None
        if feed_cache_key:
            cached = _cache_get(_feed_cache, feed_cache_key)
            if cached is not None:
                return cached

        # Pre-filter by category if needed
        category_test_ids = None
        if category_id:
             tc_res = db.table("test_categories").select("test_id").eq("category_id", category_id).execute()
             if not tc_res.data:
                 # No tests in this category
                 return {
                    "tests": [],
                    "meta": {"page": page, "has_more": False}
                }
             category_test_ids = [item["test_id"] for item in tc_res.data]

        # 1. Calculate Pagination
        start = (page - 1) * limit
        end = start + limit - 1

        # 2. Build Query
        if search_query:
            # RPC Search using 'search_tests_ranked'
            # Note: User must have run the migration 'AdvancedSearchRPC.sql'
            try:
                tests_res = db.rpc("search_tests_ranked", {
                    "search_query": search_query,
                    "limit_val": limit,
                    "offset_val": start,
                    "category_filter": category_id, # Optional
                    "is_admin": False
                }).execute()
                tests = tests_res.data
            except Exception as rpc_error:
                print(f"RPC Search Error (maybe migration not run): {rpc_error}")
                # Fallback to old ILIKE query
                cleaned_query = search_query.replace(",", "")
                query = db.table("tests")\
                    .select("*, classes(name)")\
                    .eq("is_public", True)\
                    .order("created_at", desc=True)
                
                if category_test_ids:
                    query = query.in_("id", category_test_ids)
                
                query = query.or_(f"title.ilike.%{cleaned_query}%,custom_id.ilike.%{cleaned_query}%")
                tests_res = query.range(start, end).execute()
                tests = tests_res.data

        else:
             # Standard Feed Query
            query = db.table("tests")\
                .select("*, classes(name)")\
                .eq("is_public", True)\
                .order("created_at", desc=True)

            if category_test_ids is not None:
                 query = query.in_("id", category_test_ids)

            tests_res = query.range(start, end).execute()
            tests = tests_res.data
            
        if not tests:
             return {
                "tests": [],
                "meta": {
                    "page": page,
                    "has_more": False
                }
            }

        # 4. Extract IDs for Batch Fetching
        test_ids = [t["id"] for t in tests]
        creator_ids = list(set([t["created_by"] for t in tests if t.get("created_by")]))

        # 5. Fetch Categories + Creators IN PARALLEL
        def _fetch_categories():
            tc_res = db.table("test_categories").select("*").in_("test_id", test_ids).execute()
            return tc_res.data or []

        def _fetch_creators():
            if not creator_ids:
                return []
            res = db.table("profiles").select("id, is_verified_creator, full_name, avatar_url").in_("id", creator_ids).execute()
            return res.data or []

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_cats = executor.submit(_fetch_categories)
            future_creators = executor.submit(_fetch_creators)
            test_cats = future_cats.result()
            creators_data = future_creators.result()

        # Build categories map
        category_ids = list(set([tc["category_id"] for tc in test_cats]))
        all_cats: Dict[str, Any] = {}
        if category_ids:
            cats_res = db.table("categories").select("*").in_("id", category_ids).execute()
            all_cats = {c["id"]: c for c in (cats_res.data or [])}

        tests_categories_map: Dict[str, list] = {}
        for tc in test_cats:
            tid = tc["test_id"]
            cid = tc["category_id"]
            if tid not in tests_categories_map:
                tests_categories_map[tid] = []
            if cid in all_cats:
                tests_categories_map[tid].append(all_cats[cid])

        # Build creators map
        verified_creators: Dict[str, dict] = {}
        for c in creators_data:
            verified_creators[c["id"]] = {
                "is_verified": c.get("is_verified_creator", False),
                "name": c.get("full_name"),
                "avatar": c.get("avatar_url")
            }

        # 7. Enrich Test Objects
        typesafe_tests = []
        for t in tests:
            cid = t.get("created_by")
            if cid and cid in verified_creators:
                t["creator_name"] = verified_creators[cid]["name"]
                t["creator_avatar"] = verified_creators[cid]["avatar"]
                t["creator_verified"] = verified_creators[cid]["is_verified"]
            t["categories"] = tests_categories_map.get(t["id"], [])
            typesafe_tests.append(t)

        result = {
            "tests": typesafe_tests,
            "meta": {
                "page": page,
                "has_more": len(tests) == limit
            }
        }
        if feed_cache_key:
            _cache_set(_feed_cache, feed_cache_key, result)
        return result

    except Exception as e:
        print(f"Error fetching test feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_tests(
    user_id: str,
    search_query: str = None,
    db: Client = Depends(get_db)
):
    try:
        tests = []
        
        if search_query:
            # Use Ranking RPC
            params = {
                "search_query": search_query,
                "limit_count": 50,
                "offset_count": 0,
                "creator_filter": user_id 
            }
            # Try calling RPC
            try:
                rpc_res = db.rpc("search_tests_ranked", params).execute()
                tests = rpc_res.data
            except Exception as rpc_error:
                print(f"RPC Error (User Search): {rpc_error}")
                # Fallback to ILIKE if RPC fails
                tests_res = db.table("tests")\
                    .select("*, classes(name), test_likes(count)")\
                    .eq("created_by", user_id)\
                    .ilike("title", f"%{search_query}%")\
                    .order("created_at", desc=True)\
                    .execute()
                tests = tests_res.data
        else:
            # Default fetch
            tests_res = db.table("tests")\
                .select("*, classes(name), test_likes(count)")\
                .eq("created_by", user_id)\
                .order("created_at", desc=True)\
                .execute()
            tests = tests_res.data
        
        if not tests:
            return []

        # Enrich with categories (Similar logic to feed)
        test_ids = [t["id"] for t in tests]
        
        if test_ids:
            test_cats_res = db.table("test_categories").select("*").in_("test_id", test_ids).execute()
            test_cats = test_cats_res.data
            
            category_ids = list(set([tc["category_id"] for tc in test_cats]))
            if category_ids:
                cats_res = db.table("categories").select("*").in_("id", category_ids).execute()
                all_cats = {c["id"]: c for c in cats_res.data}
                
                tests_categories_map = {}
                for tc in test_cats:
                    tid = tc["test_id"]
                    cid = tc["category_id"]
                    if tid not in tests_categories_map:
                        tests_categories_map[tid] = []
                    if cid in all_cats:
                        tests_categories_map[tid].append(all_cats[cid])
                        
                for t in tests:
                    t["categories"] = tests_categories_map.get(t["id"], [])

        # Fetch Creator Info (User themselves)
        # Optimization: We know the user_id, just fetch once
        profile_res = db.table("profiles").select("id, is_verified_creator, full_name, avatar_url").eq("id", user_id).single().execute()
        creator_info = profile_res.data if profile_res.data else {}
        
        enriched_tests = []
        for t in tests:
            # Inject Creator Info
            if creator_info:
                t["creator_name"] = creator_info.get("full_name")
                t["creator_avatar"] = creator_info.get("avatar_url")
                t["creator_verified"] = creator_info.get("is_verified_creator")
            
            # Ensure likes count is present if not in RPC result
            if 'test_likes' not in t and 'id' in t:
                 # If RPC was used, we might lack relation data depending on RPC return
                 # But our RPC returns basic fields. We might need to fetch likes separately or include in RPC.
                 # For now, let's just do a quick fix if missing, but RPC doesn't return joined data easily.
                 # Actually, RPC returns columns. We might miss `test_likes` count.
                 # Optimization: Fetch likes for all these tests
                 pass

            enriched_tests.append(t)
            
        return enriched_tests

    except Exception as e:
        print(f"Error fetching user tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{test_id}")
async def get_test_by_id(
    test_id: str,
    db: Client = Depends(get_db)
):
    try:
        # ─ Cache check (5 min TTL for individual tests)
        cache_key = f"test:{test_id}"
        cached = _cache_get(_test_cache, cache_key)
        if cached is not None:
            return cached

        # Check if UUID
        is_uuid = False
        try:
            uuid.UUID(test_id)
            is_uuid = True
        except ValueError:
            is_uuid = False
            
        # Fetch test based on ID type
        if is_uuid:
            test_res = db.table("tests").select("*, classes(name)").eq("id", test_id).execute()
        else:
            # Try custom_id first
            test_res = db.table("tests").select("*, classes(name)").eq("custom_id", test_id).execute()
            
            # If not found, try slug
            if not test_res.data:
                test_res = db.table("tests").select("*, classes(name)").eq("slug", test_id).execute()
        
        # Handle response
        if not test_res.data or len(test_res.data) == 0:
            raise HTTPException(status_code=404, detail="Test not found")
        
        test = test_res.data[0]

        # ─ Fetch creator info + categories IN PARALLEL
        def _fetch_creator():
            if not test.get("created_by"):
                return None
            res = db.table("profiles").select("id, is_verified_creator, full_name, avatar_url").eq("id", test["created_by"]).execute()
            return res.data[0] if res.data else None

        def _fetch_test_cats():
            res = db.table("test_categories").select("category_id").eq("test_id", test["id"]).execute()
            return res.data or []

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_creator = executor.submit(_fetch_creator)
            future_cats = executor.submit(_fetch_test_cats)
            creator = future_creator.result()
            test_cats = future_cats.result()

        if creator:
            test["creator_name"] = creator.get("full_name")
            test["creator_avatar"] = creator.get("avatar_url")
            test["creator_verified"] = creator.get("is_verified_creator")

        if test_cats:
            cat_ids = [tc["category_id"] for tc in test_cats]
            cats_res = db.table("categories").select("*").in_("id", cat_ids).execute()
            test["categories"] = cats_res.data or []
        else:
            test["categories"] = []

        # Add computed max marks info
        test["computed_max_marks"] = calculate_test_max_marks(test)

        _cache_set(_test_cache, cache_key, test)
        return test

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching test details: {e}")
        raise HTTPException(status_code=404, detail="Test not found")


@router.get("/slug/{slug}")
async def get_test_by_slug(
    slug: str,
    db: Client = Depends(get_db)
):
    try:
        # ─ Cache check
        slug_cache_key = f"test:slug:{slug}"
        cached = _cache_get(_test_cache, slug_cache_key)
        if cached is not None:
            return cached

        # Fetch Test by Slug
        query = db.table("tests").select("*, classes(name)").eq("slug", slug).single()
        test_res = query.execute()
        test = test_res.data
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        # ─ Fetch creator + categories IN PARALLEL
        def _fetch_creator():
            if not test.get("created_by"):
                return None
            res = db.table("profiles").select("id, is_verified_creator, full_name, avatar_url").eq("id", test["created_by"]).single().execute()
            return res.data

        def _fetch_test_cats():
            res = db.table("test_categories").select("category_id").eq("test_id", test["id"]).execute()
            return res.data or []

        with ThreadPoolExecutor(max_workers=2) as executor:
            future_creator = executor.submit(_fetch_creator)
            future_cats = executor.submit(_fetch_test_cats)
            creator = future_creator.result()
            test_cats = future_cats.result()

        if creator:
            test["creator_name"] = creator.get("full_name")
            test["creator_avatar"] = creator.get("avatar_url")
            test["creator_verified"] = creator.get("is_verified_creator")

        if test_cats:
            cat_ids = [tc["category_id"] for tc in test_cats]
            cats_res = db.table("categories").select("*").in_("id", cat_ids).execute()
            test["categories"] = cats_res.data or []
        else:
            test["categories"] = []

        test["computed_max_marks"] = calculate_test_max_marks(test)

        _cache_set(_test_cache, slug_cache_key, test)
        return test

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching test by slug: {e}")
        raise HTTPException(status_code=404, detail="Test not found")
