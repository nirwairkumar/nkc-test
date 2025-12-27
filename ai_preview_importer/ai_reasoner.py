import os
import json
import google.generativeai as genai
from utils.logger import get_logger
from ai_preview_importer.prompts import MASTER_PROMPT

logger = get_logger(__name__)

# Configure Gemini
api_key = os.environ.get("VITE_GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
if not api_key:
    logger.warning("VITE_GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=api_key)

generation_config = {
  "temperature": 0.1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "application/json",
}

async def analyze_page_with_ai(text_blocks, images_metadata, page_num):
    """
    Sends the page content to Gemini Pro for semantic analysis.
    """
    try:
        if not api_key:
             raise ValueError("API Key missing. Cannot run AI analysis.")

        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash", 
            generation_config=generation_config,
            system_instruction=MASTER_PROMPT
        )

        # Prepare Input Prompt
        # We replace actual base64 with a placeholder ID to save tokens and avoid complexity, 
        # as the model can infer relationship from BBox and Context if we pass that metadata.
        # Wait, the prompt says "Image Metadata". 
        
        # Format the input for the AI
        input_data = {
            "page_number": page_num,
            "text_blocks": [
                {"id": b["block_id"], "bbox": b["bbox"], "text": b["text"]} 
                for b in text_blocks
            ],
            "images": [
                {"id": f"IMG_{i}", "bbox": img["bbox"], "width": img["width"], "height": img["height"]} 
                for i, img in enumerate(images_metadata)
            ]
        }

        user_content = f"""
        Analyze the following page content:
        {json.dumps(input_data, indent=2)}
        """

        logger.info(f"Sending Page {page_num} to AI...")
        response = model.generate_content(user_content)
        
        try:
            raw_text = response.text
        except Exception:
            logger.warning(f"AI blocked response for Page {page_num}. Safety reasons likely.")
            return []

        # Clean Markdown wrappers if present (Common Gemini quirk, even with JSON mode)
        clean_text = raw_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        
        clean_text = clean_text.strip()

        # Parse Response
        try:
            result_json = json.loads(clean_text)
        except json.JSONDecodeError:
            logger.error(f"JSON Parse Error on Page {page_num}. Raw text start: {clean_text[:100]}")
            # Fallback: Try to find the first { and last }
            start = clean_text.find("{")
            end = clean_text.rfind("}")
            if start != -1 and end != -1:
                try:
                    result_json = json.loads(clean_text[start:end+1])
                except:
                    return []
            else:
                return []
        
        questions = result_json.get("questions", [])
        logger.info(f"AI extracted {len(questions)} questions from Page {page_num}")
        
        return questions

    except Exception as e:
        logger.error(f"AI Analysis failed for Page {page_num}: {e}")
        # Return empty list or re-raise depending on strictness. 
        # For now, return empty to allow other pages to process.
        return []
