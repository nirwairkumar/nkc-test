import fitz
from typing import List, Dict, Any
import io
import base64
from PIL import Image

class PDFExtractor:
    def __init__(self):
        pass

    def extract_elements(self, file_bytes: bytes) -> List[Dict[str, Any]]:
        """
        Extracts raw text and images with coordinates.
        Returns flattened list of {'type': 'text'|'image', 'bbox': [...], 'content': ...}
        """
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        elements = []

        print(f"Extractor: Opened PDF with {len(doc)} pages.")

        for page_num, page in enumerate(doc):
            # 1. Extract Text
            text_blocks = page.get_text("dict")["blocks"]
            for block in text_blocks:
                bbox = block["bbox"]
                
                if block["type"] == 0:  # Text
                    raw_text = ""
                    for line in block["lines"]:
                        for span in line["spans"]:
                            raw_text += span["text"] + " "
                    
                    cleaned_text = raw_text.strip()
                    if cleaned_text:
                        elements.append({
                            "type": "text",
                            "text": cleaned_text,
                            "bbox": bbox,
                            "page": page_num
                        })
                
                elif block["type"] == 1: # Image (Inline)
                    try:
                        # Extract exact image from bbox
                        rect = fitz.Rect(bbox)
                        pix = page.get_pixmap(clip=rect)
                        img_data = pix.tobytes("png")
                        
                        # Convert to base64 immediately for cleaner pipeline
                        img_b64 = f"data:image/png;base64,{base64.b64encode(img_data).decode('utf-8')}"
                        
                        elements.append({
                            "type": "image",
                            "image_data": img_b64,
                            "bbox": bbox,
                            "page": page_num
                        })
                    except Exception as e:
                        print(f"Image extraction failed at {bbox}: {e}")

        # Sort elements: Page ASC, Vertical Y ASC
        # This is critical for deterministic parsing
        elements.sort(key=lambda x: (x['page'], x['bbox'][1]))
        
        print(f"Extractor: Found {len(elements)} total elements.")
        if not elements:
            raise ValueError("No content extracted from PDF")

        return elements
