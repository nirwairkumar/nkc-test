import json
from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from app.core.database import get_db, supabase
from app.utils.attempt_control import apply_section_attempt_control
from supabase import Client
from pydantic import BaseModel
from typing import Optional, Dict, Any, List

router = APIRouter()

from app.schemas.attempts import (
    SaveAttemptRequest, 
    RegisterRequest, 
    ProgressUpdateRequest, 
    AbandonRequest,
    AnonStartRequest,
    AnonProgressRequest,
    AnonSubmitRequest,
    AnonAbandonRequest
)

class BatchStatusRequest(BaseModel):
    user_id: str
    test_ids: List[str]
from app.services.attempt_service import (
    process_progress,
    process_abandon,
    process_anon_progress,
    process_anon_abandon
)
from app.utils.attempt_control import apply_section_attempt_control, calculate_test_max_marks

def _verify_auth_token_attempts(request: Request, db: Client) -> str:
    """Verify JWT from Authorization header and return requesting user's ID."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    token = auth_header.replace("Bearer ", "")
    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.post("/save")
async def save_attempt(
    payload: SaveAttemptRequest,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        # Security: Check auth header first
        auth_header = request.headers.get("Authorization")
        effective_user_id = None

        # Fetch test details for attempt control validation, notification, and conduct verification
        test_data = None
        try:
            test_res = supabase.table("tests").select("id, title, created_by, enable_section_mode, sections, settings").eq("id", payload.test_id).limit(1).execute()
            if test_res.data and len(test_res.data) > 0:
                test_data = test_res.data[0]
            else:
                test_res = supabase.table("tests").select("id, title, created_by, enable_section_mode, sections, settings").or_(f"slug.eq.{payload.test_id},custom_id.eq.{payload.test_id}").limit(1).execute()
                if test_res.data and len(test_res.data) > 0:
                    test_data = test_res.data[0]
        except Exception as te:
            print(f"Warning: error looking up test {payload.test_id} in save_attempt: {te}")

        settings_dict = (test_data.get("settings") or {}) if test_data else {}
        is_conduct_exam = bool(settings_dict.get("conduct_exam", {}).get("enabled", False))
        is_login_required = bool(settings_dict.get("login_required", False))
        has_start_form = bool(settings_dict.get("start_form", {}).get("enabled", False))
        has_form_submission = bool((payload.metadata or {}).get("startFormData"))

        # Determine if unauthenticated submission is allowed:
        # Allowed if login is NOT explicitly required, OR if conduct exam is active, OR if candidate start form was filled
        allow_unauthenticated = (not is_login_required) or is_conduct_exam or has_start_form or has_form_submission

        if auth_header and auth_header.strip():
            try:
                authenticated_user_id = _verify_auth_token_attempts(request, db)
                effective_user_id = authenticated_user_id
            except HTTPException as auth_err:
                if allow_unauthenticated and payload.user_id:
                    effective_user_id = payload.user_id
                else:
                    raise auth_err
        else:
            if allow_unauthenticated and payload.user_id:
                effective_user_id = payload.user_id
            elif payload.user_id and not is_login_required:
                effective_user_id = payload.user_id
            else:
                raise HTTPException(status_code=401, detail="Missing Authorization header: Login is required to submit this exam")
        
        if test_data and test_data.get("enable_section_mode") and test_data.get("sections"):
            try:
                # This validates HARD mode and can be used for filtering in the future
                apply_section_attempt_control(test_data["sections"], payload.answers)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        target_test_id = (test_data.get("id") if test_data else None) or payload.test_id

        import uuid
        if not effective_user_id:
            effective_user_id = str(uuid.uuid4())

        # Ensure effective_user_id exists in auth.users to satisfy foreign key constraint fk_user
        try:
            user_exists = False
            try:
                user_check = supabase.auth.admin.get_user_by_id(effective_user_id)
                if user_check and getattr(user_check, "user", None):
                    user_exists = True
            except Exception:
                user_exists = False

            if not user_exists:
                clean_id = effective_user_id.replace("-", "")[:12]
                anon_email = f"candidate_{clean_id}@guest.testoza.com"
                supabase.auth.admin.create_user({
                    "id": effective_user_id,
                    "email": anon_email,
                    "email_confirm": True,
                    "user_metadata": {
                        "is_guest_candidate": True,
                        "startFormData": (payload.metadata or {}).get("startFormData", {})
                    }
                })
        except Exception as ue:
            print(f"Notice: guest user check/create for {effective_user_id}: {ue}")

        metadata = payload.metadata or {}
        if is_conduct_exam or has_start_form or has_form_submission:
            metadata["is_conducted_attempt"] = True

        response = supabase.table("user_tests").insert({
            "user_id": effective_user_id,
            "test_id": target_test_id,
            "answers": payload.answers,
            "score": payload.score,
            "metadata": metadata
        }).execute()
        
        # Mark the corresponding test_registration as submitted
        try:
            from datetime import datetime, timezone
            pct = payload.completion_percentage if payload.completion_percentage is not None else 100
            now = datetime.now(timezone.utc).isoformat()
            supabase.table("test_registrations")\
                .update({
                    "status": "submitted",
                    "completion_percentage": pct,
                    "last_active_at": now
                })\
                .eq("user_id", effective_user_id)\
                .eq("test_id", target_test_id)\
                .neq("status", "submitted")\
                .execute()
        except Exception:
            pass  # Non-critical: don't block submission
        
        # Notify the test creator about the candidate submission
        try:
            creator_id = test_data.get("created_by") if test_data else None
            test_title = test_data.get("title", "Mock Test") if test_data else "Mock Test"
            if creator_id and creator_id != effective_user_id:
                from app.utils.notifications import send_notification
                send_notification(
                    user_id=creator_id,
                    title="New Test Submission",
                    message=f'A candidate completed and submitted your test "{test_title}".',
                    link="/my-tests",
                    custom_test_id=target_test_id,
                    db=supabase
                )
        except Exception as ne:
            print(f"Failed to send submission notification: {ne}")

        # In v2, insert returns APIResponse. .data contains array of inserted rows.
        if response.data:
            return {"data": response.data[0], "error": None}
        return {"data": None, "error": "Insert failed"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to save attempt")

@router.get("/user/{user_id}")
async def get_user_attempts(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        # 1. Security Check: Explicitly verify the JWT token
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
             raise HTTPException(status_code=401, detail="Missing Authorization header")
        
        token = auth_header.replace("Bearer ", "")
        user_response = db.auth.get_user(token)
        
        if not user_response or not user_response.user:
             raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if requesting user is admin or the user themselves
        requesting_user_id = user_response.user.id
        requesting_user_email = user_response.user.email
        
        # Fetch requesting user's admin status from 'admins' table
        admin_res = supabase.table("admins").select("email").eq("email", requesting_user_email).execute()
        is_admin = admin_res.data and len(admin_res.data) > 0
        
        # Allow if admin OR if viewing own data
        if not is_admin and requesting_user_id != user_id:
             raise HTTPException(status_code=403, detail="Not authorized to view this history")

        # 2. Use Admin Client with Application-Side Join (Bypass Missing FK)

        # Step A: Fetch attempts using global supabase client (Service Role) to bypass RLS
        attempts_res = supabase.table("user_tests")\
            .select("id, test_id, score, created_at, violation_count, questions_attempted, metadata")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
            
        raw_attempts = attempts_res.data or []
        # Exclude attempts deleted by candidate from their end
        attempts_data = [
            a for a in raw_attempts
            if not (a.get("metadata") or {}).get("deleted_by_user")
        ]
        
        if not attempts_data:
            return []

        # Step B: Fetch related Test Details
        test_ids = list(set([a["test_id"] for a in attempts_data if a.get("test_id")]))
        
        tests_map = {}
        if test_ids:
            try:
                # Use global 'supabase' client (likely Service Role) to fetch tests
                tests_res = supabase.table("tests")\
                    .select("id, title, settings, total_max_marks")\
                    .in_("id", test_ids)\
                    .execute()
                
                if tests_res.data:
                    tests_map = {t["id"]: t for t in tests_res.data}
            except Exception as e:
                print(f"Error fetching related tests: {e}")

        # Step C: Merge Data
        enriched = []
        for item in attempts_data:
            tid = item.get("test_id")
            test = tests_map.get(tid)
            
            if not test:
                 flat = {
                    "id": item["id"],
                    "test_id": tid,
                    "score": item["score"],
                    "created_at": item["created_at"],
                    "test_title": "Deleted Test",
                    "test_settings": {},
                    "violation_count": item.get("violation_count") or 0,
                    "questions_attempted": item.get("questions_attempted") or 0,
                    "metadata": item.get("metadata") or {}
                }
            else:
                flat = {
                    "id": item["id"],
                    "test_id": tid,
                    "score": item["score"],
                    "created_at": item["created_at"],
                    "test_title": test.get("title") or "Unknown Test",
                    "test_settings": test.get("settings") or {},
                    "total_max_marks": test.get("total_max_marks") or 0,
                    "violation_count": item.get("violation_count") or 0,
                    "questions_attempted": item.get("questions_attempted") or 0,
                    "metadata": item.get("metadata") or {}
                }
            enriched.append(flat)
            
        return enriched
        
    except Exception as e:
        print(f"!!! ERROR in get_user_attempts: {e}")
        import traceback
        traceback.print_exc()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch-status")
async def get_batch_status(
    payload: BatchStatusRequest,
    db: Client = Depends(get_db)
):
    try:
        user_id = payload.user_id
        test_ids = payload.test_ids
        if not user_id or not test_ids:
            return {}

        # 1. Check registrations for in_progress status
        reg_res = db.table("test_registrations")\
            .select("test_id, status")\
            .eq("user_id", user_id)\
            .in_("test_id", test_ids)\
            .execute()

        # 2. Check user_tests for completed status and scores
        att_res = supabase.table("user_tests")\
            .select("test_id, score")\
            .eq("user_id", user_id)\
            .in_("test_id", test_ids)\
            .order("score", desc=True)\
            .execute()

        test_ids_norm = [str(tid).lower() for tid in test_ids]
        results = {}
        for t in test_ids_norm:
            results[t] = None

        for r in reg_res.data or []:
            tid = str(r.get("test_id", "")).lower()
            if tid in results:
                results[tid] = {"status": r["status"]}

        for a in att_res.data or []:
            tid = str(a.get("test_id", "")).lower()
            if tid in results:
                if not results[tid]:
                    results[tid] = {"status": "submitted"}
                
                # Keep the highest score if multiple attempts
                current_score = results[tid].get("score", -999999)
                if a["score"] > current_score:
                    results[tid]["score"] = a["score"]
                    results[tid]["status"] = "submitted"
                
        # Calculate total marks for submitted tests
        submitted_ids = [k for k, v in results.items() if v and v.get("status") == "submitted"]
        if submitted_ids:
            try:
                tests_res = db.table("tests").select("id, total_max_marks").in_("id", submitted_ids).execute()
                for t in tests_res.data or []:
                    tid_str = str(t["id"]).lower()
                    if tid_str in results:
                        results[tid_str]["total_marks"] = t.get("total_max_marks", 0)
            except Exception as e:
                print(f"Batch-status Exception: {e}")

        return results
    except Exception as e:
        print(f"Error fetching batch status: {e}")
        return {}

@router.get("/check/{user_id}/{test_id}")
async def check_attempt_status(
    user_id: str,
    test_id: str,
    db: Client = Depends(get_db)
):
    try:
        # 1. Check registrations
        reg_res = db.table("test_registrations")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("test_id", test_id)\
            .limit(1)\
            .execute()
            
        has_attempted = False
        if reg_res.data and len(reg_res.data) > 0:
            has_attempted = True
        else:
             # 2. Check user_tests
            att_res = supabase.table("user_tests")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("test_id", test_id)\
                .limit(1)\
                .execute()
            if att_res.data and len(att_res.data) > 0:
                has_attempted = True
                
        return {"hasAttempted": has_attempted}

    except Exception as e:
        print(f"Error checking attempt status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/register")
async def register_start(
    payload: RegisterRequest,
    db: Client = Depends(get_db)
):
    try:
        if not payload.user_id:
            # Anonymous users are tracked exclusively via anon_test_attempts
            return {"success": True}

        # Build the insert data
        insert_data: Dict[str, Any] = {
            "test_id": payload.test_id,
            "user_id": payload.user_id
        }

        # Check if already registered (for non-anonymous only)
        existing = supabase.table("test_registrations")\
            .select("id, status")\
            .eq("user_id", payload.user_id)\
            .eq("test_id", payload.test_id)\
            .execute()

        if existing.data:
            # Reset to in_progress if re-starting (not submitted)
            row = existing.data[0]
            if row.get("status") != "submitted":
                try:
                    supabase.table("test_registrations")\
                        .update({"status": "in_progress", "completion_percentage": 0})\
                        .eq("id", row["id"]).execute()
                except Exception:
                    pass  # columns may not exist yet
            return {"success": True}

        # Try insert with analytics columns first
        try:
            insert_data["status"] = "in_progress"
            insert_data["completion_percentage"] = 0
            supabase.table("test_registrations").insert(insert_data).execute()
        except Exception:
            # Fallback: insert without analytics columns (migration not run yet)
            fallback_data = {
                "test_id": payload.test_id,
                "user_id": payload.user_id
            }
            supabase.table("test_registrations").insert(fallback_data).execute()

        return {"success": True}

    except Exception as e:
        print(f"Error registering start: {e}")
        # Non-critical: don't block the test start
        return {"success": False}

@router.get("/{attempt_id}")
async def get_attempt_detail(
    attempt_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        # Check authentication
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        token = auth_header.replace("Bearer ", "")
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user_response.user.id
        
        # Fetch attempt
        response = supabase.table("user_tests")\
            .select("*")\
            .eq("id", attempt_id)\
            .single()\
            .execute()
            
        if not response.data:
            raise HTTPException(status_code=404, detail="Attempt not found")
        # Verify access: owner, admin, or test creator
        attempt = response.data
        test_id = attempt.get("test_id")
        is_creator = False
        if test_id:
            test_res = supabase.table("tests").select("created_by").eq("id", test_id).single().execute()
            if test_res.data and test_res.data.get("created_by") == user_id:
                is_creator = True

        admin_res = supabase.table("admins").select("email").eq("email", user_response.user.email).execute()
        is_admin = admin_res.data and len(admin_res.data) > 0

        if attempt.get("user_id") != user_id:
            if not is_admin and not is_creator:
                raise HTTPException(status_code=403, detail="Not authorized")
        else:
            # If user deleted this attempt from their end, and is not creator/admin, treat as not found
            if (attempt.get("metadata") or {}).get("deleted_by_user") and not is_admin and not is_creator:
                raise HTTPException(status_code=404, detail="Attempt not found")
                  
        return attempt
    except Exception as e:
        print(f"Error fetching attempt detail: {e}")
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test/{test_id}")
async def get_test_attempts(
    test_id: str,
    request: Request,
    exclude_answers: bool = False,
    db: Client = Depends(get_db)
):
    try:
        # Check authentication
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        token = auth_header.replace("Bearer ", "")
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user_response.user.id

        # Verify admin status
        from app.core.database import supabase
        admin_res = supabase.table("admins").select("email").eq("email", user_response.user.email).execute()
        is_admin = admin_res.data and len(admin_res.data) > 0

        # Determine Premium Access
        is_premium = False
        is_conduct_exam = False

        # Retrieve test details to verify existence and check conduct mode settings
        test_ownership_res = supabase.table("tests").select("created_by, visibility, settings").eq("id", test_id).single().execute()
        if not test_ownership_res.data:
            raise HTTPException(status_code=404, detail="Test not found")

        test_data = test_ownership_res.data
        test_created_by = test_data.get("created_by")
        test_visibility = test_data.get("visibility", "public")
        is_conduct_exam = bool(test_data.get("settings", {}) and test_data["settings"].get("conduct_exam"))

        if is_admin:
            is_premium = True
        else:
            # Only the creator or admin can view results
            if user_id != test_created_by:
                raise HTTPException(status_code=403, detail="Not authorized to view these results")

            # Check global premium unlock and active plans
            settings_res = supabase.table("app_settings").select("unlock_all_premium").limit(1).execute()
            unlock_all = settings_res.data[0].get("unlock_all_premium", False) if settings_res.data else False
            
            plans_res = supabase.table("plans").select("id").eq("is_active", True).limit(1).execute()
            has_active_plans = plans_res.data and len(plans_res.data) > 0
            
            is_premium = unlock_all or not has_active_plans

            if not is_premium:
                profile_res = supabase.table("profiles").select("is_premium, premium_expiry").eq("id", user_id).execute()
                if profile_res.data:
                    profile = profile_res.data[0]
                    if profile.get("is_premium") and profile.get("premium_expiry"):
                        from datetime import datetime, timezone
                        try:
                            # Safely parse UTC string from postgres
                            expiry = datetime.fromisoformat(profile["premium_expiry"].replace('Z', '+00:00'))
                            if expiry.tzinfo is None:
                                expiry = expiry.replace(tzinfo=timezone.utc)
                            now = datetime.now(timezone.utc)
                            is_premium = expiry > now
                        except Exception as parse_error:
                            print(f"Error parsing expiry date: {parse_error}")

        # Fetch all attempts for specific test (including those user deleted from their own history)
        select_cols = "id, test_id, user_id, score, created_at, metadata, violation_count, questions_attempted"
        if not exclude_answers:
            select_cols += ", answers, violation_log"

        response = supabase.table("user_tests")\
            .select(select_cols)\
            .eq("test_id", test_id)\
            .order("score", desc=True)\
            .execute()
            
        data = response.data or []

        # Fetch registrations for this test to map user_id -> started_at fallback
        reg_start_map = {}
        try:
            regs_res = supabase.table("test_registrations")\
                .select("user_id, started_at")\
                .eq("test_id", test_id)\
                .execute()
            for r in (regs_res.data or []):
                uid = r.get("user_id")
                sat = r.get("started_at")
                if uid and sat:
                    reg_start_map[uid] = sat
        except Exception as reg_err:
            print(f"Warning: could not fetch test registrations for started_at fallback: {reg_err}")

        # Enrich metadata with startedAt if missing
        from datetime import datetime
        def parse_iso(iso_str):
            if not iso_str: return None
            try:
                return datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
            except Exception:
                return None

        for attempt in data:
            meta = attempt.get("metadata") or {}
            if "startedAt" not in meta:
                uid = attempt.get("user_id")
                fallback_start = reg_start_map.get(uid)
                created_at_str = attempt.get("created_at")
                
                if fallback_start and created_at_str:
                    reg_dt = parse_iso(fallback_start)
                    created_dt = parse_iso(created_at_str)
                    if reg_dt and created_dt and reg_dt > created_dt:
                        fallback_start = None
                        
                meta["startedAt"] = fallback_start or attempt.get("created_at")
                attempt["metadata"] = meta

        # Filter attempts: allow conducted attempts, attempts with candidate form data, and all attempts for open tests
        if not is_admin:
            filtered_data = []
            is_login_req = bool(test_data.get("settings", {}).get("login_required", False)) if test_data else False
            for a in data:
                meta = a.get("metadata") or {}
                # Allow if it's marked as conducted, or test is conduct exam, or has candidate startFormData, or if test is open
                if meta.get("is_conducted_attempt") or is_conduct_exam or meta.get("startFormData") or not is_login_req:
                    filtered_data.append(a)
            data = filtered_data
        
        # Anonymize data for non-premium
        if not is_premium:
            anonymized = []
            for attempt in data:
                # hide personal info in metadata using a copy
                meta = dict(attempt.get("metadata") or {})
                if "startFormData" in meta:
                    meta["startFormData"] = {"Candidate": "Anonymous User"}
                elif "registrationData" in meta:
                    meta["registrationData"] = {"Candidate": "Anonymous User"}
                
                # Strip stats to completely hide the score
                meta.pop("stats", None)
                
                anon_attempt = {
                    "id": attempt.get("id"),
                    "test_id": attempt.get("test_id"),
                    "user_id": None, # Obscure user ID
                    "score": 0, # Hide score
                    "answers": {}, # Hide answers
                    "created_at": attempt.get("created_at"),
                    "metadata": meta
                }
                anonymized.append(anon_attempt)
            return anonymized
            
        return data
    except Exception as e:
        print(f"Error fetching test attempts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{attempt_id}")
async def delete_attempt(
    attempt_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        # Security: Verify JWT
        requesting_user_id = _verify_auth_token_attempts(request, db)

        # Fetch attempt details
        attempt_res = supabase.table("user_tests").select("id, user_id, test_id, metadata").eq("id", attempt_id).execute()
        if not attempt_res.data:
            raise HTTPException(status_code=404, detail="Attempt not found")

        attempt = attempt_res.data[0]
        attempt_owner = attempt.get("user_id")
        test_id = attempt.get("test_id")

        # Check if requesting user is the creator of the test
        is_creator = False
        if test_id:
            test_res = supabase.table("tests").select("created_by").eq("id", test_id).single().execute()
            if test_res.data and test_res.data.get("created_by") == requesting_user_id:
                is_creator = True

        # Check if requesting user is an admin
        profile_res = supabase.table("profiles").select("email").eq("id", requesting_user_id).execute()
        user_email = profile_res.data[0].get("email") if profile_res.data else None
        is_admin = False
        if user_email:
            admin_res = supabase.table("admins").select("email").eq("email", user_email).execute()
            is_admin = any(a.get("email") == user_email for a in (admin_res.data or []))

        # Authorization: must be attempt owner, test creator, or admin
        if not (attempt_owner == requesting_user_id or is_creator or is_admin):
            raise HTTPException(status_code=403, detail="Not authorized to delete this attempt")

        if is_creator or is_admin:
            # Creator or Admin deletion -> Hard delete from database (deleted from BOTH creator and candidate ends)
            supabase.table("user_tests").delete().eq("id", attempt_id).execute()
            return {"success": True, "action": "hard_delete"}
        else:
            # Candidate / User deletion -> Soft delete in metadata
            # Candidate no longer sees it in test history, but test creator still sees it fully
            meta = dict(attempt.get("metadata") or {})
            meta["deleted_by_user"] = True
            supabase.table("user_tests").update({"metadata": meta}).eq("id", attempt_id).execute()
            return {"success": True, "action": "soft_delete"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete attempt")

@router.delete("/registration/{test_id}/{user_id}")
async def delete_registration(
    test_id: str,
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        # Security: Verify JWT and ownership
        requesting_user_id = _verify_auth_token_attempts(request, db)
        if requesting_user_id != user_id:
            # Check admin
            profile_res = supabase.table("profiles").select("email").eq("id", requesting_user_id).execute()
            user_email = profile_res.data[0].get("email") if profile_res.data else None
            if user_email:
                admin_res = supabase.table("admins").select("email").eq("email", user_email).execute()
                if not admin_res.data:
                    raise HTTPException(status_code=403, detail="Not authorized")
            else:
                raise HTTPException(status_code=403, detail="Not authorized")

        db.table("test_registrations").delete().eq("test_id", test_id).eq("user_id", user_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to delete registration")


# ─── Progress Tracking ─────────────────────────────────────────
@router.post("/progress")
async def update_progress(
    payload: ProgressUpdateRequest,
    background_tasks: BackgroundTasks
):
    """Called periodically by the frontend to record how far a user is in a test."""
    background_tasks.add_task(process_progress, payload)
    return {"success": True}


# ─── Abandonment Tracking ──────────────────────────────────────
@router.post("/abandon")
async def mark_abandoned(
    payload: AbandonRequest,
    background_tasks: BackgroundTasks
):
    """Called when user closes tab or explicitly leaves a test without submitting."""
    background_tasks.add_task(process_abandon, payload)
    return {"success": True}



@router.post("/anon/start")
async def anon_start(payload: AnonStartRequest, db: Client = Depends(get_db)):
    """Register an anonymous user starting a test."""
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        # Check if session already started this test (e.g. page refresh)
        existing = supabase.table("anon_test_attempts")\
            .select("id, status")\
            .eq("session_token", payload.session_token)\
            .eq("test_id", payload.test_id)\
            .limit(1).execute()

        if existing.data:
            row = existing.data[0]
            # If already submitted, don't reset
            if row.get("status") == "submitted":
                return {"success": True, "resumed": False}
            # If in_progress, it's a refresh - just update last_active
            supabase.table("anon_test_attempts")\
                .update({"last_active_at": now})\
                .eq("id", row["id"]).execute()
            return {"success": True, "resumed": True}

        # New session
        supabase.table("anon_test_attempts").insert({
            "session_token": payload.session_token,
            "test_id": payload.test_id,
            "status": "in_progress",
            "completion_pct": 0,
            "started_at": now,
            "last_active_at": now
        }).execute()
        return {"success": True, "resumed": False}
    except Exception as e:
        print(f"Error in anon/start: {e}")
        return {"success": False}


@router.post("/anon/progress")
async def anon_progress(
    payload: AnonProgressRequest,
    background_tasks: BackgroundTasks
):
    """Update completion progress for an anonymous test session."""
    background_tasks.add_task(process_anon_progress, payload)
    return {"success": True}


@router.post("/anon/submit")
async def anon_submit(payload: AnonSubmitRequest, db: Client = Depends(get_db)):
    """Mark an anonymous test as submitted, storing answers and score."""
    try:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc).isoformat()

        supabase.table("anon_test_attempts")\
            .update({
                "status": "submitted",
                "answers": payload.answers or {},
                "score": payload.score or 0,
                "completion_pct": 100,
                "submitted_at": now,
                "last_active_at": now
            })\
            .eq("session_token", payload.session_token)\
            .eq("test_id", payload.test_id)\
            .neq("status", "submitted")\
            .execute()
        return {"success": True}
    except Exception as e:
        print(f"Error in anon/submit: {e}")
        return {"success": False}


@router.post("/anon/abandon")
async def anon_abandon(
    payload: AnonAbandonRequest,
    background_tasks: BackgroundTasks
):
    """Mark an anonymous test as abandoned (e.g. tab closed)."""
    background_tasks.add_task(process_anon_abandon, payload)
    return {"success": True}
