from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.services.investment_request_service import InvestmentRequestService
from src.api.deps import RequirePermission

router = APIRouter()

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
