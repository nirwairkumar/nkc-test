from fastapi import APIRouter, HTTPException, Depends, Query, Response, Request
from app.core.database import get_db
from supabase import Client
from typing import Optional, List, Dict, Any
from app.routers.tests.schemas import *
from app.utils.attempt_control import calculate_test_max_marks
from app.routers.tests.utils import enrich_tests
from app.utils.cache_headers import set_public_cache, set_no_cache, set_private_cache
import uuid
from cachetools import TTLCache
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

router = APIRouter()

from app.routers.tests.cache_config import test_cache, feed_cache, cache_get, cache_set, cache_bust



@router.get("/batch")
async def get_tests_batch(
    ids: str = Query(..., description="Comma-separated list of test IDs"),
    response: Response = None,
    db: Client = Depends(get_db)
):
    try:
        if response:
            set_public_cache(response)
        id_list = [id.strip() for id in ids.split(",")]
        # Fetch tests metadata but EXCLUDING large questions JSONB
        response = db.table("tests").select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, custom_category, classes(name)").in_("id", id_list).execute()
        
        # Enrich with creator info and categories
        tests = response.data
        if not tests:
            return []
            
        enriched = enrich_tests(tests, db)
        return enriched
    except Exception as e:
        print(f"Error fetching batch tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feed")
