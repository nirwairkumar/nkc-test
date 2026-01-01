from ai_preview_importer.pdf_extractor import extract_text_blocks
from ai_preview_importer.image_extractor import extract_images
# from ai_preview_importer.ai_reasoner import analyze_page_with_ai

from ai_preview_importer.pdf_extractor import (
    detect_question_anchors,
    attach_images_to_questions,
    format_questions_for_ai
)
from ai_preview_importer.ai_reasoner import analyze_page_refinement



from utils.logger import get_logger
import asyncio

logger = get_logger(__name__)

async def run_preview_pipeline(file_bytes: bytes):
    """
    Orchestrates the PDF processing pipeline:
    Extract Content -> AI Semantic Analysis (Per Page) -> Aggregate -> Build Output
    """
    try:
        # 1. Extract Text & Images
        # We need to split extraction per page for the AI context
        # But our current extractors return flat lists. We'll group them here.
        
        all_blocks = extract_text_blocks(file_bytes)
        all_images = extract_images(file_bytes)
        
        if not all_blocks:
            raise ValueError("No text extracted from PDF")

        # Group by Page
        pages = {}
        for b in all_blocks:
            p = b['page_num']
            if p not in pages: pages[p] = {'blocks': [], 'images': []}
            pages[p]['blocks'].append(b)
            
        for img in all_images:
            p = img['page_num']
            if p not in pages: pages[p] = {'blocks': [], 'images': []}
            pages[p]['images'].append(img)

        final_questions = []
        global_id_counter = 1

        # 2. Process Each Page with AI
        # Iterate sequentially or in parallel? Parallel might hit rate limits, but let's try sequential for safety first.
        sorted_page_nums = sorted(pages.keys())
        
        for p_num in sorted_page_nums:
            page_data = pages[p_num]
            logger.info(f"Processing Page {p_num}...")
            
            # Call AI
            # ai_questions = await analyze_page_with_ai(
            #     page_data['blocks'], 
            #     page_data['images'], 
            #     p_num
            # )
            # 1. Detect questions deterministically
            questions = detect_question_anchors(page_data['blocks'])

            # 2. Attach images deterministically
            attach_images_to_questions(questions, page_data['images'])

            # 3. Convert to AI-ready format
            ai_ready_questions = format_questions_for_ai(questions)

            # 4. AI refinement (ONLY grammar + LaTeX)
            # refined_questions = await analyze_page_refinement(
            #     ai_ready_questions,
            #     page_data['images'],
            #     p_num
            # )
            refined_questions = ai_ready_questions

            
            # 3. Post-Process & Re-attach Images
            # The AI returns "image": "IMG_0". We need to find the actual base64 for IMG_0 on this page.
            # Local mapping for this page's images
            page_img_map = {f"IMG_{i}": img['base64'] for i, img in enumerate(page_data['images'])}
            
            for q in refined_questions:
                # Assign global ID
                q['id'] = global_id_counter
                global_id_counter += 1
                
                # Resolve Question Image
                if q.get('image') and q['image'] in page_img_map:
                    q['image'] = page_img_map[q['image']]
                else:
                    q['image'] = None
                    
                # Resolve Option Images
                if q.get('optionImages'):
                    for opt_key, img_id in q['optionImages'].items():
                        if img_id and img_id in page_img_map:
                            q['optionImages'][opt_key] = page_img_map[img_id]
                        else:
                            q['optionImages'][opt_key] = None
                else:
                     q['optionImages'] = {k: None for k in ["A","B","C","D"]}

                final_questions.append(q)

        # 4. Calculate Stats
        unanswered_count = sum(1 for q in final_questions if q.get('needsAnswer'))
        can_confirm = unanswered_count == 0

        logger.info(f"Pipeline Complete. Generated {len(final_questions)} questions.")

        return {
            "questions": final_questions,
            "canConfirm": can_confirm,
            "unansweredCount": unanswered_count
        }

    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        raise e
