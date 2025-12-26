from pydantic import BaseModel
from typing import List, Dict, Optional, Any

# Phase 1: Mechanical Output
class LayoutBlock(BaseModel):
    id: int
    type: str # "text" or "image"
    content: Optional[str] = None
    bbox: List[float] # [x0, y0, x1, y1]
    page: int

# Phase 2: AI Reasoning Output (Gemini)
class QuestionOptionReasoning(BaseModel):
    text: str
    imageIndexes: List[int]

class QuestionReasoning(BaseModel):
    question: str
    questionImageIndexes: List[int]
    options: Dict[str, QuestionOptionReasoning]
    
class AIReasoningOutput(BaseModel):
    questions: List[QuestionReasoning]

# Phase 3/4: Final Output (Client Compatible)
class QuestionFinal(BaseModel):
    id: int
    type: str = "single"
    question: str
    image: Optional[str] = None # Base64
    options: Dict[str, str]
    optionImages: Dict[str, str] # Key -> Base64
    correctAnswer: Optional[str] = None

class ParseResponse(BaseModel):
    questions: List[QuestionFinal]
