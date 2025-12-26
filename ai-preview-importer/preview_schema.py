from pydantic import BaseModel
from typing import List, Dict, Optional, Any

class ProcessedBlock(BaseModel):
    """Intermediate block after grouping."""
    type: str # "question", "option"
    id: str   # Unique ID (e.g., "Q1", "Q1-A")
    text: str
    bbox: List[float] # [x0, y0, x1, y1]
    page: int
    image_data: Optional[str] = None # Base64 if assigned

class PreviewQuestion(BaseModel):
    """Final Output Object."""
    id: int
    question: str
    image: Optional[str] = None
    options: Dict[str, str]
    optionImages: Dict[str, str]
    needsReview: bool = True

class PreviewResponse(BaseModel):
    status: str
    preview: List[PreviewQuestion]
    canConfirm: bool = False
    unansweredCount: int = 0
