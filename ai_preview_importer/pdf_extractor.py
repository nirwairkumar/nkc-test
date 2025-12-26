import fitz
from utils.logger import get_logger

logger = get_logger(__name__)

def extract_text_blocks(pdf_bytes: bytes):
    """
    Extracts text blocks from PDF bytes using PyMuPDF (fitz).
    Returns a list of blocks with metadata (page_num, bbox, text).
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    logger.info(f"Opened PDF with {len(doc)} pages")
    
    extracted_blocks = []
    
    for page_num, page in enumerate(doc):
        blocks = page.get_text("blocks")
        for b in blocks:
            # b structure: (x0, y0, x1, y1, "text", block_no, block_type)
            # block_type=0 is text, =1 is image
            if b[6] == 0:  # Text block
                block_data = {
                    "page_num": page_num + 1,
                    "bbox": (b[0], b[1], b[2], b[3]),
                    "text": b[4].strip(),
                    "block_id": b[5]
                }
                extracted_blocks.append(block_data)
                
    logger.info(f"Extracted {len(extracted_blocks)} text blocks from PDF")
    return extracted_blocks
