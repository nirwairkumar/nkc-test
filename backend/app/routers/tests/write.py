from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from app.core.database import get_db
from supabase import Client
from typing import Optional, List, Dict, Any
import json
from app.routers.tests.schemas import *
import uuid
from app.utils.google_indexing import notify_test_created, notify_test_updated
from app.routers.tests.cache_config import bust_test_cache

router = APIRouter()

@router.get("/debug/schema")
async def debug_schema(db: Client = Depends(get_db)):
    try:
        # Check connection and columns
        response = db.table("tests").select("*").limit(1).execute()
        columns = list(response.data[0].keys()) if response.data else []
        
        # Check User Profile (FK Constraint Check)
        user_resp = db.auth.get_user()
        user_id = user_resp.user.id
        profile_resp = db.table("profiles").select("id").eq("id", user_id).execute()
        has_profile = len(profile_resp.data) > 0

        return {
            "status": "ok", 
            "connected": True, 
            "columns": columns,
            "has_sections": "sections" in columns,
            "has_profile": has_profile,
            "user_id": user_id
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.post("/")
async def create_test(
    payload: CreateTestRequest,
    background_tasks: BackgroundTasks,
    db: Client = Depends(get_db)
):
    try:
        data = payload.dict(exclude_unset=True)
        try:
            # Try inserting with all fields (including new ones like sections)
            response = db.table("tests").insert(data).execute()
            # PostgREST returns list of inserted rows
            result = response.data[0] if response.data else None
            if result:
                background_tasks.add_task(notify_test_created, result)
            return result
        except Exception as e:
            # If schema mismatch (missing columns for new features), retry with safe legacy fields
            print(f"Full insert failed (likely schema mismatch or syntax): {e}. Retrying with legacy fields only.")
            
            # Define fields that differ between old and new schema
            legacy_keys = {
                "title", "description", "questions", "created_by", "created_at", 
                "custom_id", "duration", "marks_per_question", "negative_marks", 
                "is_public", "visibility", "revision_notes", "institution_name",
                "institution_logo", "institution_color", "institution_font",
                "slug", "tags", "class_id", "sections", "test_id",
                "enable_section_mode", "section_marking_model", "has_scientific_calculator",
                "merged_sections"
            }
            # Also creator_name/avatar might be missing if that migration wasn't run
            # But let's try to keep them if possible, or fall back further? 
            # For strict safety, let's include them in the 'legacy' set only if user confirmed.
            
            safe_data = {k: v for k, v in data.items() if k in legacy_keys}
            
            # Try insert again
            response = db.table("tests").insert(safe_data).execute()
            print("Legacy insert successful.")
            result = response.data[0] if response.data else None
            if result:
                background_tasks.add_task(notify_test_created, result)
            return result
            
    except Exception as e:
        print(f"Error creating test: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{test_id}")
async def update_test(
    test_id: str,
    payload: Dict[str, Any], # Allow partial updates without strict validation or use UpdateTestRequest
    background_tasks: BackgroundTasks,
    # Using Dict because frontend might send fields not in UpdateTestRequest if we lag behind
    db: Client = Depends(get_db)
):
    try:
        # Check if we need to update total_max_marks
        needs_marks_calc = any(k in payload for k in ["questions", "sections", "marks_per_question", "enable_section_mode"])
        if needs_marks_calc:
            try:
                existing = db.table("tests").select("questions, sections, enable_section_mode, marks_per_question, settings").eq("id", test_id).single().execute()
                if existing.data:
                    merged = {**existing.data, **payload}
                    from app.utils.attempt_control import calculate_test_max_marks
                    calc = calculate_test_max_marks(merged)
                    payload["total_max_marks"] = calc.get("total_max_marks", 0)
            except Exception as e:
                print(f"Warning: Could not proactively calculate total_max_marks on update: {e}")
        
        # 1. Update Test
        try:
             response = db.table("tests").update(payload).eq("id", test_id).execute()
             if response.data:
                bust_test_cache(test_id)
                background_tasks.add_task(notify_test_updated, response.data[0])
                return response.data[0]
             return None
        except Exception as e:
            print(f"Full update failed: {e}. Retrying with legacy fields.")
            legacy_keys = {
                "title", "description", "questions", "created_by", "created_at", 
                "custom_id", "duration", "marks_per_question", "negative_marks", 
                "is_public", "visibility", "revision_notes", "institution_name",
                "institution_logo", "institution_color", "institution_font",
                "slug", "tags", "class_id", "sections",
                "enable_section_mode", "section_marking_model", "has_scientific_calculator",
                "merged_sections"
            }
            safe_payload = {k: v for k, v in payload.items() if k in legacy_keys}
            response = db.table("tests").update(safe_payload).eq("id", test_id).execute()
            if response.data:
                bust_test_cache(test_id)
                background_tasks.add_task(notify_test_updated, response.data[0])
                return response.data[0]
            return None

    except Exception as e:
        print(f"Error updating test: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{test_id}")
async def delete_test(test_id: str, db: Client = Depends(get_db)):
    try:
        response = db.table("tests").delete().eq("id", test_id).execute()
        bust_test_cache(test_id)
        return {"success": True}
    except Exception as e:
        print(f"Error deleting test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import/json")
async def import_json(file: UploadFile = File(...)):
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")
    try:
        content = await file.read()
        data = json.loads(content)
        
        has_questions = "questions" in data and isinstance(data["questions"], list) and len(data["questions"]) > 0
        has_sections = "sections" in data and isinstance(data["sections"], list) and len(data["sections"]) > 0
        
        if not data.get("title") or (not has_questions and not has_sections):
            raise HTTPException(status_code=400, detail="Invalid JSON format: Must have title and either questions or sections")
            
        def map_question(q: dict, index: int) -> dict:
            mapped_q = {**q}
            mapped_q["id"] = q.get("id", index + 1)
            mapped_q["type"] = q.get("type", "single")
            mapped_q["question"] = q.get("question") or q.get("questionText", "")
            mapped_q["typingMode"] = "en"
            mapped_q["marks"] = str(q.get("marks", 4))
            mapped_q["negativeMarks"] = str(q.get("negativeMarks", 1))
            mapped_q["passageContent"] = q.get("passageContent", "")
            mapped_q["groupId"] = q.get("groupId", "")
            mapped_q["image"] = q.get("image", None)
            
            flat_options = {}
            flat_option_images = q.get("optionImages", {})
            raw_options = q.get("options")
            
            if isinstance(raw_options, dict):
                for k, v in raw_options.items():
                    if isinstance(v, dict) and "text" in v:
                        flat_options[k] = v.get("text", "")
                        if "image" in v and v["image"]:
                            flat_option_images[k] = v["image"]
                    else:
                        flat_options[k] = str(v) if v is not None else ""
                
                if flat_option_images:
                    mapped_q["optionImages"] = flat_option_images
            elif not raw_options:
                flat_options = {"A": "", "B": "", "C": "", "D": ""}
                
            mapped_q["options"] = flat_options
            
            # Type-specific correctAnswer mapping
            if mapped_q["type"] == "single" and not mapped_q.get("correctAnswer"):
                mapped_q["correctAnswer"] = "A"
            elif mapped_q["type"] == "multiple":
                correct = mapped_q.get("correctAnswer")
                if not isinstance(correct, list):
                    mapped_q["correctAnswer"] = []
            elif mapped_q["type"] == "numerical":
                correct = mapped_q.get("correctAnswer")
                if not isinstance(correct, dict):
                    mapped_q["correctAnswer"] = {"min": 0, "max": 0, "exactMatch": False, "exactAnswers": ""}
                    
            return mapped_q
            
        total_max_marks = 0

        if data.get("sections") and has_sections:
            data["enable_section_mode"] = True
            for s in data["sections"]:
                section_questions = [map_question(q, i) for i, q in enumerate(s.get("questions", []))]
                s["questions"] = section_questions
                
                # Check for attempt control to calculate specific section marks
                attempt_control = s.get("attempt_control", {})
                is_attempt_control_enabled = attempt_control.get("enabled", False)
                max_attempts = attempt_control.get("max_attempts", len(section_questions))
                
                if is_attempt_control_enabled and max_attempts:
                    # Sort questions by marks descending and pick top `max_attempts`
                    # In real JEE this assumes uniform marks (typically 4) so we do simplistic maxing
                    sorted_marks = sorted([float(q["marks"]) for q in section_questions], reverse=True)
                    total_max_marks += sum(sorted_marks[:max_attempts])
                else:
                    total_max_marks += sum(float(q["marks"]) for q in section_questions)
        elif has_questions:
            data["enable_section_mode"] = False
            data["questions"] = [map_question(q, i) for i, q in enumerate(data.get("questions", []))]
            total_max_marks = sum(float(q["marks"]) for q in data["questions"])
            
        data["enable_section_mode"] = data.get("enable_section_mode", False)
        data["has_scientific_calculator"] = data.get("has_scientific_calculator", False)
        data["section_marking_model"] = data.get("section_marking_model", "section-wise")
        
        # Override data maxMarks with true calculated maximum
        data["duration"] = data.get("duration", 180)
        data["maxMarks"] = int(total_max_marks)
        data["description"] = data.get("description", "")
        
        return data
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

@router.post("/{test_id}/clone")
async def clone_test(
    test_id: str,
    payload: CloneTestRequest,
    db: Client = Depends(get_db)
):
    """
    Clone a public test into the cloner's account.
    Guards:
      - Source test must be visibility='public'
      - Cloner must NOT be the original author
      - Cloner must have an active premium subscription (profiles.premium_expiry > now)
    """
    try:
        # 1. Fetch the source test in full
        src_res = db.table("tests").select("*").eq("id", test_id).single().execute()
        if not src_res.data:
            raise HTTPException(status_code=404, detail="Source test not found")

        src = src_res.data

        # 2. Source must be public
        visibility = src.get("visibility", "public" if src.get("is_public") else "private")
        if visibility != "public":
            raise HTTPException(status_code=403, detail="Only public tests can be cloned")

        # 3. Cannot clone your own test
        if src.get("created_by") == payload.cloner_id:
            raise HTTPException(status_code=400, detail="You cannot clone your own test")

        # 4. Verify cloner has an active subscription
        profile_res = db.table("profiles").select("premium_expiry").eq("id", payload.cloner_id).single().execute()
        profile = profile_res.data if profile_res.data else {}
        premium_expiry = profile.get("premium_expiry")
        
        settings_res = db.table("app_settings").select("unlock_all_premium").limit(1).execute()
        is_global_unlock = settings_res.data[0].get("unlock_all_premium", False) if settings_res.data else False

        if not is_global_unlock:
            if not premium_expiry:
                raise HTTPException(status_code=403, detail="Active subscription required to clone tests")
            from datetime import datetime, timezone
            expiry_dt = datetime.fromisoformat(premium_expiry.replace("Z", "+00:00"))
            if expiry_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=403, detail="Your subscription has expired. Renew to clone tests")

        # 5. Build the clone payload — strip identity & conduct fields
        skip_fields = {
            "id", "created_at", "updated_at", "slug", "custom_id",
            "is_public", "visibility", "settings", "is_cloned", "cloned_from_id",
            "og_image", "total_questions", "total_max_marks"
        }
        clone_data = {k: v for k, v in src.items() if k not in skip_fields and v is not None}

        # Override with cloner identity
        clone_data["created_by"] = payload.cloner_id
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

        # 6. Insert clone
        insert_res = db.table("tests").insert(clone_data).execute()
        if not insert_res.data:
            raise HTTPException(status_code=500, detail="Failed to create clone")

        cloned_test = insert_res.data[0]
        clone_id = cloned_test["id"]

        # 7. Copy test_categories to the new clone
        try:
            tc_res = db.table("test_categories").select("category_id").eq("test_id", test_id).execute()
            if tc_res.data:
                new_tc_rows = [{"test_id": clone_id, "category_id": tc["category_id"]} for tc in tc_res.data]
                db.table("test_categories").insert(new_tc_rows).execute()
        except Exception as cat_err:
            print(f"Warning: Failed to copy categories for clone {clone_id}: {cat_err}")

        print(f"[clone] Test {test_id} cloned as {clone_id} by {payload.cloner_id}")
        return cloned_test

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error cloning test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

