import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "NKC Test Platform API"
    PROJECT_VERSION: str = "1.0.0"
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    FRONTEND_URL: str = "http://localhost:8081"
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str  # Anon Key
    SUPABASE_SERVICE_KEY: Optional[str] = None # Service Role Key for Admin Access
    
    
    # AI Config
    GEMINI_API_KEY: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "YOUR_SUPER_SECRET_KEY_HERE_CHANGE_IN_PROD"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

settings = Settings()

# Single source of truth for origins we will ever redirect a user to, or accept
# cross-origin requests from. Used by the CORS middleware (app/main.py) and by the
# password-reset redirect allow-list (app/routers/auth.py).
ALLOWED_ORIGINS = [
    "https://testoza.com",
    "https://www.testoza.com",
    "https://app.testoza.com",
    "https://admin.testoza.com",
    "https://blog.testoza.com",
    "https://news.testoza.com",
    "https://testing.testoza.com",
    "http://localhost:5173",  # Local dev
    "http://localhost:8081",  # Local dev
]


def safe_origin(candidate: Optional[str], default: str = "https://testoza.com") -> str:
    """
    Return `candidate` only if it is an origin we control, else `default`.

    The Origin header is set by the browser for real cross-origin requests, but a
    direct HTTP client can send anything. Password reset emails embed this value as
    the link target, so an unchecked Origin lets an attacker have Supabase mail a
    victim a recovery link pointing at attacker-controlled hosting — the token in
    that link is an account takeover.
    """
    if candidate and candidate.rstrip("/") in ALLOWED_ORIGINS:
        return candidate.rstrip("/")
    return default

