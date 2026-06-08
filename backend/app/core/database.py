import httpx
from supabase import create_client, Client
from supabase.client import ClientOptions
from app.core.config import settings
from fastapi import Request

# Single global service-role client — created ONCE at startup and reused for all requests.
# Using the service key means we bypass RLS on the backend (data filtering is done in Python logic),
# which ensures public endpoints always return data regardless of the caller's auth state.
# User identity/permission checks are handled by get_current_user() in main.py which validates the JWT.
key_to_use = settings.SUPABASE_SERVICE_KEY if settings.SUPABASE_SERVICE_KEY else settings.SUPABASE_KEY

# Set higher timeout values (e.g. 60 seconds) to prevent read timeouts on auth/SMTP calls and long queries.
options = ClientOptions(
    httpx_client=httpx.Client(timeout=60.0),
    postgrest_client_timeout=60,
    storage_client_timeout=60
)

supabase: Client = create_client(settings.SUPABASE_URL, key_to_use, options=options)


def get_db(request: Request = None) -> Client:
    """
    Returns the shared global Supabase client.

    Previously this created a NEW client per request when an Authorization header was present,
    which caused connection exhaustion and intermittent 500 errors.
    All endpoints now share the single global client — safe because:
      - Public reads (categories, tests, features) need no user context.
      - Authenticated writes use get_current_user() to validate the JWT first.
    """
    return supabase
