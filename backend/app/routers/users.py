import base64
import json
import time
from fastapi import APIRouter, HTTPException, Depends, Request
from app.core.database import get_db, supabase # Import global supabase client
from supabase import Client
from typing import Optional, List, Dict, Any
from cachetools import TTLCache

router = APIRouter()
admin_cache = TTLCache(maxsize=1000, ttl=300) # 5 minutes in-memory cache for admin email checks

def _verify_auth_token(request: Request, db: Client) -> str:
    """Verify JWT from Authorization header and return requesting user's ID."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    token = auth_header.replace("Bearer ", "")

    # Fast path: decode JWT payload locally to eliminate 300ms network roundtrip to Supabase Auth API
    try:
        parts = token.split(".")
        if len(parts) == 3:
            payload_b64 = parts[1]
            payload_b64 += "=" * (-len(payload_b64) % 4)
            payload = json.loads(base64.b64decode(payload_b64).decode("utf-8"))
            user_id = payload.get("sub")
            exp = payload.get("exp")
            if user_id and exp and time.time() < exp:
                return user_id
    except Exception:
        pass

    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def _verify_is_admin(request: Request, db: Client) -> str:
    requesting_user_id = _verify_auth_token(request, db)
    
    # Check if admin
    profile_res = db.table("profiles").select("email").eq("id", requesting_user_id).execute()
    is_admin = False
    if profile_res.data:
        email = profile_res.data[0].get("email")
        if email:
            if email in admin_cache:
                is_admin = admin_cache[email]
            else:
                admin_res = db.table("admins").select("email").eq("email", email).execute()
                is_admin = bool(admin_res.data)
                admin_cache[email] = is_admin
            
    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin authorization required")
    return requesting_user_id

def _verify_owner_or_admin(user_id: str, request: Request, db: Client) -> str:
    requesting_user_id = _verify_auth_token(request, db)
    if requesting_user_id == user_id:
        return requesting_user_id
        
    # Check if admin
    profile_res = db.table("profiles").select("email").eq("id", requesting_user_id).execute()
    is_admin = False
    if profile_res.data:
        email = profile_res.data[0].get("email")
        if email:
            if email in admin_cache:
                is_admin = admin_cache[email]
            else:
                admin_res = db.table("admins").select("email").eq("email", email).execute()
                is_admin = bool(admin_res.data)
                admin_cache[email] = is_admin
            
    if not is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return requesting_user_id

@router.put("/{user_id}/verify")
async def verify_creator(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    print(f"\n{'='*60}")
    print(f"VERIFY CREATOR REQUEST for user_id: {user_id}")
    print(f"{'='*60}")
    
    try:
        _verify_is_admin(request, db)
        from datetime import datetime, timezone
        
        # Step 1: Check if profile exists
        print(f"Checking if profile exists...")
        profile_check = supabase.table("profiles").select("id").eq("id", user_id).execute()
        print(f"Profile check result: {profile_check.data}")
        
        if not profile_check.data or len(profile_check.data) == 0:
            print(f"⚠ Profile doesn't exist for user {user_id}")
            print(f"Fetching user details from auth.users...")
            
            # Get user details from auth
            try:
                auth_user = supabase.auth.admin.get_user_by_id(user_id)
                print(f"Auth user found: {auth_user}")
                
                # Create profile
                profile_data = {
                    "id": user_id,
                    "email": auth_user.user.email if auth_user and auth_user.user else None,
                    "full_name": auth_user.user.user_metadata.get("full_name") if auth_user and auth_user.user and auth_user.user.user_metadata else None,
                }
                
                print(f"Creating profile with data: {profile_data}")
                create_result = supabase.table("profiles").insert(profile_data).execute()
                print(f"Profile created: {create_result.data}")
            except Exception as create_error:
                print(f"Error creating profile: {create_error}")
                raise HTTPException(status_code=500, detail=f"User profile doesn't exist and couldn't be created: {str(create_error)}")
        
        # Step 2: Update with verification
        updates = {
            "is_verified_creator": True,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }
        
        print(f"Updates to apply: {updates}")
        
        # Use global 'supabase' client to bypass RLS for admin action
        response = supabase.table("profiles").update(updates).eq("id", user_id).execute()
        
        print(f"Response: {response}")
        print(f"Response Data: {response.data}")
        
        if response.data and len(response.data) > 0:
            print(f"✓ Verification successful!")
            print(f"{'='*60}\n")
            return response.data[0]
        
        print(f"✗ No data returned from update - user might not exist")
        print(f"{'='*60}\n")
        raise HTTPException(status_code=404, detail="User profile not found")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error verifying creator: {e}")
        # Check if it's a known error type
        if hasattr(e, 'message'):
            detail = e.message
        elif hasattr(e, 'details'):
            detail = e.details
        else:
            detail = str(e)
        raise HTTPException(status_code=500, detail=f"Failed to verify: {detail}")

@router.put("/{user_id}/revoke")
async def revoke_verification(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        _verify_is_admin(request, db)
        updates = {
            "is_verified_creator": False,
            "verified_role": None,
            "verified_at": None,
            "verified_by_admin_id": None
        }
        # Use global 'supabase' client to bypass RLS for admin action
        response = supabase.table("profiles").update(updates).eq("id", user_id).execute()
        if response.data:
            return response.data[0]
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error revoking verification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/check-admin")
async def check_admin(
    request: Request,
    user_id: str,
    db: Client = Depends(get_db)
):
    try:
        _verify_auth_token(request, db)
        # 1. Fetch user's email from profiles
        user_profile = supabase.table("profiles").select("email").eq("id", user_id).execute()
        if not user_profile.data:
            return False
            
        user_email = user_profile.data[0].get("email")
        if not user_email:
            return False

        # Check in-memory cache first
        if user_email in admin_cache:
            return admin_cache[user_email]

        # 2. Check if email exists in admins table
        response = supabase.table("admins").select("email").eq("email", user_email).execute()
        is_admin = bool(response.data)
        admin_cache[user_email] = is_admin
        return is_admin
    except Exception as e:
        print(f"Error checking admin: {e}")
        return False

@router.get("/")
async def get_all_users(
    request: Request,
    ids: Optional[str] = None,
    db: Client = Depends(get_db)
):
    try:
        _verify_is_admin(request, db)
        query = db.table("profiles").select("*")
        
        if ids:
            # ids is comma separated string "id1,id2"
            id_list = ids.split(",")
            query = query.in_("id", id_list)
        else:
            query = query.order("created_at", desc=True)
            
        response = query.execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{user_id}")
async def update_user_profile(
    user_id: str,
    updates: Dict[str, Any],
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(user_id, request, db)
        
        # Check if profile exists
        profile_check = db.table("profiles").select("id").eq("id", user_id).execute()
        
        if not profile_check.data:
            print(f"Profile doesn't exist for user {user_id} in update_user_profile. Inserting new profile...")
            if "email" not in updates:
                try:
                    auth_user = supabase.auth.admin.get_user_by_id(user_id)
                    if auth_user and auth_user.user:
                        updates["email"] = auth_user.user.email
                except Exception as auth_err:
                    print(f"Error fetching email from auth in update_user_profile: {auth_err}")
            
            updates["id"] = user_id
            response = db.table("profiles").insert(updates).execute()
        else:
            response = db.table("profiles").update(updates).eq("id", user_id).execute()
        
        # 2. Sync with Tests (if name or avatar changed)
        if updates.get("full_name") or updates.get("avatar_url"):
            test_updates = {}
            if "full_name" in updates:
                test_updates["creator_name"] = updates["full_name"]
            if "avatar_url" in updates:
                test_updates["creator_avatar"] = updates["avatar_url"]
            
            if test_updates:
                db.table("tests").update(test_updates).eq("created_by", user_id).execute()

        if response.data:
            return response.data[0]
        return None
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error updating user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
async def get_user_details(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        _verify_auth_token(request, db)
        response = db.table("profiles").select("*").eq("id", user_id).execute()
        if not response.data:
            print(f"Profile check in get_user_details: profile does not exist for {user_id}. Attempting auto-provisioning...")
            try:
                auth_user = supabase.auth.admin.get_user_by_id(user_id)
                if auth_user and auth_user.user:
                    email = auth_user.user.email
                    full_name = None
                    if auth_user.user.user_metadata:
                        full_name = auth_user.user.user_metadata.get("full_name")
                    
                    profile_data = {
                        "id": user_id,
                        "email": email,
                        "full_name": full_name,
                    }
                    print(f"Auto-creating profile in get_user_details: {profile_data}")
                    create_result = db.table("profiles").insert(profile_data).execute()
                    if create_result.data:
                        return create_result.data[0]
            except Exception as create_error:
                print(f"Error auto-creating profile in get_user_details: {create_error}")
        return None
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching user details: {e}")
        raise HTTPException(status_code=500, detail=str(e))
            
@router.delete("/{user_id}")
async def delete_user_permanently(
    user_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        _verify_is_admin(request, db)
        
        # Delete profile using global service role client to bypass RLS
        supabase.table("profiles").delete().eq("id", user_id).execute()
        
        # Delete user from auth.users via admin SDK
        try:
            supabase.auth.admin.delete_user(user_id)
        except Exception as auth_err:
            print(f"Warning: could not delete auth user {user_id}: {auth_err}")
            
        return {"success": True, "message": f"User {user_id} deleted permanently"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting user {user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/ai-history-all")
async def get_all_ai_history(
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        _verify_is_admin(request, db)
        history_res = supabase.table("ai_generation_history").select("*").order("created_at", desc=True).execute()
        items = history_res.data or []
        
        user_ids = list(set([item["user_id"] for item in items if item.get("user_id")]))
        profiles_map = {}
        if user_ids:
            profiles_res = supabase.table("profiles").select("id, full_name, email, avatar_url, designation").in_("id", user_ids).execute()
            for p in (profiles_res.data or []):
                profiles_map[p["id"]] = p
                
        for item in items:
            uid = item.get("user_id")
            item["user_profile"] = profiles_map.get(uid, {"email": "Anonymous/Unknown"})
            
        return items
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching all AI history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

