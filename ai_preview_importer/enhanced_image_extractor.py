"""
Enhanced Image Extractor - Properly extracts and associates images with questions/options
"""
import fitz
import base64
import io
from PIL import Image
from typing import List, Dict, Tuple, Optional
from utils.logger import get_logger
import numpy as np

logger = get_logger(__name__)


def extract_and_match_images(pdf_bytes: bytes, questions: List[Dict]) -> List[Dict]:
    """
    Extract all images from PDF and match them to specific questions and options.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_images = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Get all images on page
        image_list = page.get_images(full=True)
        
        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]
                
                # Get position
                rects = page.get_image_rects(xref)
                if not rects:
                    continue
                
                bbox = (rects[0].x0, rects[0].y0, rects[0].x1, rects[0].y1)
                
                # Convert to base64
                base64_str = base64.b64encode(image_bytes).decode('utf-8')
                
                all_images.append({
                    'page': page_num + 1,
                    'bbox': bbox,
                    'width': base_image["width"],
                    'height': base_image["height"],
                    'data': base64_str,
                    'ext': ext,
                    'base64_uri': f"data:image/{ext};base64,{base64_str}",
                    'id': f"img_{page_num + 1}_{img_idx}"
                })
            except Exception as e:
                logger.warning(f"Failed to extract image {img_idx} from page {page_num + 1}: {e}")
    
    doc.close()
    
    # Match images to questions
    if questions and all_images:
        questions = match_images_to_questions(questions, all_images)
    
    return questions


def match_images_to_questions(questions: List[Dict], images: List[Dict]) -> List[Dict]:
    """
    Match images to questions based on spatial proximity and content analysis.
    """
    for question in questions:
        q_page = question.get('page', question.get('metadata', {}).get('page', 1))
        q_bbox = question.get('bbox')
        
        if not q_bbox:
            # Try to estimate bbox from page layout
            continue
        
        # Find images on same page
        page_images = [img for img in images if img['page'] == q_page]
        
        # Find images within question area
        question_images = []
        option_images = {}
        
        for img in page_images:
            img_bbox = img['bbox']
            
            # Check spatial relationship
            relationship = get_spatial_relationship(q_bbox, img_bbox)
            
            if relationship == 'inside':
                # Image is inside question area
                question_images.append(img)
            elif relationship == 'near':
                # Check if it's near options
                options = question.get('options', {})
                for opt_key, opt_bbox in question.get('option_bboxes', {}).items():
                    if is_near(opt_bbox, img_bbox):
                        option_images[opt_key] = img['base64_uri']
                        break
                else:
                    # Near question but not in options
                    question_images.append(img)
        
        # Assign best image to question
        if question_images:
            # Use largest image for question
            best_img = max(question_images, key=lambda x: x['width'] * x['height'])
            question['image'] = best_img['base64_uri']
            question['diagramPage'] = q_page
        
        # Assign images to options
        if option_images:
            question['optionImages'] = option_images
    
    return questions


def get_spatial_relationship(container_bbox: Tuple, item_bbox: Tuple) -> str:
    """
    Determine spatial relationship between two bounding boxes.
    Returns: 'inside', 'near', 'far'
    """
    # Check if item is inside container
    if (container_bbox[0] <= item_bbox[0] and 
        container_bbox[1] <= item_bbox[1] and
        container_bbox[2] >= item_bbox[2] and 
        container_bbox[3] >= item_bbox[3]):
        return 'inside'
    
    # Calculate distance
    c_center = ((container_bbox[0] + container_bbox[2]) / 2, 
                (container_bbox[1] + container_bbox[3]) / 2)
    i_center = ((item_bbox[0] + item_bbox[2]) / 2,
                (item_bbox[1] + item_bbox[3]) / 2)
    
    distance = np.sqrt((c_center[0] - i_center[0])**2 + (c_center[1] - i_center[1])**2)
    
    # Threshold for "near" (in points)
    if distance < 200:
        return 'near'
    
    return 'far'


def is_near(bbox1: Tuple, bbox2: Tuple, threshold: float = 100) -> bool:
    """Check if two bounding boxes are near each other."""
    c1 = ((bbox1[0] + bbox1[2]) / 2, (bbox1[1] + bbox1[3]) / 2)
    c2 = ((bbox2[0] + bbox2[2]) / 2, (bbox2[1] + bbox2[3]) / 2)
    
    distance = np.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
    return distance < threshold


def detect_question_boundaries(text_blocks: List[Dict], page_height: float) -> List[Dict]:
    """
    Detect question boundaries by analyzing text blocks and question patterns.
    """
    import re
    
    questions = []
    current_question = None
    
    for block in text_blocks:
        text = block.get('text', '').strip()
        if not text:
            continue
        
        # Check for question patterns
        # Pattern 1: "1." or "1)" or "Q1." or "Question 1"
        question_patterns = [
            r'^\s*(\d+)\s*[.)\]]\s*',  # 1. or 1) or 1]
            r'^\s*Q\s*(\d+)\s*[.:)]\s*',  # Q1. or Q1: or Q1)
            r'^\s*Question\s+(\d+)\s*[.:)]\s*',  # Question 1.
            r'^\s*#\s*(\d+)\s*[.)\]]\s*',  # #1. or #1)
        ]
        
        is_new_question = False
        question_num = None
        
        for pattern in question_patterns:
            match = re.match(pattern, text, re.IGNORECASE)
            if match:
                is_new_question = True
                question_num = int(match.group(1))
                break
        
        if is_new_question:
            # Save previous question
            if current_question:
                questions.append(current_question)
            
            # Start new question
            current_question = {
                'id': question_num,
                'page': block.get('page_num', 1),
                'bbox': list(block['bbox']),  # Make a copy
                'text_blocks': [block],
                'question_text': text
            }
        elif current_question:
            # Add to current question
            current_question['text_blocks'].append(block)
            
            # Update bounding box to include this block
            bbox = current_question['bbox']
            block_bbox = block['bbox']
            bbox[0] = min(bbox[0], block_bbox[0])
            bbox[1] = min(bbox[1], block_bbox[1])
            bbox[2] = max(bbox[2], block_bbox[2])
            bbox[3] = max(bbox[3], block_bbox[3])
    
    # Add last question
    if current_question:
        questions.append(current_question)
    
    return questions


def extract_question_regions(pdf_bytes: bytes) -> List[Dict]:
    """
    Extract text blocks and detect question regions with their bounding boxes.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_blocks = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Extract text blocks with positions
        blocks = page.get_text("blocks")
        
        for block in blocks:
            # block format: (x0, y0, x1, y1, text, block_no, block_type)
            block_dict = {
                'page_num': page_num + 1,
                'bbox': (block[0], block[1], block[2], block[3]),
                'text': block[4],
                'block_no': block[5],
                'block_type': block[6]
            }
            all_blocks.append(block_dict)
    
    doc.close()
    
    # Detect question boundaries
    questions = detect_question_boundaries(all_blocks, page.rect.height if doc else 800)
    
    return questions


def enhance_questions_with_spatial_data(questions: List[Dict], pdf_bytes: bytes) -> List[Dict]:
    """
    Add spatial data (bounding boxes, page numbers) to questions for better image matching.
    """
    # Extract question regions
    regions = extract_question_regions(pdf_bytes)
    
    # Match regions to questions by ID
    for question in questions:
        q_id = question.get('id')
        
        # Find matching region
        for region in regions:
            if region['id'] == q_id:
                question['bbox'] = region['bbox']
                question['page'] = region['page']
                question['text_blocks'] = region.get('text_blocks', [])
                break
    
    return questions
