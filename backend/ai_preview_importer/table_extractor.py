"""
Enhanced Table Extractor - Extracts tables from PDFs with structure preservation
"""
import fitz
import io
import base64
from PIL import Image
from typing import List, Dict, Tuple, Optional
from utils.logger import get_logger
import numpy as np

logger = get_logger(__name__)


def extract_tables_from_pdf(pdf_bytes: bytes) -> List[Dict]:
    """
    Extract all tables from PDF with their content and positions.
    Returns tables with cells, text content, and bounding boxes.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    all_tables = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        
        # Find tables using PyMuPDF's table finder
        tables = page.find_tables()
        
        if tables.tables:
            logger.info(f"Page {page_num + 1}: Found {len(tables.tables)} table(s)")
            
            for table_idx, table in enumerate(tables.tables):
                try:
                    # Extract table content
                    table_data = {
                        'page': page_num + 1,
                        'table_index': table_idx + 1,
                        'bbox': table.bbox,  # (x0, y0, x1, y1)
                        'rows': len(table.rows),
                        'cols': len(table.columns),
                        'cells': [],
                        'header': [],
                        'content': []
                    }
                    
                    # Extract cell content
                    for i, row in enumerate(table.extract()):
                        row_data = []
                        for j, cell_text in enumerate(row):
                            cell_info = {
                                'row': i,
                                'col': j,
                                'text': str(cell_text) if cell_text else '',
                                'bbox': table.cells[i][j] if i < len(table.cells) and j < len(table.cells[i]) else None
                            }
                            row_data.append(cell_info)
                        
                        if i == 0:
                            # Assume first row is header
                            table_data['header'] = row_data
                        else:
                            table_data['content'].append(row_data)
                        
                        table_data['cells'].extend(row_data)
                    
                    # Create table image
                    table_image = extract_table_image(page, table.bbox)
                    if table_image:
                        table_data['image'] = table_image
                    
                    all_tables.append(table_data)
                    logger.debug(f"Extracted table {table_idx + 1} with {table_data['rows']} rows, {table_data['cols']} cols")
                    
                except Exception as e:
                    logger.warning(f"Failed to extract table {table_idx + 1} from page {page_num + 1}: {e}")
        
        # Also try to detect tables that find_tables() might have missed
        # by looking for grid-like structures
        additional_tables = detect_tables_by_grid(page, page_num + 1)
        if additional_tables:
            all_tables.extend(additional_tables)
    
    doc.close()
    logger.info(f"Total tables extracted: {len(all_tables)}")
    return all_tables


def extract_table_image(page, bbox: Tuple[float, float, float, float]) -> Optional[str]:
    """
    Extract table as an image with high quality.
    Returns base64 encoded image.
    """
    try:
        # Expand bbox slightly to include borders
        padding = 5
        expanded_bbox = fitz.Rect(
            bbox[0] - padding,
            bbox[1] - padding,
            bbox[2] + padding,
            bbox[3] + padding
        )
        
        # Ensure within page bounds
        expanded_bbox = expanded_bbox & page.rect
        
        # Render at high resolution
        mat = fitz.Matrix(2, 2)  # 2x zoom for better quality
        pix = page.get_pixmap(clip=expanded_bbox, matrix=mat)
        
        img_bytes = pix.tobytes("png")
        base64_str = base64.b64encode(img_bytes).decode('utf-8')
        
        return f"data:image/png;base64,{base64_str}"
    except Exception as e:
        logger.warning(f"Failed to extract table image: {e}")
        return None


def detect_tables_by_grid(page, page_num: int) -> List[Dict]:
    """
    Fallback table detection by analyzing line structures.
    Catches tables that find_tables() might miss.
    """
    tables = []
    
    try:
        # Get drawings (lines, rectangles)
        drawings = page.get_drawings()
        
        # Look for horizontal and vertical lines that form grids
        h_lines = []
        v_lines = []
        
        for drawing in drawings:
            for item in drawing.get("items", []):
                if item[0] == "l":  # Line
                    p1, p2 = item[1], item[2]
                    # Check if horizontal or vertical
                    if abs(p1.y - p2.y) < 2:  # Horizontal line
                        h_lines.append((min(p1.x, p2.x), max(p1.x, p2.x), p1.y))
                    elif abs(p1.x - p2.x) < 2:  # Vertical line
                        v_lines.append((min(p1.y, p2.y), max(p1.y, p2.y), p1.x))
        
        # If we have multiple crossing lines, might be a table
        if len(h_lines) >= 3 and len(v_lines) >= 2:
            # Find bounding box of grid
            x_coords = [l[2] for l in v_lines]
            y_coords = [l[2] for l in h_lines]
            
            bbox = (
                min(x_coords),
                min(y_coords),
                max(x_coords),
                max(y_coords)
            )
            
            # Extract text in this region
            text = page.get_text("text", clip=bbox)
            
            if text.strip():  # Only if there's content
                table_data = {
                    'page': page_num,
                    'table_index': len(tables) + 1,
                    'bbox': bbox,
                    'rows': len(h_lines) - 1,
                    'cols': len(v_lines) - 1,
                    'cells': [],
                    'header': [],
                    'content': [],
                    'extracted_text': text,
                    'detection_method': 'grid_fallback'
                }
                
                # Try to structure the content
                lines = [l.strip() for l in text.split('\n') if l.strip()]
                if lines:
                    # Assume first line is header
                    table_data['header'] = [{'text': lines[0], 'row': 0, 'col': 0}]
                    # Rest is content
                    for i, line in enumerate(lines[1:], 1):
                        table_data['content'].append([{'text': line, 'row': i, 'col': 0}])
                
                # Get image
                table_image = extract_table_image(page, bbox)
                if table_image:
                    table_data['image'] = table_image
                
                tables.append(table_data)
                logger.info(f"Detected table by grid analysis on page {page_num}")
    
    except Exception as e:
        logger.debug(f"Grid table detection failed on page {page_num}: {e}")
    
    return tables


def match_tables_to_questions(tables: List[Dict], questions: List[Dict], embedded_images: List[Dict]) -> List[Dict]:
    """
    Match tables to their nearest questions and append as text inside question.
    This ensures tables are stored in the question text field (compatible with text-based storage).
    """
    for question in questions:
        q_page = question.get('page', 1)
        q_bbox = question.get('bbox')
        
        if not q_bbox:
            continue
        
        # Find tables on same page
        page_tables = [t for t in tables if t['page'] == q_page]
        
        best_table = None
        min_distance = float('inf')
        
        for table in page_tables:
            t_bbox = table['bbox']
            
            # Calculate distance between question and table
            distance = calculate_bbox_distance(q_bbox, t_bbox)
            
            # Check if table is referenced in question text
            q_text = question.get('question', '').lower()
            if any(keyword in q_text for keyword in ['table', 'chart', 'data', 'figure']):
                distance *= 0.5  # Boost score if question references table
            
            if distance < min_distance and distance < 300:  # Within reasonable distance
                min_distance = distance
                best_table = table
        
        if best_table:
            # Convert table to text and append to question
            table_text = format_table_as_text(best_table)
            question['question'] = question.get('question', '') + table_text
            logger.debug(f"Appended table to question {question.get('id')}")
    
    return questions


def calculate_bbox_distance(bbox1: Tuple, bbox2: Tuple) -> float:
    """Calculate minimum distance between two bounding boxes."""
    # Center points
    c1 = ((bbox1[0] + bbox1[2]) / 2, (bbox1[1] + bbox1[3]) / 2)
    c2 = ((bbox2[0] + bbox2[2]) / 2, (bbox2[1] + bbox2[3]) / 2)
    
    return np.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)


def format_table_as_text(table: Dict) -> str:
    """
    Format table as markdown-style text that can be embedded in question text.
    Uses KaTeX-compatible formatting.
    """
    lines = ["<br><br>📊 **Table Data:**<br>"]
    
    # Build markdown table
    if table.get('headers') and len(table['headers']) > 0:
        # Header row
        header_cells = []
        for cell in table['headers']:
            if isinstance(cell, dict):
                header_cells.append(cell.get('text', ''))
            else:
                header_cells.append(str(cell))
        lines.append('| ' + ' | '.join(header_cells) + ' |')
        
        # Separator
        lines.append('|' + '|'.join(['---' for _ in header_cells]) + '|')
    
    # Data rows
    for row in table.get('content', []):
        row_cells = []
        for cell in row:
            if isinstance(cell, dict):
                row_cells.append(cell.get('text', ''))
            else:
                row_cells.append(str(cell))
        lines.append('| ' + ' | '.join(row_cells) + ' |')
    
    if table.get('caption'):
        lines.append(f"<br>*{table['caption']}*")
    
    return '<br>'.join(lines)


def format_table_for_prompt(table: Dict) -> str:
    """
    Format table data for inclusion in AI prompt.
    """
    lines = []
    
    if table.get('headers'):
        header_row = ' | '.join([cell.get('text', '') for cell in table['headers']])
        lines.append(header_row)
        lines.append('-' * len(header_row))
    
    for row in table.get('content', []):
        row_text = ' | '.join([cell.get('text', '') for cell in row])
        lines.append(row_text)
    
    return '\n'.join(lines)
