import httpx
from supabase import Client
from supabase.client import ClientOptions
from supabase_auth import SyncGoTrueClient
from app.core.config import settings
from fastapi import Request

# Single global service-role client — created ONCE at startup and reused for all requests.
# Using the service key means we bypass RLS on the backend (data filtering is done in Python logic),
# which ensures public endpoints always return data regardless of the caller's auth state.
# User identity/permission checks are handled by get_current_user() in main.py which validates the JWT.
key_to_use = settings.SUPABASE_SERVICE_KEY if settings.SUPABASE_SERVICE_KEY else settings.SUPABASE_KEY

# Set higher timeout values (e.g. 60 seconds) to prevent read timeouts on auth/SMTP calls and long queries.
# Up to 100 request threads share this client (see lifespan in main.py), so the pool is
# wider than httpx's default of 100 connections / 20 kept alive.
_http = httpx.Client(
    timeout=60.0,
    limits=httpx.Limits(max_connections=200, max_keepalive_connections=50),
)

options = ClientOptions(
    httpx_client=_http,
    postgrest_client_timeout=60,
    storage_client_timeout=60,
    # The shared client never holds a user session, so it has nothing to refresh.
    auto_refresh_token=False,
    persist_session=False,
)


class _ServiceRoleClient(Client):
    """
    A supabase-py Client that stays on the service-role key for the life of the process.

    The stock Client rewrites its own Authorization header to the user's access token
    whenever its auth client signs someone in or refreshes a token. That is right in a
    browser and wrong on a server where every request shares one client: one call to
    /api/auth/login used to switch every later query in the process to that user under
    RLS. Analytics, guest-candidate creation and result saves then returned 403 until
    the server was redeployed. This hook is where the swap happens, so here it does
    nothing. Sign people in with auth_client(), never with this client.
    """

    def _listen_to_auth_events(self, event, session) -> None:
        return None


supabase: Client = _ServiceRoleClient.create(settings.SUPABASE_URL, key_to_use, options=options)


def auth_client() -> SyncGoTrueClient:
    """
    A fresh auth client for one request that creates a user session: login, sign-up,
    token refresh, OAuth code exchange. The session stays on this throwaway object,
    so the shared client above keeps its service-role key.
    """
    return SyncGoTrueClient(
        url=str(supabase.auth_url),
        headers=dict(supabase.options.headers),
        auto_refresh_token=False,
        persist_session=False,
        http_client=_http,
        flow_type=options.flow_type,
    )


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
