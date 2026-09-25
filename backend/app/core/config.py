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
    
    # Deployment environment. "production" unless explicitly set otherwise.
    ENVIRONMENT: str = "production"

    # L5: SECRET_KEY / ALGORITHM / ACCESS_TOKEN_EXPIRE_MINUTES used to live here with
    # the placeholder default "YOUR_SUPER_SECRET_KEY_HERE_CHANGE_IN_PROD". They were
    # never read by any code — this app does not mint its own JWTs; Supabase Auth
    # issues them and the backend only VERIFIES them (app/core/auth.py). Leaving an
    # insecure default lying around invites someone to wire it up later and inherit it,
    # so the dead fields are gone rather than given a better default. `extra = "ignore"`
    # means an existing SECRET_KEY in .env or Cloud Run is simply unused, not an error.

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() not in ("development", "dev", "local", "test")


settings = Settings()


def validate_runtime_config() -> None:
    """
    L5: fail fast on a misconfigured deployment instead of failing weirdly later.

    The backend talks to Supabase with the SERVICE-ROLE key (app/core/database.py).
    If SUPABASE_SERVICE_KEY is missing, the client silently falls back to the ANON
    key — and since the C2/C3 lockdown removed the permissive public policies, the
    backend would then be able to read almost nothing. Every endpoint would return
    empty results or 500s, and the cause would be invisible in the logs.

    Better to refuse to boot in production and say exactly what is wrong.
    In development the fallback is allowed, with a loud warning.
    """
    import logging

    logger = logging.getLogger(__name__)
    problems = []

    if not settings.SUPABASE_URL:
        problems.append("SUPABASE_URL is not set.")
    if not settings.SUPABASE_KEY:
        problems.append("SUPABASE_KEY (anon key) is not set.")
    if not settings.SUPABASE_SERVICE_KEY:
        problems.append(
            "SUPABASE_SERVICE_KEY is not set — the backend would fall back to the anon "
            "key and be unable to read its own data."
        )
    if settings.SUPABASE_SERVICE_KEY and settings.SUPABASE_SERVICE_KEY == settings.SUPABASE_KEY:
        problems.append(
            "SUPABASE_SERVICE_KEY is identical to SUPABASE_KEY — the anon key has been "
            "pasted into the service-key slot."
        )

    if not problems:
        return

    message = "Invalid configuration:\n  - " + "\n  - ".join(problems)
    if settings.is_production:
        raise RuntimeError(message)
    logger.warning("%s\n(continuing because ENVIRONMENT=%s)", message, settings.ENVIRONMENT)

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
    "https://pdf.testoza.com",
    "http://localhost:5173",  # Local dev (frontend)
    "http://localhost:8081",  # Local dev (frontend-admin)
    "http://localhost:8095",  # Local dev (pdf tools)
    "http://localhost:8096",  # Local preview (pdf tools)
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

