import fitz
from typing import List, Tuple
from .schemas import LayoutBlock
from .image_manager import ImageManager

class PDFLayoutReader:
    def __init__(self, image_manager: ImageManager):
        self.image_manager = image_manager
        self.block_counter = 0

    def extract(self, file_bytes: bytes) -> List[LayoutBlock]:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        layout_elements = []
        
        print(f"PDF Opened. Pages: {len(doc)}")

        for page_num, page in enumerate(doc):
            # Get all blocks: text and image
            # "dict" format provides structured blocks
            blocks = page.get_text("dict")["blocks"]
            print(f"Page {page_num + 1}: Found {len(blocks)} blocks")

            for block in blocks:
                bbox = block["bbox"]
                
                if block["type"] == 0:  # Text
                    text_content = ""
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text_content += span["text"] + " "
                    text_content = text_content.strip()
                    
                    if text_content: # Ignore empty text
                        layout_elements.append(LayoutBlock(
                            id=self.block_counter,
                            type="text",
                            content=text_content,
                            bbox=bbox,
                            page=page_num
                        ))
                        self.block_counter += 1
                
                elif block["type"] == 1: # Image
                    # Store image in manager
                    # block['image'] contains bytes usually, but we extract safely
                    try:
                        # Extract image from rect for best quality/consistency
                        rect = fitz.Rect(bbox)
                        pix = page.get_pixmap(clip=rect)
                        
                        self.image_manager.store_image_from_pixmap(self.block_counter, pix)
                        
                        layout_elements.append(LayoutBlock(
                            id=self.block_counter,
                            type="image",
                            content=None,
                            bbox=bbox,
                            page=page_num
                        ))
                        self.block_counter += 1
                    except Exception as e:
                        print(f"Failed to extract image at {bbox}: {e}")

        # Sort by Page then Y position (already roughly sorted but ensuring)
        layout_elements.sort(key=lambda x: (x.page, x.bbox[1]))
        
        return layout_elements
