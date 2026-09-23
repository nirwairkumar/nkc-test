from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from supabase import Client
from app.core.database import get_db
from pydantic import BaseModel

# this is a test of branch change. I am editing in gcp-migration.

import logging
import os
import uuid as _uuid

from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging_config import configure_logging, request_id_ctx

# M3/M4: install redacting, request-correlated logging before anything else runs.
configure_logging()
logger = logging.getLogger("app")

# Disable API docs in production to prevent information disclosure
_is_dev = os.getenv("ENVIRONMENT", "production").lower() in ("development", "dev", "local")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url="/api/openapi.json" if _is_dev else None,
    docs_url="/api/docs" if _is_dev else None,
    redoc_url="/api/redoc" if _is_dev else None,
)

# GZip compression for all responses > 1KB (cuts test JSON payload by ~70%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.get("/")
def read_root():
    return {"message": "TestoZa Backend is running on Google Cloud Run!"}

# CORS Middleware — explicit origins only, NO wildcard.
# Shared with the password-reset redirect allow-list so the two cannot drift apart.
from app.core.config import ALLOWED_ORIGINS as origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request


# ── M3: request correlation + safe error responses ───────────────────────────
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    """
    Give every request an id, echo it back, and put it on every log record.

    When a user reports "it failed", the id in their error response is enough to
    find the real exception in the logs — which is what lets the response itself
    stay generic.
    """
    incoming = request.headers.get("x-request-id") or request.headers.get("cf-ray")
    rid = (incoming or _uuid.uuid4().hex)[:64]
    token = request_id_ctx.set(rid)
    try:
        response = await call_next(request)
    finally:
        request_id_ctx.reset(token)
    response.headers["X-Request-ID"] = rid
    return response


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    M3: 4xx messages are written for users and pass through unchanged.

    5xx details are NOT — dozens of handlers raise `detail=str(e)`, which hands the
    client raw database/library internals. Those are logged in full and replaced with
    a generic message plus the request id.
    """
    rid = request_id_ctx.get()
    if exc.status_code >= 500:
        logger.error(
            "unhandled server error %s %s -> %s: %s",
            request.method, request.url.path, exc.status_code, exc.detail,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": "Something went wrong. Please try again.", "request_id": rid},
            headers=getattr(exc, "headers", None) or {},
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": rid},
        headers=getattr(exc, "headers", None) or {},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Validation errors echo the submitted body back by default; strip that."""
    rid = request_id_ctx.get()
    logger.info("validation error %s %s: %s", request.method, request.url.path, exc.errors())
    safe = [
        {"loc": e.get("loc"), "msg": e.get("msg"), "type": e.get("type")}
        for e in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": safe, "request_id": rid})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Last resort: never let a raw traceback or exception string reach the client."""
    rid = request_id_ctx.get()
    logger.exception("unhandled exception %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again.", "request_id": rid},
    )

@app.middleware("http")
async def add_security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    # ── Security Headers (all responses) ──────────────────────────
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    # M7: this API serves JSON, never an HTML document, so it needs no script/style
    # sources at all. The previous policy copied the frontend's (with 'unsafe-inline'
    # and 'unsafe-eval'), which bought nothing here and advertised a weak policy.
    # The document CSP that actually matters lives in the Cloudflare worker that
    # serves the SPA (infrastructure/cloudflare-worker/worker.js -> securityHeaders()).
    #
    # Swagger/ReDoc need inline scripts from a CDN, so they get a scoped exception;
    # docs are disabled in production anyway.
    if request.url.path in ("/docs", "/redoc") or request.url.path.startswith("/docs"):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "img-src 'self' data: https://fastapi.tiangolo.com; "
            "frame-ancestors 'none'; base-uri 'self'"
        )
    else:
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; "
            "frame-ancestors 'none'; "
            "base-uri 'none'; "
            "form-action 'none'"
        )
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Resource-Policy"] = "same-site"

    # Secure API endpoints by default against CDN/Edge caching
    # If the response already has a Cache-Control header, respect it
    if request.url.path.startswith("/api") and "Cache-Control" not in response.headers:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Client = Depends(get_db)):
    """
    Verifies the JWT token from Supabase Auth header.
    Authentication is handled by Supabase, but we verify the token's validity and identity here.
    """
    token = credentials.credentials
    try:
        user = db.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication credentials")
        return user.user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

from app.routers import auth, storage
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(storage.router, prefix="/api/storage", tags=["Storage"])

from app.routers import creators

app.include_router(creators.router, prefix="/api/creators", tags=["Creators"])

from app.routers import tests
app.include_router(tests.router, prefix="/api/tests", tags=["Tests"])

from app.routers import attempts
app.include_router(attempts.router, prefix="/api/attempts", tags=["Attempts"])

from app.routers import users
app.include_router(users.router, prefix="/api/users", tags=["Users"])

from app.routers import categories
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])

from app.routers import results
app.include_router(results.router, prefix="/api/results", tags=["Results"])

from app.routers import ai
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

from app.routers import classes
app.include_router(classes.router, prefix="/api/classes", tags=["Classes"])

from app.routers import materials
app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])

from app.routers import pricing
app.include_router(pricing.router, prefix="/api/pricing", tags=["Pricing"])

from app.routers import support
app.include_router(support.router, prefix="/api/support", tags=["Support"])

from app.routers import social
app.include_router(social.router, prefix="/api/social", tags=["Social"])

from app.routers import reports
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])

from app.routers import analytics
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


from app.routers import posts
app.include_router(posts.router, prefix="/api/posts", tags=["Posts"])

from app.routers import features
app.include_router(features.router, prefix="/api/features", tags=["Features"])


from app.routers import solutions
app.include_router(solutions.router, prefix="/api/tests", tags=["Solutions"])

from app.routers import combined_sessions
app.include_router(combined_sessions.router, prefix="/api/combined-sessions", tags=["Combined Sessions"])

from app.routers import email_broadcast
app.include_router(email_broadcast.router, prefix="/api/email-broadcast", tags=["Email Broadcast"])

from app.routers import sitemap
app.include_router(sitemap.router, prefix="/api", tags=["Sitemap"])
app.include_router(sitemap.router, prefix="", tags=["Sitemap"])

@app.get("/sitemap.xml", response_class=sitemap.XMLResponse, tags=["Sitemap"])
@app.get("/api/sitemap.xml", response_class=sitemap.XMLResponse, tags=["Sitemap"])
async def get_root_sitemap():
    return await sitemap.get_sitemap_index()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": settings.PROJECT_VERSION
    }

@app.get("/api/me")
def read_users_me(user = Depends(get_current_user)):
    return user
