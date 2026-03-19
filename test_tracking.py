import asyncio
import json
from datetime import datetime, timezone
from app.core.database import supabase

async def process_anon_start():
    now = datetime.now(timezone.utc).isoformat()
    session_token = "test_token_123"
    test_id = "11111111-1111-1111-1111-111111111111" # We need a real test ID to avoid foreign key errors!
    
    # 1. Fetch a real test_id first
    res = supabase.table("tests").select("id").limit(1).execute()
    if not res.data:
        print("No tests found.")
        return
    test_id = res.data[0]["id"]
    print(f"Using real test_id: {test_id}")
    
    try:
        supabase.table("anon_test_attempts").insert({
            "session_token": session_token,
            "test_id": test_id,
            "status": "in_progress",
            "completion_pct": 0,
            "started_at": now,
            "last_active_at": now
        }).execute()
        print("Insert successful!")
    except Exception as e:
        print("Insert Error:", e)

    try:
        supabase.table("anon_test_attempts")\
            .update({
                "status": "abandoned",
                "abandoned_reason": "test python script",
                "last_active_at": now
            })\
            .eq("session_token", session_token)\
            .execute()
        print("Update successful!")
    except Exception as e:
        print("Update Error:", e)

if __name__ == "__main__":
    asyncio.run(process_anon_start())
