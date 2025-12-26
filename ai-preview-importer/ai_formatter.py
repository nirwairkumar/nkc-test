import os
import json
import google.generativeai as genai
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

class AIFormatter:
    def __init__(self):
        api_key = os.getenv("VITE_GEMINI_API_KEY")
        if not api_key:
             print("Warning: Gemini API Key not found!")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    def log(self, msg):
        print(f"[AI Formatter] {msg}")

    def format_json(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes deterministically grouped questions and asks AI to just fix JSON structure/typos.
        Does NOT ask AI to find questions/options (that's already done).
        """
        self.log(f"Formatting {len(questions)} questions...")
        
        # Prepare lightweight context (strip heavy image data for prompt)
        context_data = []
        for q in questions:
            dummy_q = q.copy()
            if dummy_q.get("image"): dummy_q["image"] = "HAS_IMAGE_PLACEHOLDER"
            if dummy_q.get("optionImages"):
                dummy_q["optionImages"] = {k: "HAS_IMAGE" for k in dummy_q["optionImages"]}
            # Remove internal fields not needed for formatting
            dummy_q.pop("raw_images", None)
            dummy_q.pop("bbox", None)
            dummy_q.pop("page", None)
            context_data.append(dummy_q)

        prompt = f"""
        You are a JSON formatting engine.
        
        INPUT DATA:
        {json.dumps(context_data, indent=2)}

        TASK:
        1. Output valid JSON in the 'PreviewQuestion' format.
        2. Fix any OCR typos in text.
        3. Do NOT add or remove questions.
        4. Do NOT change structure (Questions are already grouped).
        5. Return a list of objects.

        TARGET FORMAT:
        [
          {{
            "id": 1,
            "question": "...",
            "options": {{ "A": "...", "B": "..." }},
             "needsReview": true
          }}
        ]
        
        Output valid JSON only.
        """

        try:
            # High temperature for typo fixing? No, Low for deterministic formatting.
            response = self.model.generate_content(prompt, generation_config={"temperature": 0.1})
            
            # Clean JSON
            json_text = response.text.replace("```json", "").replace("```", "").strip()
            formatted_data = json.loads(json_text)
            
            # Re-inject Images (AI doesn't handle Base64)
            final_questions = []
            for idx, fq in enumerate(formatted_data):
                if idx < len(questions):
                    original = questions[idx]
                    # Restore images from original
                    fq["image"] = original.get("image")
                    fq["optionImages"] = original.get("optionImages", {})
                    
                    # Ensure needsReview is set
                    fq["needsReview"] = True
                    final_questions.append(fq)
            
            return final_questions

        except Exception as e:
            self.log(f"AI Formatting Failed: {e}")
            # Fallback: Return raw deterministic data if AI fails
            return questions
