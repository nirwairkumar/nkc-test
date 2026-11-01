"""
Pictures in a test live in Storage, not inside the test row.

The builder reads a pasted or uploaded picture as a base64 data URL, and tests were saved
with it inline. On 2026-10-25 base64 made up 38 of the 47 MB of question data; the largest
test was a 6.4 MB download for every candidate, and section-mode tests carry each picture
twice (`questions` and `sections`).

On save, each inline picture is uploaded once to the public `test-images` bucket, named by
the SHA-256 of its bytes, and replaced by its URL. Same picture, same name: the copy in
`sections`, every re-save and every clone point at one object, and nobody can guess a name
without already having the picture. Anything that can't be moved (SVG, unreadable base64,
a failed upload) stays inline exactly as it was, so a save never loses a picture.

scripts/move_inline_images.py runs the same conversion over tests saved before this.
"""

from __future__ import annotations

import base64
import binascii
import hashlib
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Dict, Iterable, Optional, Tuple

from cachetools import TTLCache

from app.core.config import settings
from app.utils.upload_validation import UploadRejected, validate_upload

logger = logging.getLogger(__name__)

BUCKET = "test-images"
FOLDER = "q"
IMAGE_FIELDS = ("questions", "sections", "institution_logo")

# The base64 must run to a delimiter (end, quote, bracket, space). Without the lookahead a
# data URL holding a character outside the alphabet would match only up to it, and the
# picture would be cut short.
DATA_URL_RE = re.compile(r"data:image/[A-Za-z0-9.+-]+;base64,([A-Za-z0-9+/]+={0,2})(?![A-Za-z0-9+/=_%-])")

# Objects known to be in the bucket, so the builder's autosaves don't upload them again.
_stored: TTLCache = TTLCache(maxsize=10000, ttl=24 * 3600)
_stored_lock = threading.Lock()


def public_url(path: str) -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{BUCKET}/{path}"


def _strings(value: Any) -> Iterable[str]:
    if isinstance(value, str):
        if "data:image/" in value:
            yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from _strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from _strings(item)


def find_images(values: Dict[str, Any], fields: Iterable[str] = IMAGE_FIELDS) -> Dict[str, str]:
    """{base64: full data URL} for every inline picture in the given fields."""
    found: Dict[str, str] = {}
    for field in fields:
        for text in _strings(values.get(field)):
            for match in DATA_URL_RE.finditer(text):
                found.setdefault(match.group(1), match.group(0))
    return found


def plan_image(b64: str) -> Optional[Tuple[str, bytes, str]]:
    """(object path, bytes, content type), or None when this picture stays inline."""
    try:
        data = base64.b64decode(b64, validate=True)
    except (binascii.Error, ValueError):
        return None
    try:
        # Decided from the bytes: SVG and anything that isn't a real image stay inline.
        content_type, ext = validate_upload(BUCKET, data)
    except UploadRejected:
        return None
    return f"{FOLDER}/{hashlib.sha256(data).hexdigest()}.{ext}", data, content_type


def store_image(db, path: str, data: bytes, content_type: str) -> bool:
    with _stored_lock:
        if path in _stored:
            return True
    try:
        db.storage.from_(BUCKET).upload(
            path=path,
            file=data,
            # The name is the content, so it never changes: cache it for a year.
            file_options={"content-type": content_type, "cache-control": "31536000", "upsert": "true"},
        )
    except Exception as e:
        logger.warning("question image upload failed for %s: %s", path, e)
        return False
    with _stored_lock:
        _stored[path] = True
    return True


def swap_in_urls(value: Any, urls: Dict[str, str]) -> Any:
    """A copy of value with each data URL whose base64 is in urls replaced by its URL."""
    if isinstance(value, str):
        if "data:image/" not in value:
            return value
        return DATA_URL_RE.sub(lambda m: urls.get(m.group(1), m.group(0)), value)
    if isinstance(value, dict):
        return {key: swap_in_urls(item, urls) for key, item in value.items()}
    if isinstance(value, list):
        return [swap_in_urls(item, urls) for item in value]
    return value


def externalize_images(db, values: Dict[str, Any], fields: Iterable[str] = IMAGE_FIELDS) -> Dict[str, str]:
    """
    Move the inline pictures in values[field] to Storage, in place. Returns
    {url: original data URL} for what moved. Never raises: on any problem the values
    keep their inline pictures and the save goes ahead.
    """
    fields = [f for f in fields if f in values]
    try:
        found = find_images(values, fields)
        plans = {b64: plan for b64, plan in ((b64, plan_image(b64)) for b64 in found) if plan}
        if not plans:
            return {}

        def upload(item):
            b64, (path, data, content_type) = item
            return b64, path, store_image(db, path, data, content_type)

        urls: Dict[str, str] = {}
        with ThreadPoolExecutor(max_workers=min(6, len(plans))) as pool:
            for b64, path, ok in pool.map(upload, plans.items()):
                if ok:
                    urls[b64] = public_url(path)
        if not urls:
            return {}

        converted = {field: swap_in_urls(values[field], urls) for field in fields}
        values.update(converted)
        return {url: found[b64] for b64, url in urls.items()}
    except Exception as e:
        logger.error("could not move question images to storage: %s", e)
        return {}
