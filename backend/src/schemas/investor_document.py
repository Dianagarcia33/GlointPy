from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class InvestorDocumentBase(BaseModel):
    investor_id: int
    user_id: Optional[int] = None
    template_id: Optional[int] = None
    title: str
    document_type: Optional[str] = "contract"
    html_content: str
    background_image: Optional[str] = None

class InvestorDocumentCreate(InvestorDocumentBase):
    pass

class InvestorDocumentGenerateRequest(BaseModel):
    investor_id: int
    template_id: int
    custom_title: Optional[str] = None

class InvestorDocumentPreviewRequest(BaseModel):
    investor_id: int
    template_id: int

class InvestorDocumentResponse(InvestorDocumentBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
