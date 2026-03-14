from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from app.core.database import get_db
from supabase import Client
from typing import Optional, List, Dict, Any
import json
from app.routers.tests.schemas import *
import uuid
from app.utils.google_indexing import notify_test_created, notify_test_updated

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
                "institution_logo", "slug", "tags", "class_id", "sections", "test_id"
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
        # Check if test exists
        # We can just update directly.
        
        # 1. Update Test
        try:
             response = db.table("tests").update(payload).eq("id", test_id).execute()
             if response.data:
                background_tasks.add_task(notify_test_updated, response.data[0])
                return response.data[0]
             return None
        except Exception as e:
            print(f"Full update failed: {e}. Retrying with legacy fields.")
            legacy_keys = {
                "title", "description", "questions", "created_by", "created_at", 
                "custom_id", "duration", "marks_per_question", "negative_marks", 
                "is_public", "visibility", "revision_notes", "institution_name",
                "institution_logo", "slug", "tags", "class_id"
            }
            safe_payload = {k: v for k, v in payload.items() if k in legacy_keys}
            response = db.table("tests").update(safe_payload).eq("id", test_id).execute()
            if response.data:
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
                    mapped_q["correctAnswer"] = {"min": 0, "max": 0}
                    
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
    except Exception as e:
        print(f"Error importing JSON: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process JSON: {str(e)}")
