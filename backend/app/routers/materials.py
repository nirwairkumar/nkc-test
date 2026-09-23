from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, Request
from app.core.database import get_db
from app.utils.cache_headers import set_public_cache
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List
import time
import random
import logging
from app.utils.upload_validation import validate_upload, UploadRejected
from app.utils.rate_limiter import enforce_limit, upload_per_user
from app.core.auth import verify_auth_token, is_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()


class LinkMaterialCreate(BaseModel):
    user_id: str
    title: str
    url: str
    type: str = "link"
    thumbnail_url: Optional[str] = None
    class_id: Optional[str] = None

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
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

def _verify_owner_or_admin(user_id: str, request: Request, db: Client) -> str:
    requesting_user_id = _verify_auth_token(request, db)
    if requesting_user_id == user_id:
        return requesting_user_id
        
    # Check if admin
    profile_res = db.table("profiles").select("email").eq("id", requesting_user_id).execute()
    is_admin = False
    if profile_res.data:
        email = profile_res.data[0].get("email")
        if email:
            admin_res = db.table("admins").select("email").eq("email", email).execute()
            is_admin = bool(admin_res.data)
            
    if not is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return requesting_user_id

@router.get("/user/{user_id}")
async def get_user_materials(
    user_id: str,
    request: Request,
    fastapi_response: Response = None,
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(user_id, request, db)

        if fastapi_response:
            set_public_cache(fastapi_response, 60, 60)
        # Supabase syntax for joins in py: select("*, classes(name)")
        response = db.table("materials").select("*, classes(name)").eq("user_id", user_id).order("created_at", desc=True).execute()
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching materials: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/link")
async def add_link_material(
    payload: LinkMaterialCreate,
    request: Request,
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(payload.user_id, request, db)
        data = payload.dict(exclude_unset=True)
        response = db.table("materials").insert(data).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding link material: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file_material(
    request: Request,
    file: UploadFile = File(...),
    title: str = Form(...),
    user_id: str = Form(...),
    class_id: Optional[str] = Form(None),
    db: Client = Depends(get_db)
):
    try:
        _verify_owner_or_admin(user_id, request, db)
        
        # 1. Upload to Supabase Storage
        enforce_limit(upload_per_user, user_id, "Upload limit reached. Please try again later.")
        file_content = await file.read()

        # M8: type and extension come from the bytes, never from the client filename
        # or Content-Type — the materials bucket is public-read, so an .html upload
        # would be a live page served from the storage origin.
        try:
            content_type, file_ext = validate_upload(
                "materials", file_content, filename=file.filename, claimed_type=file.content_type
            )
        except UploadRejected as rejected:
            raise HTTPException(status_code=400, detail=str(rejected))

        file_name = f"{user_id}/{int(time.time())}_{random.randint(1000,9999)}.{file_ext}"

        # M4: no DEBUG print of upload paths / user ids into production logs.
        logger.info("materials upload: bucket=materials type=%s size=%d", content_type, len(file_content))
        db.storage.from_("materials").upload(
            file_name, file_content, file_options={"content-type": content_type}
        )

        # 2. Get Public URL
        public_url = db.storage.from_("materials").get_public_url(file_name)
        
        # 3. Insert into DB
        db_data = {
            "user_id": user_id,
            "title": title,
            "type": "file",
            "url": public_url,
            "file_path": file_name,
            "class_id": class_id if class_id != 'null' and class_id != '' else None
        }
        
        response = db.table("materials").insert(db_data).execute()
        
        # response.data is a list of inserted records
        if response.data and len(response.data) > 0:
            return response.data[0]
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        logger.error(f"Error uploading material: {e}")
        logger.debug(traceback.format_exc())
        
        # Raise generic 500 but include detail for debugging
        raise HTTPException(status_code=500, detail=f"Server Error: {str(e)}")

@router.delete("/{material_id}")
async def delete_material(
    material_id: str, 
    request: Request,
    file_path: Optional[str] = None, # Passed as query param if available
    db: Client = Depends(get_db)
):
    try:
        # Check ownership
        material_res = db.table("materials").select("user_id").eq("id", material_id).execute()
        if not material_res.data or len(material_res.data) == 0:
            raise HTTPException(status_code=404, detail="Material not found")
        owner_id = material_res.data[0]["user_id"]
        _verify_owner_or_admin(owner_id, request, db)

        # 1. Delete file if exists
        if file_path:
             db.storage.from_("materials").remove([file_path])
             
        # 2. Delete DB record
        db.table("materials").delete().eq("id", material_id).execute()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting material: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{material_id}/download")
async def get_material_download_url(
    material_id: str,
    request: Request,
    db: Client = Depends(get_db)
):
    """
    M9: issue a short-lived signed URL for a stored material instead of handing out a
    permanent public link.

    The `materials` bucket is public-read, and until C2 the `materials` table was
    world-readable too — so every creator's uploaded file was enumerable and
    permanently downloadable by anyone who had seen the URL once. A signed URL
    expires, and access is checked here before it is minted.

    Flipping the bucket itself to private is a Supabase dashboard change and is what
    finally closes direct-URL access; this endpoint is what the app should call once
    that happens, and it is safe to adopt beforehand.
    """
    requesting_user_id = verify_auth_token(request, db)

    res = db.table("materials").select("id, user_id, file_path, url, type").eq("id", material_id).limit(1).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Material not found")

    material = res.data[0]

    # Owner or admin only. Widen this when paid access is introduced.
    if material.get("user_id") != requesting_user_id and not is_admin_user(requesting_user_id, db):
        raise HTTPException(status_code=403, detail="You do not have access to this material")

    # External links are not ours to sign.
    if material.get("type") != "file" or not material.get("file_path"):
        return {"url": material.get("url"), "signed": False}

    try:
        signed = db.storage.from_("materials").create_signed_url(material["file_path"], 300)
        signed_url = signed.get("signedURL") or signed.get("signed_url") if isinstance(signed, dict) else None
        if signed_url:
            return {"url": signed_url, "signed": True, "expires_in": 300}
    except Exception as e:
        logger.error("could not sign material %s: %s", material_id, e)

    # Bucket is still public: fall back so downloads keep working either way.
    return {"url": material.get("url"), "signed": False}
