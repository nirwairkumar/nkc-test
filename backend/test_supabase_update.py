import asyncio
from app.core.database import supabase

def test_update():
    # just fetch the first registration
    resp = supabase.table("test_registrations").select("*").limit(1).execute()
    if not resp.data:
        print("No registrations found.")
        return
    row = resp.data[0]
    print(f"Found row: {row}")
    user_id = row["user_id"]
    test_id = row["test_id"]
    
    update_data = {"completion_percentage": 99.9}
    query = supabase.table("test_registrations").update(update_data).eq("test_id", test_id).eq("user_id", user_id).neq("status", "submitted")
    upd_resp = query.execute()
    print(f"Update response: {upd_resp}")

test_update()
