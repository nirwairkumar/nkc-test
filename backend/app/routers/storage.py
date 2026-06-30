from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from app.core.database import get_db
from supabase import Client
import uuid

router = APIRouter()

def _verify_auth_token(request: Request, db: Client):
    """Verify JWT from Authorization header, return user_id."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    token = auth_header.replace("Bearer ", "")
    try:
        user_response = db.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_response.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.post("/upload")
async def upload_file(
    bucket: str,
    request: Request,
    file: UploadFile = File(...),
    db: Client = Depends(get_db)
):
    # Ensure request is authenticated
    _verify_auth_token(request, db)

    # Restrict file uploads to recognized buckets only
    ALLOWED_BUCKETS = ["avatars", "materials", "post-images", "test-images"]
    if bucket not in ALLOWED_BUCKETS:
        raise HTTPException(status_code=400, detail="Forbidden bucket path")

    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        file_path = f"{uuid.uuid4()}.{file_ext}"
        
        # Use service role key client (global supabase) for storage uploads if needed
        # or use the user's client if RLS allows.
        # Given the proxy goal, we'll try to use the provided client.
        response = db.storage.from_(bucket).upload(
            path=file_path,
            file=file_content,
            file_options={"content-type": file.content_type}
        )
        
        # Get public URL
        url_res = db.storage.from_(bucket).get_public_url(file_path)
        
        return {"url": url_res, "path": file_path}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

