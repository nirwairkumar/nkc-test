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

async def analyze_page_refinement(structured_questions, images_metadata, page_num):
    """
    Sends pre-structured questions to Gemini Pro for Refinement (Math/Grammar).
    Input: List of dicts (id, raw_question_lines, options, image_id).
    Output: List of refined questions (SAME structure).
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
        # We pass the pre-structured questions directly
        # The prompt expects "PRE-STRUCTURED question object"
        
        input_data = {
            "page_number": page_num,
            "questions": structured_questions
        }

        user_content = f"""
        Refine the following questions:
        {json.dumps(input_data, indent=2)}
        """

        logger.info(f"Sending Page {page_num} (Refinement) to AI...")
        response = model.generate_content(user_content)
        
        try:
            raw_text = response.text
        except Exception:
            logger.warning(f"AI blocked response for Page {page_num}. Safety reasons likely.")
            return []

        # Clean Markdown wrappers if present
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
            # Fallback attempts
            start = clean_text.find("{")
            end = clean_text.rfind("}")
            if start != -1 and end != -1:
                try:
                    result_json = json.loads(clean_text[start:end+1])
                except Exception as e:
                    logger.error(f"Fallback parse failed: {e}")
                    return []
            else:
                return []
        
        # Expecting {"questions": [...]} or just [...] depending on how model behaves, 
        # but prompt says "Return the SAME JSON structure". Input was {questions: [...]}.
        
        refined_questions = result_json.get("questions", [])
        if not refined_questions and isinstance(result_json, list):
             refined_questions = result_json

        logger.info(f"AI refined {len(refined_questions)} questions from Page {page_num}")
        
        return refined_questions

    except Exception as e:
        logger.error(f"AI Refinement failed for Page {page_num}: {e}")
        return []

    except Exception as e:
        logger.error(f"AI Analysis failed for Page {page_num}: {e}")
        # Return empty list or re-raise depending on strictness. 
        # For now, return empty to allow other pages to process.
        return []
