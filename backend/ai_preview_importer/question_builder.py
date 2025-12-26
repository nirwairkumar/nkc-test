import re
from utils.logger import get_logger

logger = get_logger(__name__)

def build_preview_questions(grouped_questions):
    """
    Formats the internal grouped questions into the strict JSON output format.
    Splits options from text if possible.
    """
    output_questions = []
    
    for idx, gq in enumerate(grouped_questions):
        question_text = gq['question_text']
        raw_options = gq['options_text']
        
        # Attempt to parse options from the raw_options list
        # We expect options to maybe look like "A) Option A" or just lines of text
        options_dict = {"A": "", "B": "", "C": "", "D": ""}
        
        # Simple parser for options:
        # If we have 4 lines, assign to A, B, C, D
        # This is a naive implementation, can be improved with regex
        
        current_opt_idx = 0
        opt_keys = ["A", "B", "C", "D"]
        
        for line in raw_options:
            clean_line = line.strip()
            # Check for explicit start like "A)" or "(A)"
            match = re.match(r'^[\(]?([A-D])[\)\.]\s*(.*)', clean_line)
            if match:
                key = match.group(1)
                val = match.group(2)
                options_dict[key] = val
            else:
                # Fallback: fill next empty slot
                if current_opt_idx < 4:
                    options_dict[opt_keys[current_opt_idx]] = clean_line
                    current_opt_idx += 1
        
        q_obj = {
            "id": idx + 1,
            "question": question_text,
            "image": gq.get('assigned_image'),
            "options": options_dict,
            "optionImages": gq.get('option_images', {}),
            "correctAnswer": None,
            "needsAnswer": True 
        }
        output_questions.append(q_obj)
        
    logger.info(f"Built {len(output_questions)} formatted questions")
    return output_questions
