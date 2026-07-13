from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any

from src.core.database import get_db
from src.schemas.withdrawal import WithdrawalResponse, WithdrawalCreate
from src.services.withdrawal_service import WithdrawalService
from src.core.security import get_current_user
from src.models.user import User

router = APIRouter()

@router.get("/", response_model=Dict[str, Any])
async def get_withdrawals(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get all withdrawals with pagination and search.
    Requires admin privileges in a real scenario, but for now we let logged-in users view.
    """
    return await WithdrawalService.get_withdrawals(
        db=db, 
        page=page, 
        limit=limit, 
        search=search
    )

@router.get("/{withdrawal_id}", response_model=WithdrawalResponse)
async def get_withdrawal(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    withdrawal = await WithdrawalService.get_withdrawal(db, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    return withdrawal

@router.post("/bulk-upload", response_model=Dict[str, Any])
async def bulk_upload_withdrawals(
    withdrawals: List[WithdrawalCreate],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bulk upload withdrawals for data migration.
    """
    created = await WithdrawalService.bulk_create_withdrawals(db, withdrawals)
    return {
        "message": f"Successfully imported {len(created)} withdrawals.",
        "count": len(created)
    }
