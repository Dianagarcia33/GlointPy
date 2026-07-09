from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from src.core.database import get_db
from src.schemas.investor import InvestorCreate, InvestorUpdate, InvestorResponse
from src.services.investor_service import InvestorService
from src.api.deps import RequirePermission

router = APIRouter()

@router.get("/", response_model=List[InvestorResponse], dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def read_investors(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve all investors.
    """
    return await InvestorService.get_investors(db, skip=skip, limit=limit)

@router.get("/{investor_id}", response_model=InvestorResponse, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def read_investor(
    investor_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific investor by ID.
    """
    return await InvestorService.get_investor(db, investor_id=investor_id)

@router.post("/", response_model=InvestorResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def create_investor(
    investor: InvestorCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new investor.
    """
    return await InvestorService.create_investor(db, investor=investor)

@router.put("/{investor_id}", response_model=InvestorResponse, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def update_investor(
    investor_id: int,
    investor: InvestorUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing investor.
    """
    return await InvestorService.update_investor(db, investor_id=investor_id, investor=investor)

@router.delete("/{investor_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def delete_investor(
    investor_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an investor.
    """
    await InvestorService.delete_investor(db, investor_id=investor_id)

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def bulk_upload_investors(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and create multiple investors in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8.")
        
    result = await InvestorService.bulk_create_investors(db, csv_text)
    return result
