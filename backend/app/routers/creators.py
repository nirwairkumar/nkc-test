from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from supabase import Client

router = APIRouter()

@router.get("/{creator_id}")
async def get_creator_profile(creator_id: str, db: Client = Depends(get_db)):
    try:
        # 1. Fetch Profile
        profile_res = db.table("profiles").select("*").eq("id", creator_id).single().execute()
        if not profile_res.data:
            raise HTTPException(status_code=404, detail="Creator not found")
        
        # 2. Fetch Public Tests (exclude clones — they must never appear on public profiles)
        # Pruned to test card display columns, omitting questions/solutions to prevent high egress
        tests_res = db.table("tests")\
            .select("id, title, total_questions, duration, created_by, custom_id, created_at, is_public, visibility, slug, settings, class_id, custom_category, description, tags, total_max_marks, classes(name), test_categories(category_id)")\
            .eq("created_by", creator_id)\
            .eq("visibility", "public")\
            .eq("is_cloned", False)\
            .execute()
            
        # 3. Fetch Classes
        # Frontend: fetchClasses(creatorId) -> db.from('classes').select('*').eq('user_id', creatorId)
        classes_res = db.table("classes").select("*").eq("user_id", creator_id).execute()

        # 4. Fetch Materials
        # Frontend: fetchMaterials(creatorId) -> db.from('materials').select('*, classes(name)').eq('user_id', creatorId)
        materials_res = db.table("materials").select("*, classes(name)").eq("user_id", creator_id).execute()
        
        return {
            "profile": profile_res.data,
            "tests": tests_res.data,
            "classes": classes_res.data,
            "materials": materials_res.data
        }

    except Exception as e:
        print(f"Error fetching creator profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{creator_id}/rewards")
async def get_creator_rewards(creator_id: str, db: Client = Depends(get_db)):
    try:
        # 1. Fetch Creator's Tests (all created tests, including private/unlisted to count creator's efforts)
        tests_res = db.table("tests").select("id, title, created_at, custom_id, visibility, is_public, settings").eq("created_by", creator_id).execute()
        tests = tests_res.data or []
        
        # Filter out system example templates
        tests = [t for t in tests if (t.get("settings") or {}).get("is_example_template") != True and (t.get("settings") or {}).get("is_user_example") != True]
        
        test_ids = [t["id"] for t in tests]
        test_submission_map = {t["id"]: 0 for t in tests}
        
        if test_ids:
            # Batch fetch attempts count
            attempts_res = db.table("user_tests").select("test_id").in_("test_id", test_ids).execute()
            for attempt in (attempts_res.data or []):
                tid = attempt.get("test_id")
                if tid in test_submission_map:
                    test_submission_map[tid] += 1

        quality_tests_count = 0
        total_submissions = sum(test_submission_map.values())
        test_details = []

        for t in tests:
            sub_count = test_submission_map.get(t["id"], 0)
            is_quality = sub_count >= 20
            if is_quality:
                quality_tests_count += 1
            test_details.append({
                "id": t["id"],
                "title": t["title"],
                "custom_id": t.get("custom_id"),
                "created_at": t.get("created_at"),
                "submissions_count": sub_count,
                "is_quality": is_quality,
                "needed_submissions": max(0, 20 - sub_count)
            })

        # Sort test_details: Quality tests first (by submission count desc), then others by submission count desc
        test_details.sort(key=lambda x: (1 if x["is_quality"] else 0, x["submissions_count"]), reverse=True)

        return {
            "creator_id": creator_id,
            "total_tests": len(tests),
            "quality_tests_count": quality_tests_count,
            "total_submissions": total_submissions,
            "test_details": test_details
        }

    except Exception as e:
        print(f"Error fetching creator rewards: {e}")
        raise HTTPException(status_code=500, detail=str(e))

