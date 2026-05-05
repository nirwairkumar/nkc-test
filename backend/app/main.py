from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
from supabase import Client
from app.core.database import get_db
from pydantic import BaseModel

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# GZip compression for all responses > 1KB (cuts test JSON payload by ~70%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS Middleware
origins = [
    "https://testoza.com",
    "https://www.testoza.com",
    "http://localhost:5173",# Local dev
    "http://localhost:8081", # Local dev
    "*" # Re-enable wildcard temporarily for transition if needed, but per plan specify origins
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
