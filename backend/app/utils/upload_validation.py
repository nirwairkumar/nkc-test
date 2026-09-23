"""
M8 (SECURITY_THREAT_MODEL_AND_PLAN.md) — server-side upload validation.

Uploads used to be accepted on the strength of the filename extension and the
client-supplied Content-Type, with no size limit. Because the storage buckets are
public-read, that meant anyone with an account could:

  * upload an .html/.svg file and get a live page on the storage origin
    (stored XSS, phishing pages hosted under your domain's trust),
  * set Content-Type: text/html on any bytes and have it served as a document,
  * upload unbounded data and run up storage/egress cost.

Everything here is decided from the BYTES, not from what the client claims.
"""

import re
from typing import Dict, Optional, Tuple

# ── Size ceilings per bucket (bytes) ─────────────────────────────────────────
MAX_SIZES: Dict[str, int] = {
    "avatars": 5 * 1024 * 1024,        # 5 MB
    "post-images": 10 * 1024 * 1024,   # 10 MB
    "test-images": 10 * 1024 * 1024,   # 10 MB
    "materials": 50 * 1024 * 1024,     # 50 MB (PDFs / study material)
    "ai-user-uploads": 50 * 1024 * 1024,
}
DEFAULT_MAX_SIZE = 10 * 1024 * 1024

# ── What each bucket is allowed to contain ───────────────────────────────────
IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"}
DOC_TYPES = {"application/pdf"}

BUCKET_ALLOWED: Dict[str, set] = {
    "avatars": IMAGE_TYPES,
    "post-images": IMAGE_TYPES,
    "test-images": IMAGE_TYPES,
    "materials": IMAGE_TYPES | DOC_TYPES,
    "ai-user-uploads": IMAGE_TYPES | DOC_TYPES,
}

# Canonical extension per detected type — the stored name is derived from the
# SNIFFED type, never from the name the client sent.
EXT_FOR_TYPE: Dict[str, str] = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
    "application/pdf": "pdf",
}


def sniff_content_type(data: bytes) -> Optional[str]:
    """
    Identify a file from its magic bytes. Returns None for anything unrecognised.

    Deliberately excludes SVG: it is an image to users but an executable document
    to browsers (<script> inside SVG runs on the storage origin).
    """
    if len(data) < 12:
        return None

    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data[:2] == b"BM":
        return "image/bmp"
    if data[:5] == b"%PDF-":
        return "application/pdf"
    return None


def _looks_like_markup(data: bytes) -> bool:
    """
    Catch HTML/SVG/XML smuggled in under an image name.

    A browser will sniff and render these if they are ever served without a
    correct Content-Type, so they are rejected outright.
    """
    head = data[:1024].lstrip().lower()
    return (
        head.startswith(b"<!doctype html")
        or head.startswith(b"<html")
        or head.startswith(b"<svg")
        or head.startswith(b"<?xml")
        or b"<script" in head
    )


def safe_filename(name: Optional[str], fallback_ext: str) -> str:
    """Strip directory components and anything non-trivial out of a filename."""
    if not name:
        return f"file.{fallback_ext}"
    base = re.split(r"[\\/]", name)[-1]
    base = re.sub(r"[^A-Za-z0-9._-]", "_", base)
    base = base.lstrip(".") or "file"
    return base[:120]


class UploadRejected(Exception):
    """Raised with a message safe to show the user."""


def validate_upload(
    bucket: str,
    data: bytes,
    filename: Optional[str] = None,
    claimed_type: Optional[str] = None,
) -> Tuple[str, str]:
    """
    Validate an upload and return (content_type, extension), both derived from the
    file's own bytes.

    Raises UploadRejected with a user-safe message.
    """
    max_size = MAX_SIZES.get(bucket, DEFAULT_MAX_SIZE)
    if not data:
        raise UploadRejected("The uploaded file is empty.")
    if len(data) > max_size:
        raise UploadRejected(
            f"File is too large. The limit for this upload is {max_size // (1024 * 1024)} MB."
        )

    if _looks_like_markup(data):
        raise UploadRejected("This file type is not allowed.")

    detected = sniff_content_type(data)
    if detected is None:
        raise UploadRejected("Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, BMP, PDF.")

    allowed = BUCKET_ALLOWED.get(bucket)
    if allowed is not None and detected not in allowed:
        pretty = ", ".join(sorted(t.split("/")[-1].upper() for t in allowed))
        raise UploadRejected(f"This upload only accepts: {pretty}.")

    return detected, EXT_FOR_TYPE[detected]
