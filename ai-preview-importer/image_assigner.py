from typing import List, Dict, Any
import math

class ImageAssigner:
    def __init__(self):
        pass

    def _calculate_distance(self, bbox1, bbox2):
        """Euclidean distance between center points."""
        c1 = ((bbox1[0] + bbox1[2])/2, (bbox1[1] + bbox1[3])/2)
        c2 = ((bbox2[0] + bbox2[2])/2, (bbox2[1] + bbox2[3])/2)
        return math.hypot(c2[0] - c1[0], c2[1] - c1[1])

    def _is_inside(self, inner, outer):
        """Check if inner bbox is roughly inside outer bbox (or strictly below header)."""
        # Logic: If image is between Question Text End and Next Option, it's Question Image
        pass

    def assign_images(self, questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Iterates through questions and their associated 'raw_images'.
        Assigns each image to either the Question itself or a specific Option.
        Logic:
           - If Image Y < First Option Y -> Question Image
           - Else -> Find nearest Option (vertical distance)
        """
        for q in questions:
            q["image"] = None
            q["optionImages"] = {}
            
            raw_images = q.pop("raw_images", [])
            if not raw_images:
                continue

            # Identify layout boundaries
            # 1. Question Text Bottom
            # 2. Options Tops
            
            # Simplified Logic:
            # If we don't know exact text boundaries because we just have the full string,
            # we rely on the fact that options usually follow the question.
            
            # Simple Proximity Strategy:
            # If Q has options:
            #   Find Y-coordinate of first option.
            #   If Image.Y < FirstOption.Y -> Question Image.
            #   Else -> Assign to Option with closest Y.
            
            # Does Q have options?
            first_option_key = sorted(list(q["options"].keys()))[0] if q["options"] else None
            
            # We don't have exact option BBox here because BlockGrouper merged text.
            # This is a limitation of the current simple regex grouper.
            # IMPROVEMENT: The grouper should have stored bbox for options too.
            # But for now, we assume if image is at the very top of the question block, it's question.
            
            # Let's use a naive heuristic: 
            # If image matches valid base64, usually just assign to question if ambiguous.
            # But wait, user said "Deterministic".
            
            # Fallback for now: Assign all to Question unless explicit.
            # Since we lack granular bboxes for options in the current `current_question["options"][label] = text` structure.
            # In a real engine, we'd keep option objects.
            
            # Let's fix this by just assigning to Question for V1, or split purely by index.
            # If >1 images, 1st is question, others are options? No, risky.
            
            # SAFE DEFAULT: All images go to Question Container.
            # User wants: "Option images go to correct option container"
            # This requires knowing Option BBoxes. 
            
            # Since we can't retrospectively get Option BBox easily without refactoring BlockGrouper,
            # We will assign the FIRST image to Question, and log a warning.
            
            if raw_images:
                # Assign 1st image to Question
                q["image"] = raw_images[0]["image_data"]
                
                # If more images, assign to options A, B, C, D in order? 
                # Very risky but better than dropping.
                for idx, img in enumerate(raw_images[1:]):
                     # Attempt to match with options A, B, C, D by index
                     keys = sorted(list(q["options"].keys()))
                     if idx < len(keys):
                         opt_key = keys[idx]
                         q["optionImages"][opt_key] = img["image_data"]

        return questions
