import asyncio
import traceback
from app.core.database import supabase
from datetime import datetime, timezone

def analyze_db():
    try:
        print("Fetching a single registration to inspect columns...")
        resp = supabase.table("test_registrations").select("*").limit(1).execute()
        if not resp.data:
            print("No test registrations found!")
            return
            
        row = resp.data[0]
        print("Columns present in test_registrations:")
        for k in row.keys():
            print(f"- {k}")
            
        # specifically find an in_progress test to test update!
        resp2 = supabase.table("test_registrations").select("*").eq("status", "in_progress").limit(1).execute()
        if not resp2.data:
            print("No in_progress tests found to simulate update on!")
            return
            
        test_row = resp2.data[0]
        print(f"\nSimulating process_progress on row ID {test_row.get('id')}")
        
        status = "in_progress"
        update_data = {
            "completion_percentage": 55,
            "status": status,
            "last_active_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Test adding metadata
        update_data["metadata"] = {"answers_draft": {"test": "data"}}
        
        print(f"Data to update: {update_data}")
        query = supabase.table("test_registrations").update(update_data).eq("test_id", test_row["test_id"]).eq("user_id", test_row["user_id"]).neq("status", "submitted")
        
        result = query.execute()
        print(f"\nResult of update: {result}")
        
    except Exception as e:
        print(f"\nERROR OCCURRED: {e}")
        traceback.print_exc()

analyze_db()
