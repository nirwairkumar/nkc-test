from typing import List, Dict, Any

class AnswerEnricher:
    """
    Responsible for merging Answer Key data into EXISTING Question objects.
    CRITICAL: Does NOT create new objects. Mutates in-place.
    """
    def __init__(self):
        pass

    def enrich_questions(self, questions: List[Dict[str, Any]], answer_map: Dict[int, str]) -> Dict[str, Any]:
        """
        Enriches the list of questions with 'correctAnswer' and 'needsAnswer'.
        Returns metadata about the enrichment process.
        """
        enrichment_stats = {
            "total": len(questions),
            "matched": 0,
            "missing": 0
        }

        print(f"AnswerEnricher: Processing {len(questions)} questions against {len(answer_map)} answers.")

        for q in questions:
            # SAFETY CHECK: Ensure image fields exist (Regression Prevention)
            if "image" not in q: q["image"] = None
            if "optionImages" not in q: q["optionImages"] = {}

            q_id = q.get("id")
            
            # Match Logic
            if q_id in answer_map:
                q["correctAnswer"] = answer_map[q_id]
                q["needsAnswer"] = False # Validated
                enrichment_stats["matched"] += 1
            else:
                q["correctAnswer"] = None
                q["needsAnswer"] = True # Flag for UI
                enrichment_stats["missing"] += 1

        print(f"AnswerEnricher: Stats -> {enrichment_stats}")
        
        return {
            "questions": questions, # Same ref
            "canConfirm": enrichment_stats["missing"] == 0,
            "unansweredCount": enrichment_stats["missing"]
        }
