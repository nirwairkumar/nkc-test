from ai_preview_importer.pdf_extractor import extract_text_blocks
from ai_preview_importer.image_extractor import extract_images
from ai_preview_importer.block_grouper import group_blocks_into_questions
from ai_preview_importer.image_assigner import assign_images_to_questions
from ai_preview_importer.question_builder import build_preview_questions
from utils.logger import get_logger

logger = get_logger(__name__)

async def run_preview_pipeline(file_bytes: bytes):
    """
    Orchestrates the PDF processing pipeline:
    Extract Text -> Extract Images -> Group -> Map Images -> Build output
    """
    try:
        # 1. Extract Text
        blocks = extract_text_blocks(file_bytes)
        if not blocks:
            raise ValueError("No text blocks extracted from PDF")

        # 2. Extract Images
        images = extract_images(file_bytes)

        # 3. Group Text into Questions
        grouped_qs = group_blocks_into_questions(blocks)
        if not grouped_qs:
             # If strict heuristic fails, could fallback or error. 
             # Requirement says "If zero questions extracted -> HTTP 500"
             raise ValueError("No questions identified in the document")

        # 4. Map Images to Questions
        mapped_qs = assign_images_to_questions(grouped_qs, images)

        # 5. Build Final Output Format
        final_questions = build_preview_questions(mapped_qs)
        
        # 6. (Optional) Run Answer Resolution here if needed, or keeping it separate
        # For now, just return the preview result
        # Note: Answer Resolution is Phase 2, can be injected here or later.
        
        # Calculate stats for response
        unanswered_count = sum(1 for q in final_questions if q['needsAnswer'])
        can_confirm = unanswered_count == 0

        return {
            "questions": final_questions,
            "canConfirm": can_confirm,
            "unansweredCount": unanswered_count
        }

    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        raise e
