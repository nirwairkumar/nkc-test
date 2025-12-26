from typing import List, Dict, Any
from .answer_key_extractor import AnswerKeyExtractor
from .answer_enricher import AnswerEnricher

class AnswerResolutionPipeline:
    def __init__(self):
        self.extractor = AnswerKeyExtractor()
        self.enricher = AnswerEnricher()

    def resolve_answers(self, questions: List[Dict[str, Any]], raw_elements: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Main entry point for Answer Resolution.
        1. Extract answers from raw text elements (before they were grouped).
        2. Enrich the structured questions.
        3. Determine final status.
        """
        print("Answer Resolution Pipeline: Started.")
        
        # 1. Extract Keys
        answer_map = self.extractor.extract_keys(raw_elements)
        
        # 2. Enrich (In-Place)
        # We pass questions by reference
        result = self.enricher.enrich_questions(questions, answer_map)
        
        return result
