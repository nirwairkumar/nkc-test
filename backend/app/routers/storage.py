from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from app.core.database import get_db
from supabase import Client
from app.utils.upload_validation import validate_upload, UploadRejected
from app.utils.rate_limiter import enforce_limit, upload_per_user
import logging
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

def _verify_auth_token(request: Request, db: Client) -> str:
    """Verify JWT from Authorization header and return requesting user's ID."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format")
    token = auth_header.replace("Bearer ", "")
    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")

@router.post("/upload")
async def upload_file(
    bucket: str,
    request: Request,
    file: UploadFile = File(...),
    db: Client = Depends(get_db)
):
    # Verify auth
    user_id = _verify_auth_token(request, db)

    ALLOWED_BUCKETS = ["avatars", "materials", "post-images", "test-images"]
    if bucket not in ALLOWED_BUCKETS:
        raise HTTPException(status_code=400, detail="Forbidden bucket path")

    enforce_limit(upload_per_user, user_id, "Upload limit reached. Please try again later.")

    file_content = await file.read()

    # M8: decide the type from the BYTES. Previously the extension came from the client
    # filename and the Content-Type came from the client too, so a .html file (or any
    # bytes labelled text/html) could be stored in a public bucket and served as a live
    # document from the storage origin.
    try:
        content_type, file_ext = validate_upload(
            bucket, file_content, filename=file.filename, claimed_type=file.content_type
        )
    except UploadRejected as rejected:
        raise HTTPException(status_code=400, detail=str(rejected))

    file_path = f"{uuid.uuid4()}.{file_ext}"

    try:
        db.storage.from_(bucket).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": content_type},
        )

        # Get public URL
        url_res = db.storage.from_(bucket).get_public_url(file_path)

        return {"url": url_res, "path": file_path}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("storage upload failed for bucket=%s: %s", bucket, e)
        raise HTTPException(status_code=400, detail="Upload failed. Please try again.")
