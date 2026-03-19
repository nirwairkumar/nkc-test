import asyncio
from app.core.database import supabase

async def process_reg_start():
    test_id = "410a1ac2-711c-4b5b-9a02-c85a87d9f12f"
    user_id = "fb38fd48-4cb5-4f40-8b09-fe40fb178c77" # My known user
    
    try:
        res = supabase.table("test_registrations").insert({
            "test_id": test_id,
            "user_id": user_id,
            "status": "in_progress",
            "completion_percentage": 0
        }).execute()
        print("Insert successful!")
    except Exception as e:
        print("Insert Error:", e)

if __name__ == "__main__":
    asyncio.run(process_reg_start())
