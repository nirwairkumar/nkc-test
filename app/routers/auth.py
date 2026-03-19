from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.encoders import jsonable_encoder
from app.core.database import supabase, get_db
from supabase import Client
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any

security = HTTPBearer()

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

class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/login")
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

@router.post("/register")
async def register(payload: RegisterRequest):
    try:
        options = {"data": payload.metadata} if payload.metadata else None
        response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password,
            "options": options
        })
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

@router.post("/password-reset")
async def password_reset(payload: PasswordResetRequest, request: Request):
    try:
        host = request.headers.get("origin") or "https://testoza.com"
        response = supabase.auth.reset_password_for_email(
            payload.email,
            {"redirect_to": f"{host}/update-password"}
        )
        return {"data": response, "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/password-update")
async def password_update(payload: PasswordUpdateRequest, db: Client = Depends(get_db)):
    try:
        response = db.auth.update_user({"password": payload.password})
        if hasattr(response, "user"):
            return {
                "data": {
                    "user": response.user
                },
                "error": None
            }
        return {"data": response, "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@router.post("/update-user")
async def update_user(payload: Dict[str, Any], db: Client = Depends(get_db)):
    try:
        response = db.auth.update_user(payload)
        if hasattr(response, "user"):
            return {
                "data": {
                    "user": response.user
                },
                "error": None
            }
        return {"data": response, "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/google")
async def get_google_login_url(request: Request):
    try:
        host = request.headers.get("origin") or "https://testoza.com"
        response = supabase.auth.sign_in_with_oauth({
            "provider": "google",
            "options": {
                "redirect_to": f"{host}/auth/callback"
            }
        })
        return {"data": response, "error": None}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
