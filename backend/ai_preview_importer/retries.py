"""
Retrying Gemini calls that failed for a reason a later try fixes.

Vertex AI answers 429 RESOURCE_EXHAUSTED when its shared capacity is full, on busy and quiet
days alike (13 of 92 "High accuracy" uploads hit it between 24 and 31 Oct 2026, and each hit
threw away every question on those pages), and 503 when a model is overloaded. Google's
advice: wait, a little longer each time and with some randomness, then try again.
"""
import asyncio
import random
from typing import Awaitable, Callable, TypeVar

import httpx
from google.genai import errors

from utils.logger import get_logger

logger = get_logger(__name__)

# Seconds to wait before the 2nd, 3rd, ... try (each scaled by 0.7-1.3 at random).
RETRY_DELAYS_S = (2, 5, 10, 20, 30)

T = TypeVar("T")


def is_retryable(error: BaseException) -> bool:
    """Busy, overloaded, timed out or dropped: worth another try. Bad requests are not."""
    if isinstance(error, (asyncio.TimeoutError, httpx.TransportError, errors.ServerError)):
        return True
    if isinstance(error, errors.APIError):
        return error.code in (408, 429)
    text = str(error)
    return "RESOURCE_EXHAUSTED" in text or "UNAVAILABLE" in text


async def wait_before_retry(attempt: int) -> None:
    """Sleep before try number attempt + 2 (attempt counts from 0)."""
    delay = RETRY_DELAYS_S[min(attempt, len(RETRY_DELAYS_S) - 1)]
    await asyncio.sleep(delay * random.uniform(0.7, 1.3))


async def with_retries(call: Callable[[], Awaitable[T]], label: str, attempts: int = len(RETRY_DELAYS_S) + 1) -> T:
    """Run `call`, retrying retryable errors up to `attempts` tries in all."""
    for attempt in range(attempts):
        try:
            return await call()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            if attempt == attempts - 1 or not is_retryable(e):
                raise
            logger.warning(f"{label}: try {attempt + 1} failed ({str(e)[:120]}), trying again")
            await wait_before_retry(attempt)
    raise RuntimeError("unreachable")
