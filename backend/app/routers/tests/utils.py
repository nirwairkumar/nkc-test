from typing import List, Dict, Any
from supabase import Client
from concurrent.futures import ThreadPoolExecutor

def enrich_tests(tests: List[Dict], db: Client) -> List[Dict]:
    """
    Enriches test objects with creator information and assigned categories.
    Used by both feed and admin endpoints.
    """
    if not tests:
        return []

    test_ids = [t["id"] for t in tests]
    creator_ids = list(set([t["created_by"] for t in tests if t.get("created_by")]))

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

    category_ids = list(set([tc["category_id"] for tc in test_cats]))
    all_cats = {}
    if category_ids:
        cats_res = db.table("categories").select("*").in_("id", category_ids).execute()
        all_cats = {c["id"]: c for c in (cats_res.data or [])}

    tests_categories_map = {}
    tests_subcategory_map = {}
    for tc in test_cats:
        tid = tc["test_id"]
        cid = tc["category_id"]
        scid = tc.get("sub_category_id")
        
        if tid not in tests_categories_map:
            tests_categories_map[tid] = []
        if cid in all_cats:
            tests_categories_map[tid].append(all_cats[cid])
            
        if scid:
            tests_subcategory_map[tid] = scid

    verified_creators = {}
    for c in creators_data:
        verified_creators[c["id"]] = {
            "is_verified": c.get("is_verified_creator", False),
            "name": c.get("full_name"),
            "avatar": c.get("avatar_url")
        }

    enriched_tests = []
    for t in tests:
        cid = t.get("created_by")
        if cid and cid in verified_creators:
            t["creator_name"] = verified_creators[cid]["name"]
            t["creator_avatar"] = verified_creators[cid]["avatar"]
            t["creator_verified"] = verified_creators[cid]["is_verified"]
        t["categories"] = tests_categories_map.get(t["id"], [])
        t["sub_category_id"] = tests_subcategory_map.get(t["id"])
        enriched_tests.append(t)
        
    return enriched_tests