async def get_tests_feed(
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=100),
    search_query: Optional[str] = None,
    category_id: Optional[str] = None,
    ids_only: bool = Query(False, description="Faster fetch returning just IDs for progressive loading"),
    response: Response = None,
    db: Client = Depends(get_db)
):
    try:
        if response:
            set_public_cache(response)
        # ─ Cache key for pages 1-2, no search (most common loads)
        feed_cache_key = f"feed:p{page}:l{limit}:c{category_id or ''}:ids{ids_only}" if page <= 2 and not search_query else None
        if feed_cache_key:
            cached = cache_get(feed_cache, feed_cache_key)
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
            import re
            
            # Use multi-token OR filter in DB to grab candidates efficiently
            tokens = [t.strip().lower() for t in re.split(r'\W+', search_query) if len(t.strip()) > 1]
            if not tokens:
                tokens = [search_query.strip().lower()]

            giant_or = []
            for tok in tokens:
                giant_or.append(f"title.ilike.%{tok}%")
                giant_or.append(f"description.ilike.%{tok}%")
                giant_or.append(f"custom_category.ilike.%{tok}%")
                giant_or.append(f"custom_id.ilike.%{tok}%")

            query = db.table("tests")\
                .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, custom_category, description, tags, classes(name)")\
                .eq("is_public", True)

            if category_test_ids is not None:
                query = query.in_("id", category_test_ids)

            # DB Filter by ANY token existing in columns, pulling up to 800 candidates
            query = query.or_(",".join(giant_or)).limit(800)
            tests_candidates_res = query.execute()
            candidates = tests_candidates_res.data
            
            # --- Python Side YouTube-style Ranking ---
            scored_tests = []
            for t in candidates:
                score = 0
                t_title = str(t.get("title") or "").lower()
                t_desc = str(t.get("description") or "").lower()
                t_cat = str(t.get("custom_category") or "").lower()
                t_tags = [str(tag).lower() for tag in (t.get("tags") or [])]
                
                for tok in tokens:
                    if tok in t_title:
                        score += 15  # Title match gets highest weight
                    elif tok in t_cat:
                        score += 10  # Custom Category gets mid weight
                    elif any(tok in tag for tag in t_tags):
                        score += 8   # Tags get good weight
                    elif tok in t_desc:
                        score += 3   # Description gets secondary weight

                if score > 0:
                    t["_match_score"] = score
                    scored_tests.append(t)
            
            # Sort by score (highest first), then by date
            scored_tests.sort(key=lambda x: (x["_match_score"], x.get("created_at", "")), reverse=True)
            
            # Paginate correctly from the ranked list
            tests = scored_tests[start:start+limit]

        else:
             # Standard Feed Query
            query = db.table("tests")\
                .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, custom_category, classes(name)")\
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
            
        # Fast exit for Amazon-style independent skeleton loading
        if ids_only:
            result = {
                "tests": [{"id": t["id"], "title": t.get("title"), "created_at": t.get("created_at")} for t in tests], # Return tiny payload
                "meta": {
                    "page": page,
                    "has_more": len(tests) == limit
                }
            }
            if feed_cache_key:
                cache_set(feed_cache, feed_cache_key, result)
            return result

        # 4. Enrich Test Objects
        typesafe_tests = enrich_tests(tests, db)

        result = {
            "tests": typesafe_tests,
            "meta": {
                "page": page,
                "has_more": len(tests) == limit
            }
        }
        if feed_cache_key:
            cache_set(feed_cache, feed_cache_key, result)
        return result

    except Exception as e:
        print(f"Error fetching test feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_tests(
    user_id: str,
    search_query: str = None,
    ids_only: bool = Query(False, description="Faster fetch returning just IDs for progressive loading"),
    profile_view: bool = Query(False, description="When True (public profile page), excludes cloned tests from results"),
    response: Response = None,
    db: Client = Depends(get_db)
):
    try:
        if response:
            set_public_cache(response, 60, 60)
        tests = []
        
        if search_query:
            import re
            tokens = [t.strip().lower() for t in re.split(r'\W+', search_query) if len(t.strip()) > 1]
            if not tokens:
                tokens = [search_query.strip().lower()]
            giant_or = []
            for tok in tokens:
                giant_or.append(f"title.ilike.%{tok}%")
                giant_or.append(f"description.ilike.%{tok}%")
                giant_or.append(f"custom_category.ilike.%{tok}%")
                giant_or.append(f"custom_id.ilike.%{tok}%")
                
            query_search = db.table("tests")\
                .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, description, tags, classes(name), test_votes(count)")\
                .eq("created_by", user_id)\
                .or_(",".join(giant_or))\
                .limit(800)
            if profile_view:
                query_search = query_search.eq("is_cloned", False)
            tests_res = query_search.execute()
            
            candidates = tests_res.data
            scored_tests = []
            for t in candidates:
                score = 0
                t_title = str(t.get("title") or "").lower()
                t_desc = str(t.get("description") or "").lower()
                t_cat = str(t.get("custom_category") or "").lower()
                t_tags = [str(tag).lower() for tag in (t.get("tags") or [])]
                for tok in tokens:
                    if tok in t_title: score += 15
                    elif tok in t_cat: score += 10
                    elif any(tok in tag for tag in t_tags): score += 8
                    elif tok in t_desc: score += 3
                if score > 0:
                    t["_match_score"] = score
                    scored_tests.append(t)
            
            scored_tests.sort(key=lambda x: (x["_match_score"], x.get("created_at", "")), reverse=True)
            tests = scored_tests
        else:
            # Default fetch — include settings/visibility/slug for conduct exam detection
            query_default = db.table("tests")\
                .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, is_cloned, cloned_from_id, classes(name), test_votes(count)")\
                .eq("created_by", user_id)\
                .order("created_at", desc=True)
            if profile_view:
                query_default = query_default.eq("is_cloned", False)
            tests_res = query_default.execute()
            tests = tests_res.data
        
        if not tests:
            return []

        if ids_only:
            return [{"id": t["id"], "title": t.get("title"), "created_at": t.get("created_at")} for t in tests]

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
            if 'test_votes' not in t and 'id' in t:
                 # If RPC was used, we might lack relation data depending on RPC return
                 # But our RPC returns basic fields. We might need to fetch likes separately or include in RPC.
                 # For now, let's just do a quick fix if missing, but RPC doesn't return joined data easily.
                 # Actually, RPC returns columns. We might miss `test_votes` count.
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
    request: Request,
    response: Response = None,
    db: Client = Depends(get_db),
):
    try:
        # ─ Optionally extract requester identity (for owner bypass)
        requesting_user_id: str | None = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                token = auth_header[7:]
                user_res = db.auth.get_user(token)
                if user_res and user_res.user:
                    requesting_user_id = user_res.user.id
            except Exception:
                pass  # Invalid token — treat as anonymous

        # ─ Cache check (5 min TTL for individual tests)
        cache_key = f"test:{test_id}"
        cached = cache_get(test_cache, cache_key)
        if cached is not None:
            # Re-validate visibility on cached result
            vis = cached.get("visibility", "public")
            is_uuid_lookup = False
            try:
                uuid.UUID(test_id)
                is_uuid_lookup = True
            except ValueError:
                pass
            is_slug_lookup = not is_uuid_lookup and test_id == cached.get("slug")

            # Owner bypass: creator can always see their own test
            is_owner = requesting_user_id and cached.get("created_by") == requesting_user_id
            if not is_owner:
                # Private: never public
                if vis == "private":
                    raise HTTPException(status_code=404, detail="Test not found")
                # Unlisted: only accessible via exact slug match
                if vis == "unlisted" and not is_slug_lookup:
                    raise HTTPException(status_code=404, detail="Test not found")
            if response:
                if vis == "public":
                    set_public_cache(response)
                else:
                    set_no_cache(response)
            return cached

        # Check if UUID
        is_uuid = False
        try:
            uuid.UUID(test_id)
            is_uuid = True
        except ValueError:
            is_uuid = False

        is_slug_match = False

        # Fetch test based on ID type
        if is_uuid:
            test_res = db.table("tests").select("*, classes(name)").eq("id", test_id).execute()
        else:
            # Try slug first (unlisted tests should ONLY be found via slug)
            slug_res = db.table("tests").select("*, classes(name)").eq("slug", test_id).execute()
            if slug_res.data:
                test_res = slug_res
                is_slug_match = True
            else:
                # Try custom_id (only for public tests)
                test_res = db.table("tests").select("*, classes(name)").eq("custom_id", test_id).execute()

        # Handle response
        if not test_res.data or len(test_res.data) == 0:
            raise HTTPException(status_code=404, detail="Test not found")

        test = test_res.data[0]

        # ─ Visibility Enforcement
        visibility = test.get("visibility", "public" if test.get("is_public") else "private")

        # Owner bypass: test creator can always access their own test via UUID
        is_owner = requesting_user_id and test.get("created_by") == requesting_user_id

        if not is_owner:
            # Private tests: never accessible via public link
            if visibility == "private":
                raise HTTPException(status_code=404, detail="Test not found")

            # Unlisted (conducted exam): only accessible via exact slug match
            if visibility == "unlisted" and not is_slug_match:
                raise HTTPException(status_code=404, detail="Test not found")

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

        if response:
            visibility = test.get("visibility", "public" if test.get("is_public") else "private")
            if visibility == "public":
                set_public_cache(response)
            else:
                set_no_cache(response)

        cache_set(test_cache, cache_key, test)
        return test

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching test details: {e}")
        raise HTTPException(status_code=500, detail=f"Server error fetching test: {str(e)}")


