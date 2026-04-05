import aiohttp
import json
import base64
from typing import Optional
from utils.logger import get_logger

logger = get_logger(__name__)

# Cloudinary credentials (unsigned upload preset)
CLOUD_NAME = "dma0h19mk"
UPLOAD_PRESET = "TestoZa_cloudinary"
UPLOAD_URL = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"

async def upload_image_to_cloudinary(image_bytes: bytes) -> Optional[str]:
    """
    Upload an image to Cloudinary using an unsigned upload.
    Returns the secure URL on success, or None on failure.
    """
    try:
        # We need aiohttp to make the async request
        # Instead of saving to a file, we send the base64 string
        # with the correct data URI prefix that Cloudinary expects
        b64_data = base64.b64encode(image_bytes).decode('utf-8')
        # Infer type (basic heuristic for PNG vs JPEG)
        mime_type = "image/png"
        if image_bytes.startswith(b'\xff\xd8'):
            mime_type = "image/jpeg"
        elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:16]:
            mime_type = "image/webp"
            
        data_uri = f"data:{mime_type};base64,{b64_data}"
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "file": data_uri,
                "upload_preset": UPLOAD_PRESET
            }
            
            async with session.post(UPLOAD_URL, data=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    secure_url = result.get("secure_url")
                    logger.info(f"Successfully uploaded image to Cloudinary: {secure_url}")
                    return secure_url
                else:
                    error_text = await response.text()
                    logger.error(f"Cloudinary upload failed with status {response.status}: {error_text}")
                    return None
                    
    except Exception as e:
        logger.error(f"Error uploading image to Cloudinary: {e}")
        return None
