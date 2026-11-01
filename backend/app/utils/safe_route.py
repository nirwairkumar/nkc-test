"""
A route class whose unexpected errors still reach the browser as a proper JSON error.

FastAPI's handler for unhandled exceptions runs OUTSIDE the CORS middleware, so a crash
in a route comes back without CORS headers. The browser then hides the response and the
frontend can only say "can't reach the server" — which sends people checking their
internet instead of the server log. Re-raising as HTTPException keeps the response inside
CORS (the client gets a normal 500 with a request id), and the real error is logged.
"""

import logging
from typing import Callable

from fastapi import HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.routing import APIRoute

logger = logging.getLogger("safe_route")


def _setup_hint(err: Exception) -> str:
    text = str(err).lower()
    if "permission denied" in text or "42501" in text:
        return (
            " — the backend is not using the service-role key (SUPABASE_SERVICE_KEY), or it was "
            "overridden by an environment variable in this terminal"
        )
    if "does not exist" in text or "42p01" in text or "pgrst205" in text:
        return " — the database table is missing: run the latest SQL migration"
    return ""


class SafeRoute(APIRoute):
    def get_route_handler(self) -> Callable:
        original = super().get_route_handler()

        async def handler(request: Request) -> Response:
            try:
                return await original(request)
            except (HTTPException, RequestValidationError):
                raise
            except Exception as err:
                logger.exception("%s %s failed%s", request.method, request.url.path, _setup_hint(err))
                raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")

        return handler