@router.get("/slug/{slug}")
async def get_test_by_slug(
    slug: str,
    request: Request,
    response: Response = None,
    db: Client = Depends(get_db)
):
    try:
        # ─ Optionally extract requester identity (for owner bypass)
        requesting_user_id: str | None = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                token = auth_header[7:]
                user_res = db.auth.get_user(token)
                if user_res and user_res.user:
                    requesting_user_id = user_res.user.id
            except Exception:
                pass  # Invalid token — treat as anonymous
        # ─ Cache check
        slug_cache_key = f"test:slug:{slug}"
        cached = cache_get(test_cache, slug_cache_key)
        if cached is not None:
            # ─ Enforce visibility on cached result too
            cached_vis = cached.get("visibility", "public" if cached.get("is_public") else "private")
            is_cached_owner = requesting_user_id and cached.get("created_by") == requesting_user_id
            
            if cached_vis == "private" and not is_cached_owner:
                raise HTTPException(status_code=404, detail="Test not found")
            if response:
                if cached_vis == "public":
                    set_public_cache(response)
                else:
                    set_no_cache(response)
            return cached

        # Fetch Test by Slug
        query = db.table("tests").select("*, classes(name)").eq("slug", slug).single()
        test_res = query.execute()
        test = test_res.data
        
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")

        # ─ Visibility Enforcement on slug lookup
        visibility = test.get("visibility", "public" if test.get("is_public") else "private")
        is_owner = requesting_user_id and test.get("created_by") == requesting_user_id

        # Private tests: never accessible via any slug (even old public slugs) unless owner
        if visibility == "private" and not is_owner:
            raise HTTPException(status_code=404, detail="Test not found")

        # Unlisted (conduct-exam): accessible ONLY via the exact conduct slug.
        # Since we found this by slug match, is_slug_match = True — allow access.
        # (No additional blocking needed; the slug itself IS the access key)

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

        if response:
            visibility = test.get("visibility", "public" if test.get("is_public") else "private")
            if visibility == "public":
                set_public_cache(response)
            else:
                set_no_cache(response)

        cache_set(test_cache, slug_cache_key, test)
        return test

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching test by slug: {e}")
        raise HTTPException(status_code=500, detail=f"Server error fetching test: {str(e)}")
