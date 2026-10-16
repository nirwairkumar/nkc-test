from app.schemas.attempts import (
    ProgressUpdateRequest,
    AbandonRequest,
    AnonProgressRequest,
    AnonAbandonRequest
)
from datetime import datetime, timezone
from app.core.database import supabase
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

def process_progress(payload: ProgressUpdateRequest):
    try:
        try:
            status = "in_progress"
            update_data: Dict[str, Any] = {
                "completion_percentage": min(payload.completion_percentage, 100),
                "status": status,
                "last_active_at": datetime.now(timezone.utc).isoformat()
            }
            if payload.answers is not None and payload.user_id:
                # Store a draft copy of answers inside the metadata jsonb column for emergency admin recovery.
                # Merged, so the start form saved at /register (the candidate's name) survives.
                current = supabase.table("test_registrations").select("metadata")\
                    .eq("test_id", payload.test_id).eq("user_id", payload.user_id)\
                    .limit(1).execute()
                metadata = dict(((current.data or [{}])[0].get("metadata")) or {})
                metadata["answers_draft"] = payload.answers
                metadata["answered"] = sum(
                    1 for v in payload.answers.values()
                    if v not in (None, "", []) and not (isinstance(v, dict) and not v)
                )
                update_data["metadata"] = metadata

            query = supabase.table("test_registrations").update(update_data).eq("test_id", payload.test_id)
            if payload.user_id:
                query = query.eq("user_id", payload.user_id)
            else:
                query = query.is_("user_id", "null")
            query = query.neq("status", "submitted")
            query.execute()
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Error in background progress: {e}")

def process_abandon(payload: AbandonRequest):
    try:
        try:
            update_data = {
                "status": "abandoned",
                "abandoned_reason": payload.reason or "tab_closed",
                "last_active_at": datetime.now(timezone.utc).isoformat()
            }
            if payload.completion_percentage is not None:
                update_data["completion_percentage"] = payload.completion_percentage

            query = supabase.table("test_registrations").update(update_data).eq("test_id", payload.test_id)
            if payload.user_id:
                query = query.eq("user_id", payload.user_id)
            else:
                query = query.is_("user_id", "null")
            query = query.neq("status", "submitted")
            query.execute()
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Error in background abandon: {e}")

def process_anon_progress(payload: AnonProgressRequest):
    try:
        now = datetime.now(timezone.utc).isoformat()
        supabase.table("anon_test_attempts")\
            .update({
                "completion_pct": min(payload.completion_pct, 99),
                "last_active_at": now
            })\
            .eq("session_token", payload.session_token)\
            .eq("test_id", payload.test_id)\
            .neq("status", "submitted")\
            .execute()
    except Exception as e:
        logger.error(f"Error in background anon_progress: {e}")

def process_anon_abandon(payload: AnonAbandonRequest):
    try:
        now = datetime.now(timezone.utc).isoformat()
        update_data: Dict[str, Any] = {
            "status": "abandoned",
            "abandoned_reason": payload.reason or "tab_closed",
            "last_active_at": now
        }
        if payload.completion_pct is not None:
            update_data["completion_pct"] = payload.completion_pct

        supabase.table("anon_test_attempts")\
            .update(update_data)\
            .eq("session_token", payload.session_token)\
            .eq("test_id", payload.test_id)\
            .neq("status", "submitted")\
            .execute()
    except Exception as e:
        logger.error(f"Error in background anon_abandon: {e}")
