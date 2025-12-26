import re
from utils.logger import get_logger

logger = get_logger(__name__)

def group_blocks_into_questions(blocks):
    """
    Groups text blocks into question candidates based on deterministic patterns.
    Heuristic: Look for blocks starting with "Q." "1." etc.
    """
    questions = []
    current_question = None
    
    # Regex for question start: "1.", "1)", "Q1."
    question_pattern = re.compile(r'^(?:Q\.?|Question)?\s*\d+[\.\)]')
    
    for block in blocks:
        text = block['text']
        
        if question_pattern.match(text):
            # Start of a new question
            if current_question:
                questions.append(current_question)
            
            current_question = {
                "question_text": text,
                "options_text": [],
                "page_num": block['page_num'],
                "bbox": block['bbox']
            }
        else:
            # Continuation or options
            if current_question:
                # Naive check for options (A), (B), a), b) etc. or just append to text
                # For now, just append to current question text blobs to be parsed later
                # Or append to options_text if it looks like an option
                current_question["options_text"].append(text)
            else:
                # Content before first question? Ignore or log
                pass
                
    if current_question:
        questions.append(current_question)
        
    logger.info(f"Grouped blocks into {len(questions)} potential questions")
    return questions
