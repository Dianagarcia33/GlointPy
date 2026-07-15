from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
import os
import aiofiles
from datetime import datetime

from src.core.database import get_db
from src.schemas.withdrawal import WithdrawalResponse, WithdrawalCreate, WithdrawalPaginatedResponse, WithdrawalRejectRequest
from src.services.withdrawal_service import WithdrawalService
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User

router = APIRouter()

@router.get("/", response_model=WithdrawalPaginatedResponse)
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

@router.post("/{withdrawal_id}/approve", response_model=WithdrawalResponse, dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def approve_withdrawal(
    withdrawal_id: int,
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Approve a pending withdrawal. Optionally accepts a receipt file.
    """
    file_path = None
    if file:
        upload_dir = "uploads/receipts"
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"withdrawal_{withdrawal_id}_{datetime.now().timestamp()}_{file.filename}"
        file_path = os.path.join(upload_dir, filename)
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
            
    return await WithdrawalService.approve_withdrawal(db, withdrawal_id, current_user.id, file_path)

@router.post("/{withdrawal_id}/reject", response_model=WithdrawalResponse, dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def reject_withdrawal(
    withdrawal_id: int,
    req: WithdrawalRejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject a pending withdrawal and refund to wallet.
    """
    return await WithdrawalService.reject_withdrawal(db, withdrawal_id, current_user.id, req.motivo_rechazo)

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
