from pydantic import BaseModel
from typing import List, Optional

class CategoryCreate(BaseModel):
    name: str

class CategoryUpdate(BaseModel):
    name: str

class TestCategoryAssignment(BaseModel):
    category_ids: List[str]

class SubCategoryCreate(BaseModel):
    name: str

class SubCategoryUpdate(BaseModel):
    name: str

class TestSubCategoryAssignment(BaseModel):
    sub_category_id: Optional[str] = None
