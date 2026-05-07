import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import supabase
from app.utils.attempt_control import calculate_test_max_marks

async def backfill_marks():
    print("Fetching all tests...")
    # Using python supabase client
    response = supabase.table("tests").select("id, questions, sections, enable_section_mode, settings, total_max_marks").execute()
    tests = response.data
    print(f"Found {len(tests)} tests.")
    
    updated_count = 0
    for test in tests:
        stats = calculate_test_max_marks(test)
        new_max = stats["total_max_marks"]
        if new_max != test.get("total_max_marks"):
            print(f"Updating test {test['id']} max marks to {new_max}")
            supabase.table("tests").update({"total_max_marks": new_max}).eq("id", test["id"]).execute()
            updated_count += 1
            
    print(f"Update complete. Modified {updated_count} tests.")

if __name__ == "__main__":
    asyncio.run(backfill_marks())
