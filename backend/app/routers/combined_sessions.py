"""
Combined Sessions Router
Handles JEE Advanced-style Paper 1 + Paper 2 combined test sessions.
"""

from fastapi import APIRouter, HTTPException, Request, Depends
from app.core.database import get_db, supabase
from supabase import Client
from pydantic import BaseModel
from typing import Optional, Any, Dict
import traceback

router = APIRouter()


# ── Schemas ─────────────────────────────────────────────────────────────────

class CreateCombinedSessionRequest(BaseModel):
    created_by: str
    test1_id: str
    test2_id: str
    title: str
    description: Optional[str] = None
    paper1_label: str = "Paper I"
    paper2_label: str = "Paper II"
    break_duration_minutes: int = 30
    is_public: bool = False


class SaveCombinedAttemptRequest(BaseModel):
    user_id: str
    combined_session_id: str
    paper1_data: Dict[str, Any]   # { test_id, answers, score, total_marks, test_title }
    paper2_data: Dict[str, Any]   # { test_id, answers, score, total_marks, test_title }
    total_score: Optional[float] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _verify_auth_token(request: Request, db: Client):
    """Verify JWT from Authorization header, return user_id."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = auth_header.replace("Bearer ", "")
    user_response = db.auth.get_user(token)
    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return user_response.user.id


def _enrich_session(session: dict) -> dict:
    """Safely initialize test keys; tests are now batched independently by frontend."""
    session.setdefault("test1", None)
    session.setdefault("test2", None)
    return session



# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("")
async def create_combined_session(
    payload: CreateCombinedSessionRequest,
    request: Request,
    db: Client = Depends(get_db)
):
    """Create a new combined session (creator-only)."""
    try:
        user_id = _verify_auth_token(request, db)
        # Validate user matches payload
        if user_id != payload.created_by:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Confirm both tests exist
        for tid in [payload.test1_id, payload.test2_id]:
            res = supabase.table("tests").select("id").eq("id", tid).maybe_single().execute()
            if not res.data:
                raise HTTPException(status_code=404, detail=f"Test {tid} not found")

        insert_data = {
            "created_by": payload.created_by,
            "test1_id": payload.test1_id,
            "test2_id": payload.test2_id,
            "title": payload.title,
            "description": payload.description,
            "paper1_label": payload.paper1_label,
            "paper2_label": payload.paper2_label,
            "break_duration_minutes": payload.break_duration_minutes,
            "is_public": payload.is_public,
        }

        res = supabase.table("combined_sessions").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to create combined session")

        session = res.data[0]
        return {"data": _enrich_session(session), "error": None}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public")
async def get_public_combined_sessions(db: Client = Depends(get_db)):
    """List all publicly visible combined sessions (for dashboard)."""
    try:
        res = supabase.table("combined_sessions")\
            .select("*")\
            .eq("is_public", True)\
            .order("created_at", desc=True)\
            .execute()

        sessions = res.data or []
        enriched = [_enrich_session(s) for s in sessions]
        return enriched

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}")
async def get_user_combined_sessions(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """List combined sessions created by this user."""
    try:
        requesting_user_id = _verify_auth_token(request, db)
        if requesting_user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        res = supabase.table("combined_sessions")\
            .select("*")\
            .eq("created_by", user_id)\
            .order("created_at", desc=True)\
            .execute()

        sessions = res.data or []
        enriched = [_enrich_session(s) for s in sessions]
        return enriched

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/all")
async def get_all_combined_sessions_admin(
    request: Request,
    db: Client = Depends(get_db)
):
    """List ALL combined sessions (admin use — no visibility filter)."""
    try:
        _verify_auth_token(request, db)  # Must be logged in
        res = supabase.table("combined_sessions")\
            .select("*")\
            .order("created_at", desc=True)\
            .execute()

        return res.data or []

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}")

async def get_combined_session(
    session_id: str,
    db: Client = Depends(get_db)
):
    """Fetch a single combined session by ID (public or by creator)."""
    try:
        res = supabase.table("combined_sessions")\
            .select("*")\
            .eq("id", session_id)\
            .single()\
            .execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Combined session not found")

        return {"data": _enrich_session(res.data), "error": None}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{session_id}")
async def delete_combined_session(
    session_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """Delete a combined session (creator only)."""
    try:
        user_id = _verify_auth_token(request, db)

        # Fetch session to verify ownership
        res = supabase.table("combined_sessions")\
            .select("created_by")\
            .eq("id", session_id)\
            .single()\
            .execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Session not found")

        if res.data["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        supabase.table("combined_sessions").delete().eq("id", session_id).execute()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Combined Attempts ────────────────────────────────────────────────────────

@router.post("/attempts/save")
async def save_combined_attempt(
    payload: SaveCombinedAttemptRequest,
    request: Request,
    db: Client = Depends(get_db)
):
    """Save a completed combined attempt (both papers)."""
    try:
        user_id = _verify_auth_token(request, db)
        if user_id != payload.user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        p1_score = payload.paper1_data.get("score", 0) or 0
        p2_score = payload.paper2_data.get("score", 0) or 0
        total = payload.total_score if payload.total_score is not None else (p1_score + p2_score)

        insert_data = {
            "user_id": payload.user_id,
            "combined_session_id": payload.combined_session_id,
            "paper1_data": payload.paper1_data,
            "paper2_data": payload.paper2_data,
            "total_score": total,
        }

        res = supabase.table("combined_attempts").insert(insert_data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Failed to save combined attempt")

        return {"data": res.data[0], "error": None}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/user/{user_id}")
async def get_user_combined_attempts(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """Fetch all combined attempts for a user (for history page)."""
    try:
        requesting_user_id = _verify_auth_token(request, db)
        if requesting_user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        attempts_res = supabase.table("combined_attempts")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()

        attempts = attempts_res.data or []

        # Enrich with combined session title
        session_ids = list(set([a["combined_session_id"] for a in attempts if a.get("combined_session_id")]))
        sessions_map = {}
        if session_ids:
            sessions_res = supabase.table("combined_sessions")\
                .select("id, title, paper1_label, paper2_label")\
                .in_("id", session_ids)\
                .execute()
            sessions_map = {s["id"]: s for s in (sessions_res.data or [])}

        enriched = []
        for attempt in attempts:
            session = sessions_map.get(attempt.get("combined_session_id"), {})
            enriched.append({
                **attempt,
                "session_title": session.get("title", "Combined Test"),
                "paper1_label": session.get("paper1_label", "Paper I"),
                "paper2_label": session.get("paper2_label", "Paper II"),
            })

        return enriched

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{attempt_id}")
async def get_combined_attempt(
    attempt_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """Fetch a single combined attempt by ID (for results replay)."""
    try:
        user_id = _verify_auth_token(request, db)

        res = supabase.table("combined_attempts")\
            .select("*")\
            .eq("id", attempt_id)\
            .single()\
            .execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Attempt not found")

        if res.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        attempt = res.data

        # Enrich with session title
        session_res = supabase.table("combined_sessions")\
            .select("id, title, paper1_label, paper2_label")\
            .eq("id", attempt["combined_session_id"])\
            .single()\
            .execute()

        session = session_res.data or {}
        attempt["session_title"] = session.get("title", "Combined Test")
        attempt["paper1_label"] = session.get("paper1_label", "Paper I")
        attempt["paper2_label"] = session.get("paper2_label", "Paper II")

        # Re-fetch full test details for results reconstruction
        for paper_key, data_key in [("test1_id", "paper1_data"), ("test2_id", "paper2_data")]:
            test_id = attempt[data_key].get("test_id")
            if test_id:
                test_res = supabase.table("tests")\
                    .select("id, title, questions, settings, enable_section_mode, sections, computed_max_marks, marks_per_question, negative_marks, duration")\
                    .eq("id", test_id)\
                    .single()\
                    .execute()
                if test_res.data:
                    attempt[data_key]["test"] = test_res.data

        return {"data": attempt, "error": None}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/attempts/{attempt_id}")
async def delete_combined_attempt(
    attempt_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """Delete a combined attempt."""
    try:
        user_id = _verify_auth_token(request, db)

        res = supabase.table("combined_attempts")\
            .select("user_id")\
            .eq("id", attempt_id)\
            .single()\
            .execute()

        if not res.data:
            raise HTTPException(status_code=404, detail="Attempt not found")
        if res.data["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        supabase.table("combined_attempts").delete().eq("id", attempt_id).execute()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
