from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.services.investment_request_service import InvestmentRequestService
from src.api.deps import RequirePermission
from typing import Optional
from src.schemas.investment_request import InvestmentRequestPaginatedResponse
from fastapi import Query

router = APIRouter()

@router.get("/", response_model=InvestmentRequestPaginatedResponse, dependencies=[Depends(RequirePermission("admin.investments.manage"))])
async def read_investment_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all investment requests paginated.
    """
    return await InvestmentRequestService.get_investment_requests(db, page=page, limit=limit, search=search)

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.investments.manage"))])
async def bulk_upload_investment_requests(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and create multiple investment requests in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8.")
        
    result = await InvestmentRequestService.bulk_create_investment_requests(db, csv_text)
    return result

from src.api.deps import get_current_user
from pydantic import BaseModel

class ApproveRequestPayload(BaseModel):
    commercial_id: Optional[int] = None

class RejectRequestPayload(BaseModel):
    rejection_reason: str

@router.post("/{request_id}/approve", dependencies=[Depends(RequirePermission("admin.investments.manage"))])
async def approve_investment_request(
    request_id: int,
    payload: Optional[ApproveRequestPayload] = None,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve an investment request and automatically create the Investor.
    Optionally accepts commercial_id to adjudicate sale volume.
    """
    c_id = payload.commercial_id if payload else None
    return await InvestmentRequestService.approve_request(db, request_id, current_user.id, override_commercial_id=c_id)

@router.post("/{request_id}/reject", dependencies=[Depends(RequirePermission("admin.investments.manage"))])
async def reject_investment_request(
    request_id: int,
    payload: RejectRequestPayload,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reject an investment request.
    """
    return await InvestmentRequestService.reject_request(db, request_id, current_user.id, payload.rejection_reason)
