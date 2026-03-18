from pydantic import BaseModel
from typing import List

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str

class TestCategoryAssignment(BaseModel):
    category_ids: List[str]
