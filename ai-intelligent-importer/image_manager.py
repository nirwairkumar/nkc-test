import fitz
from PIL import Image
import io
import base64
from typing import Dict

class ImageManager:
    def __init__(self):
        self._image_store: Dict[int, Image.Image] = {}

    def store_image(self, id: int, image_bytes: bytes):
        """Store raw image bytes from PDF."""
        img = Image.open(io.BytesIO(image_bytes))
        self._image_store[id] = img

    def store_image_from_pixmap(self, id: int, pix: fitz.Pixmap):
        """Store PyMuPDF pixmap."""
        img_data = pix.tobytes("png")
        img = Image.open(io.BytesIO(img_data))
        self._image_store[id] = img

    def get_base64(self, id: int) -> str:
        """Retrieve image by ID and convert to base64 string."""
        if id not in self._image_store:
            return ""
        
        img = self._image_store[id]
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
