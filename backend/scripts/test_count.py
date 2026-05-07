import asyncio
import os
import sys
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import supabase

async def test_limit_0():
    start_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
    try:
        print("Testing limit 0...")
        res = supabase.table("visitors").select("id", count="exact").gte("created_at", start_date).limit(0).execute()
        print(f"Data length: {len(res.data)}")
        print(f"Count: {getattr(res, 'count', 'None')}")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test_limit_0())
