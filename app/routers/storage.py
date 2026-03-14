from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from app.core.database import get_db
from supabase import Client
import uuid

router = APIRouter()

@router.post("/upload")
async def upload_file(
    bucket: str,
    file: UploadFile = File(...),
    db: Client = Depends(get_db)
):
    try:
        file_content = await file.read()
        file_ext = file.filename.split(".")[-1]
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
