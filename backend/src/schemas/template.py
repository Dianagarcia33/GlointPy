from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TemplateBase(BaseModel):
    name: str
    type: str
    role_id: Optional[int] = None
    file_path: Optional[str] = None
    html_content: Optional[str] = None
    background_image: Optional[str] = None

class TemplateCreate(TemplateBase):
    pass

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    role_id: Optional[int] = None
    file_path: Optional[str] = None
    html_content: Optional[str] = None
    background_image: Optional[str] = None

class TemplateResponse(TemplateBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
