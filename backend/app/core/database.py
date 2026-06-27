import httpx
from supabase import create_client, Client
from supabase.client import ClientOptions
from app.core.config import settings
from fastapi import Request

# Single global service-role client — created ONCE at startup and reused for all requests.
key_to_use = settings.SUPABASE_SERVICE_KEY if settings.SUPABASE_SERVICE_KEY else settings.SUPABASE_KEY

# Shared global httpx.Client to prevent connection pool leaks / exhaustion.
shared_httpx_client = httpx.Client(
    timeout=60.0,
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
)

options = ClientOptions(
    httpx_client=shared_httpx_client,
    postgrest_client_timeout=60,
    storage_client_timeout=60
)

supabase: Client = create_client(settings.SUPABASE_URL, key_to_use, options=options)


def get_db(request: Request = None) -> Client:
    """
    Returns the database client dependency.

    If an Authorization header is present in the request, we return a request-scoped
    client populated with the user's JWT. This allows Supabase to evaluate RLS policies
    correctly (e.g., auth.uid() = user_id).
    
    To avoid connection leaks and socket exhaustion, all clients share a single,
    global httpx.Client instance.
    """
    if request:
        auth_header = request.headers.get("Authorization")
        if auth_header:
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY, options=options)
            token = auth_header.replace("Bearer ", "")
            try:
                client.postgrest.auth(token)
            except Exception:
                pass
            return client

    return supabase

