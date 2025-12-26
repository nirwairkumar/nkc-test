import re
from typing import List, Dict, Any, Optional

class BlockGrouper:
    def __init__(self):
        # Patterns to identify Question Starts
        self.question_pattern = re.compile(r'^(?:Q[\.\s]?)?\d+[\.\)]', re.IGNORECASE)
        # Patterns to identify Option Starts (A), (B), A., B., 1., 2. (contextual)
        self.option_pattern = re.compile(r'^(?:\([A-Z]\)|[A-Z][\.\)])', re.IGNORECASE)

    def group_blocks(self, elements: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Groups raw elements into structured Question objects.
        Logic:
        1. Iterate elements.
        2. If pattern matches Question Start -> Create New Question container.
        3. If pattern matches Option Start -> Add to current Question.
        4. If Image -> Keep aside for Image Assigner (Phase 3).
        5. If Text doesn't match pattern -> Append to previous block (Question or Option).
        """
        grouped_questions = []
        current_question = None
        current_option = None # "A", "B", etc.

        for el in elements:
            if el["type"] == "image":
                # Just attach to current context for now (Image Assigner will fix this later)
                # But to preserve order, we can add it as a "raw_image" to the active container
                if current_question:
                    current_question["raw_images"].append(el)
                continue

            # It's Text
            text = el["text"]
            
            # Check for New Question
            if self.question_pattern.match(text):
                # Save previous question if exists
                if current_question:
                    grouped_questions.append(current_question)
                
                # Start new Question
                current_question = {
                    "id": len(grouped_questions) + 1,
                    "text": text,
                    "options": {},
                    "raw_images": [], # Images found while processing this question
                    "bbox": el["bbox"], # Start position
                    "page": el["page"]
                }
                current_option = None
                continue

            # Check for Option (Only if inside a question)
            option_match = self.option_pattern.match(text)
            if current_question and option_match:
                # Extract Option Label (A, B, C...)
                # Simple normalization: Take first letter
                label_raw = option_match.group(0).upper() # e.g. "A)"
                label = re.sub(r'[^A-Z]', '', label_raw) # "A"
                if not label: label = "X" # Fallback

                current_question["options"][label] = text
                current_option = label
                continue

            # Continuation Text
            if current_question:
                if current_option:
                    # Append to current option
                    current_question["options"][current_option] += " " + text
                else:
                    # Append to question text
                    current_question["text"] += " " + text
            else:
                # Text before any question (Header/Instructions) -> Ignore for now or collect
                pass

        # Append last question
        if current_question:
            grouped_questions.append(current_question)

        print(f"Grouper: Identified {len(grouped_questions)} questions.")
        if not grouped_questions:
             # Fallback: If no regex matches, maybe it's not formatted standardly?
             # We should probably throw because we promised "Fail Loudly"
             print("WARNING: No questions identified by Regex.")
             
        return grouped_questions
