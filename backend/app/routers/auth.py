from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.encoders import jsonable_encoder
from app.core.database import supabase, get_db
from supabase import Client
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from app.core.config import settings, safe_origin

security = HTTPBearer()
import logging
from app.utils.rate_limiter import (
    check_login_rate_limit, check_register_rate_limit, check_password_reset_rate_limit,
    enforce_limit, password_update_per_user,
)

logger = logging.getLogger(__name__)

router = APIRouter()

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    metadata: Optional[Dict[str, Any]] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordUpdateRequest(BaseModel):
    password: str
    # M5: proof that the caller knows the CURRENT password. Required — a stolen access
    # token alone must not be enough to change it and lock the real owner out.
    # The forgot-password flow does not use this endpoint; it updates through the
    # Supabase recovery session from the browser (see frontend UpdatePassword.tsx).
    current_password: str

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/login", dependencies=[Depends(check_login_rate_limit)])
async def login(payload: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password({
            "email": payload.email,
            "password": payload.password
        })
        # Wrap in 'data' and add empty 'error' to match expected format
        if hasattr(response, "session") and response.session:
            # Explicitly encode to ensure Pydantic models match frontend expectations
            user_data = jsonable_encoder(response.user)
            session_data = jsonable_encoder(response.session)
            return {
                "data": {
                    "user": user_data,
                    "session": session_data
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except Exception as e:
        detail = str(e)
        if "Invalid login credentials" in detail:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=400, detail=detail)

@router.post("/register", dependencies=[Depends(check_register_rate_limit)])
async def register(payload: RegisterRequest):
    try:
        signup_data = {
            "email": payload.email,
            "password": payload.password
        }
        if payload.metadata:
            signup_data["options"] = {"data": payload.metadata}
        response = supabase.auth.sign_up(signup_data)
        # Wrap and handle potential AuthResponse object
        if hasattr(response, "user"):
            user_data = jsonable_encoder(response.user)
            session_data = jsonable_encoder(getattr(response, "session", None))
            return {
                "data": {
                    "user": user_data,
                    "session": session_data
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/logout")
async def logout():
    return {"status": "success", "message": "Logged out"}

@router.post("/refresh")
async def refresh_token(payload: RefreshRequest):
    try:
        response = supabase.auth.refresh_session(payload.refresh_token)
        if hasattr(response, "session") and response.session:
            session_data = jsonable_encoder(response.session)
            return {
                "data": {
                    "session": session_data
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except Exception as e:
        detail = str(e)
        raise HTTPException(status_code=401, detail=f"Refresh failed: {detail}")

@router.get("/me")
async def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db)
):
    try:
        token = credentials.credentials
        response = db.auth.get_user(token)
        if hasattr(response, "user") and response.user:
            return {
                "data": {
                    "user": jsonable_encoder(response.user)
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/password-reset", dependencies=[Depends(check_password_reset_rate_limit)])
async def password_reset(payload: PasswordResetRequest, request: Request):
    try:
        # The Origin header is attacker-controlled on a direct (non-browser) request,
        # and it becomes the target of the reset link we ask Supabase to email. Without
        # this allow-list, anyone could have a victim mailed a recovery link pointing at
        # their own host and capture the token from the URL fragment.
        host = safe_origin(request.headers.get("origin"))
        response = supabase.auth.reset_password_for_email(
            payload.email,
            {"redirect_to": f"{host}/update-password"}
        )
        return {"data": response, "error": None}
    except Exception as e:
        logger.error("password_reset failed: %s", e)
        # Do not reveal whether the address exists (account enumeration).
        return {"data": None, "error": None}

@router.post("/password-update")
async def password_update(payload: PasswordUpdateRequest, credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        # 1. Get user from token to verify authenticity
        token = credentials.credentials
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session or token")
            
        user_id = user_response.user.id
        user_email = user_response.user.email

        # M5: re-authenticate. Without this, anyone holding a valid access token
        # (e.g. lifted from localStorage via XSS) could change the password and lock
        # the owner out of their own account.
        enforce_limit(
            password_update_per_user, user_id,
            "Too many password change attempts. Please try again later.",
        )

        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Current password is required")
        if not user_email:
            raise HTTPException(status_code=400, detail="This account cannot change its password here")

        try:
            # A throwaway client so verifying the old password cannot disturb the
            # caller's live session on the shared service-role client.
            from supabase import create_client
            verifier = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            reauth = verifier.auth.sign_in_with_password(
                {"email": user_email, "password": payload.current_password}
            )
            reauth_ok = bool(reauth and reauth.user and reauth.user.id == user_id)
            try:
                verifier.auth.sign_out()
            except Exception:
                pass
        except HTTPException:
            raise
        except Exception:
            reauth_ok = False

        if not reauth_ok:
            raise HTTPException(status_code=403, detail="Current password is incorrect")

        # 2. Use global admin client (Service Key) to update the password
        response = supabase.auth.admin.update_user_by_id(
            user_id,
            attributes={"password": payload.password}
        )
        
        if hasattr(response, "user") and response.user:
            return {
                "data": {
                    "user": jsonable_encoder(response.user)
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("password_update failed: %s", e)
        raise HTTPException(status_code=400, detail="Could not update password")
@router.post("/update-user")
async def update_user(
    payload: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update user metadata (e.g. from onboarding form). Uses admin client for reliability."""
    try:
        # Get the user from their token to find their ID
        token = credentials.credentials
        user_response = supabase.auth.get_user(token)
        
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid session or token")
        
        user_id = user_response.user.id
        
        # Fetch current user metadata first to perform a safe merge
        try:
            curr_user = supabase.auth.admin.get_user_by_id(user_id)
            existing_metadata = {}
            if curr_user and curr_user.user and curr_user.user.user_metadata:
                existing_metadata = dict(curr_user.user.user_metadata)
            merged_metadata = {**existing_metadata, **payload}
        except Exception:
            merged_metadata = payload

        # Use admin client to update user metadata reliably
        # This works for all auth providers (email, Google, etc.)
        response = supabase.auth.admin.update_user_by_id(
            user_id,
            attributes={"user_metadata": merged_metadata}
        )
        
        if hasattr(response, "user") and response.user:
            return {
                "data": {
                    "user": jsonable_encoder(response.user)
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail="Failed to update user")

@router.get("/google")
async def get_google_login_url(request: Request):
    try:
        # Ensure we have a valid protocol and no trailing slash
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        if not frontend_url.startswith('http'):
            frontend_url = f"https://{frontend_url}"
            

        response = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": f"{frontend_url}/auth/callback"
            }
        })
        
        # If Supabase didn't provide a URL, something is wrong with the keys or dashboard config
        if not getattr(response, 'url', None):
            raise Exception("Supabase did not return a login URL. Check Redirect URLs in Dashboard.")
            
        return {"data": response, "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Google authentication failed")

@router.post("/callback")
async def exchange_code_for_session(payload: Dict[str, Any]):
    """Exchange a PKCE authorization code for a session (used by AuthCallback page)."""
    try:
        code = payload.get("code")
        if not code:
            raise HTTPException(status_code=400, detail="Missing authorization code")
        

        response = supabase.auth.exchange_code_for_session({"auth_code": code})
        
        if hasattr(response, "session") and response.session:
            session_data = jsonable_encoder(response.session)
            user_data = jsonable_encoder(response.user) if hasattr(response, "user") else None
            return {
                "data": {
                    "session": session_data,
                    "user": user_data
                },
                "error": None
            }
        return {"data": jsonable_encoder(response), "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Code exchange failed")

