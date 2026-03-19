import asyncio
from app.core.database import supabase
from datetime import datetime, timezone

async def process_test():
    try:
        # Fetch an existing registration
        res = supabase.table("test_registrations").select("*").limit(1).execute()
        if not res.data:
            print("No registrations found.")
            return
            
        reg = res.data[0]
        print(f"Updating registration ID: {reg['id']}")
        
        # Try updating status
        update_res = supabase.table("test_registrations")\
            .update({"status": "abandoned", "completion_percentage": 50})\
            .eq("id", reg["id"])\
            .execute()
        print("Update result:", update_res)
    except Exception as e:
        print("Update Error:", e)

if __name__ == "__main__":
    asyncio.run(process_test())
