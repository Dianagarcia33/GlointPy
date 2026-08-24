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
    background_image: Optional[str] = None

class InvestorDocumentPreviewRequest(BaseModel):
    investor_id: int
    template_id: int
    background_image: Optional[str] = None

class InvestorDocumentBulkGenerateRequest(BaseModel):
    template_id: int
    target_type: str = "all"  # "all", "selected", "without_document"
    investor_ids: Optional[list[int]] = None
    custom_title: Optional[str] = None
    background_image: Optional[str] = None
    overwrite_existing: bool = False
    offset: int = 0
    batch_size: Optional[int] = 50

class InvestorDocumentBulkGenerateResponse(BaseModel):
    total_candidates: int
    generated_count: int
    skipped_count: int
    processed_in_batch: int = 0
    has_more: bool = False
    next_offset: int = 0
    errors: list[str] = []

class InvestorDocumentResponse(InvestorDocumentBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

