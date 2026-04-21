from pydantic import BaseModel
from typing import Optional, Dict, Any

class SaveAttemptRequest(BaseModel):
    user_id: str
    test_id: str
    answers: Dict[str, Any]
    score: Optional[float] = 0
    metadata: Optional[Dict[str, Any]] = None

class RegisterRequest(BaseModel):
    user_id: Optional[str] = None
    test_id: str

class ProgressUpdateRequest(BaseModel):
    user_id: Optional[str] = None
    test_id: str
    completion_percentage: float  # 0-100
    answers: Optional[Dict[str, Any]] = None

class AbandonRequest(BaseModel):
    user_id: Optional[str] = None
    test_id: str
    reason: Optional[str] = 'tab_closed'
    completion_percentage: Optional[float] = None

class AnonStartRequest(BaseModel):
    session_token: str
    test_id: str

class AnonProgressRequest(BaseModel):
    session_token: str
    test_id: str
    completion_pct: float = 0.0

class AnonSubmitRequest(BaseModel):
    session_token: str
    test_id: str
    answers: Optional[Dict[str, Any]] = None
    score: Optional[float] = 0.0
    completion_pct: Optional[float] = 100.0

class AnonAbandonRequest(BaseModel):
    session_token: str
    test_id: str
    reason: Optional[str] = "tab_closed"
    completion_pct: Optional[float] = None
