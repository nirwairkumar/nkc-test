import os
import json
import google.generativeai as genai
from typing import List
from dotenv import load_dotenv
from .schemas import LayoutBlock, AIReasoningOutput, QuestionReasoning

# Load env variables from parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

class AIBrain:
    def __init__(self):
        api_key = os.getenv("VITE_GEMINI_API_KEY")
        if not api_key or api_key == "YOUR_KEY_HERE":
             print("Warning: Gemini API Key not found or invalid in .env")
        
        genai.configure(api_key=api_key)
        
        # Use a model capable of handling large context and reasoning
        # Switching to latest preview model for advanced reasoning
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    def log(self, message: str):
        with open("debug.log", "a", encoding="utf-8") as f:
            f.write(message + "\n")

    def reason(self, blocks: List[LayoutBlock]) -> AIReasoningOutput:
        """
        Sends layout blocks to Gemini to reason about structure.
        """
        self.log(f"--- New Request ---")
        
        prompt_path = os.path.join(os.path.dirname(__file__), "prompts", "question_reasoning.txt")
        with open(prompt_path, "r") as f:
            system_prompt = f.read()

        layout_representation = []
        for block in blocks:
            entry = {
                "id": block.id,
                "type": block.type,
                "bbox": [round(x, 1) for x in block.bbox],
                "page": block.page
            }
            if block.type == "text":
                entry["content"] = block.content
            layout_representation.append(entry)
        
        self.log(f"Sending {len(layout_representation)} blocks to AI...")
        
        full_prompt = f"""
        {system_prompt}

        LAYOUT DATA:
        {json.dumps(layout_representation, indent=2)}
        """

        try:
            # Disable safety settings to prevent blocking exam content
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]

            response = self.model.generate_content(full_prompt, safety_settings=safety_settings)
            
            # Parse JSON response manually
            json_text = response.text.strip()
            self.log(f"DEBUG - Raw AI Response: {json_text}")
            
            # Remove Markdown code blocks if present
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            if json_text.startswith("```"):
                json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
                
            json_text = json_text.strip()
            
            data = json.loads(json_text)
            
            # Validate against schema (list of questions)
            # The prompt output is a list, but our schema expects an object validatable as AIReasoningOutput
            # We wrap it
            return AIReasoningOutput(questions=[QuestionReasoning(**q) for q in data])

        except Exception as e:
            print(f"AI Reasoning Error: {e}")
            import traceback
            traceback.print_exc()
            # Return empty or handling depending on robustness needs
            return AIReasoningOutput(questions=[])
