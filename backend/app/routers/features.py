from fastapi import APIRouter, HTTPException, Depends
from app.core.database import get_db
from supabase import Client
from typing import Dict, Any
from pydantic import BaseModel

router = APIRouter()

@router.get("/flags")
async def get_feature_flags(db: Client = Depends(get_db)):
    """Get global feature flags available to everyone"""
    try:
        response = db.table("app_settings").select("enable_anonymous_tests, enable_ai_test_generation, ai_test_generation_notes").limit(1).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return {"enable_anonymous_tests": False, "enable_ai_test_generation": True, "ai_test_generation_notes": ""}
    except Exception as e:
        print(f"Error fetching feature flags: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class UpdateFeatureFlagsRequest(BaseModel):
    enable_anonymous_tests: bool
    enable_ai_test_generation: bool = True
    ai_test_generation_notes: str = ""

@router.put("/flags")
async def update_feature_flags(payload: UpdateFeatureFlagsRequest, db: Client = Depends(get_db)):
    """Update global feature flags (admin only via RLS in supabase)"""
    try:
        # Get the first (and should be only) settings row
        settings_res = db.table("app_settings").select("id").limit(1).execute()
        
        if settings_res.data and len(settings_res.data) > 0:
            settings_id = settings_res.data[0]["id"]
            # Update existing settings
            response = db.table("app_settings").update({
                "enable_anonymous_tests": payload.enable_anonymous_tests,
                "enable_ai_test_generation": payload.enable_ai_test_generation,
                "ai_test_generation_notes": payload.ai_test_generation_notes
            }).eq("id", settings_id).execute()
            
            if response.data:
                return response.data[0]
        else:
            # Insert new settings if none exist
            response = db.table("app_settings").insert({
                "enable_anonymous_tests": payload.enable_anonymous_tests,
                "enable_ai_test_generation": payload.enable_ai_test_generation,
                "ai_test_generation_notes": payload.ai_test_generation_notes
            }).execute()
            if response.data:
                return response.data[0]
                
        raise HTTPException(status_code=500, detail="Failed to update settings")
    except Exception as e:
        print(f"Error updating feature flags: {e}")
        raise HTTPException(status_code=500, detail=str(e))
