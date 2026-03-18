from app.schemas.attempts import (
    ProgressUpdateRequest,
    AbandonRequest,
    AnonProgressRequest,
    AnonAbandonRequest
)
from datetime import datetime, timezone
from app.core.database import supabase
from typing import Dict, Any

def process_progress(payload: ProgressUpdateRequest):
    try:
        try:
            status = "submitted" if payload.completion_percentage >= 100 else "in_progress"
            update_data = {
                "completion_percentage": min(payload.completion_percentage, 100),
                "status": status,
                "last_active_at": datetime.now(timezone.utc).isoformat()
            }
            query = supabase.table("test_registrations").update(update_data).eq("test_id", payload.test_id)
            if payload.user_id:
                query = query.eq("user_id", payload.user_id)
            else:
                query = query.is_("user_id", "null")
            query.execute()
        except Exception:
            pass
    except Exception as e:
        print(f"Error in background progress: {e}")

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
            query.execute()
        except Exception:
            pass
    except Exception as e:
        print(f"Error in background abandon: {e}")

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
        print(f"Error in background anon_progress: {e}")

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
        print(f"Error in background anon_abandon: {e}")
