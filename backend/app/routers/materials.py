from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Response, Request
from app.core.database import get_db
from app.utils.cache_headers import set_public_cache
from supabase import Client
from pydantic import BaseModel
from typing import Optional, List
import time
import random

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
        print(f"Error fetching materials: {e}")
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
        print(f"Error adding link material: {e}")
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
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
        file_name = f"{user_id}/{int(time.time())}_{random.randint(1000,9999)}.{file_ext}"
        file_content = await file.read()
        
        print(f"DEBUG: Attempting upload to 'materials' bucket as {user_id}")
        # Supabase Storage Upload
        res = db.storage.from_("materials").upload(file_name, file_content)
        print(f"DEBUG: Upload result: {res}")
        
        # 2. Get Public URL
        public_url_res = db.storage.from_("materials").get_public_url(file_name)
        public_url = public_url_res 
        print(f"DEBUG: Public URL: {public_url}")
        
        # 3. Insert into DB
        db_data = {
            "user_id": user_id,
            "title": title,
            "type": "file",
            "url": public_url,
            "file_path": file_name,
            "class_id": class_id if class_id != 'null' and class_id != '' else None
        }
        
        print(f"DEBUG: Inserting into DB: {db_data}")
        response = db.table("materials").insert(db_data).execute()
        
        # response.data is a list of inserted records
        if response.data and len(response.data) > 0:
            return response.data[0]
        return response.data
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"Error uploading material: {e}")
        print(traceback.format_exc())
        
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
        print(f"Error deleting material: {e}")
        raise HTTPException(status_code=500, detail=str(e))
