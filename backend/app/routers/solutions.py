from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.database import get_db
from supabase import Client
from typing import Dict, Any
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class UpdateSolutionsRequest(BaseModel):
    solutions: Dict[str, str]

@router.put("/{test_id}/solutions")
async def save_test_solutions(
    test_id: str,
    payload: UpdateSolutionsRequest,
    request: Request,
    db: Client = Depends(get_db)
):
    """
    Save or update solutions for a specific test.
    Validates that the caller is the test creator.
    """
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
            
        token = auth_header.replace("Bearer ", "")
        user_resp = db.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(status_code=401, detail="Not authenticated")
            
        user_id = user_resp.user.id
        
        # Check if the test exists and verify ownership
        test_resp = db.table("tests").select("created_by").eq("id", test_id).execute()
        
        if not test_resp.data:
            raise HTTPException(status_code=404, detail="Test not found")
            
        if test_resp.data[0].get("created_by") != user_id:
            # Maybe admin check here as well if needed in the future, for now strict creator check
            raise HTTPException(status_code=403, detail="Only the creator can update solutions")
            
        # Update the solutions column
        update_resp = db.table("tests").update({
            "solutions": payload.solutions
        }).eq("id", test_id).execute()
        
        if not update_resp.data:
            raise HTTPException(status_code=500, detail="Failed to update solutions")
            
        return {"success": True, "count": len(payload.solutions), "message": "Solutions saved successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving solutions for test {test_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{test_id}/solutions")
async def get_test_solutions(
    test_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """
    Fetch the solutions for a specific test.

    C4: solutions are part of the answer key, so they are released only to the test
    owner, to admins, and to a candidate who has already submitted an attempt — the
    same rule GET /api/tests/{id} applies to `correctAnswer`.
    """
    from app.core.auth import get_optional_user_id, is_admin_user

    try:
        test_resp = db.table("tests").select("id, created_by, solutions").eq("id", test_id).execute()
        
        if not test_resp.data:
            raise HTTPException(status_code=404, detail="Test not found")

        test_row = test_resp.data[0]
        requesting_user_id = get_optional_user_id(request, db)
        allowed = False
        if requesting_user_id:
            if test_row.get("created_by") == requesting_user_id or is_admin_user(requesting_user_id, db):
                allowed = True
            else:
                attempt = db.table("user_tests").select("id")                    .eq("user_id", requesting_user_id).eq("test_id", test_id).limit(1).execute()
                allowed = bool(attempt.data)
        if not allowed:
            return {"has_solutions": False, "solutions": {}}

        solutions = test_row.get("solutions")
        
        return {
            "has_solutions": solutions is not None and len(solutions) > 0,
            "solutions": solutions or {}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching solutions for test {test_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
