from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
import os
import aiofiles
from datetime import datetime

from src.core.database import get_db
from src.schemas.withdrawal import WithdrawalResponse, WithdrawalCreate, WithdrawalPaginatedResponse, WithdrawalRejectRequest, WithdrawalBulkProcessRequest
from src.services.withdrawal_service import WithdrawalService
from src.services.pdf_service import PDFService
from src.services.audit_trail_service import log_audit_trail
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User

router = APIRouter()

@router.get("/", response_model=WithdrawalPaginatedResponse)
async def get_withdrawals(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query(None),
    status: str = Query(None),
    tipo: str = Query(None),
    start_date: str = Query(None),
    end_date: str = Query(None),
    current_user: User = Depends(get_current_user)
):
    """
    Get all withdrawals with pagination, search and date/status/type filtering.
    """
    return await WithdrawalService.get_withdrawals(
        db=db, 
        page=page, 
        limit=limit, 
        search=search,
        status=status,
        tipo=tipo,
        start_date=start_date,
        end_date=end_date
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

@router.get("/{withdrawal_id}/receipt")
async def get_withdrawal_receipt(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate and stream a PDF receipt for the approved withdrawal on the fly.
    """
    withdrawal = await WithdrawalService.get_withdrawal(db, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retiro no encontrado")
    
    if withdrawal.estado not in ["aprobado", "procesado"]:
        raise HTTPException(status_code=400, detail="Solo los retiros aprobados o procesados tienen comprobante")

    # Generate the PDF in memory
    user_name = withdrawal.user.name if withdrawal.user else "Usuario"
    pdf_buffer = PDFService.generate_withdrawal_receipt_bytes(withdrawal, user_name)

    return StreamingResponse(
        pdf_buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"inline; filename=receipt_{withdrawal.id}.pdf"}
    )
@router.post("/{withdrawal_id}/approve", response_model=WithdrawalResponse, dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def approve_withdrawal(
    withdrawal_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
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
            
    withdrawal = await WithdrawalService.approve_withdrawal(db, withdrawal_id, current_user.id, file_path)
    
    # Registro inmutable en Audit Trail (H-65)
    await log_audit_trail(
        db=db,
        action="WITHDRAWAL_APPROVE",
        module="withdrawals",
        user=current_user,
        entity_type="Withdrawal",
        entity_id=withdrawal_id,
        description=f"Aprobación de retiro #{withdrawal_id} por valor neto de ${getattr(withdrawal, 'monto_neto', withdrawal.monto):,.2f}",
        details={"withdrawal_id": withdrawal_id, "monto_neto": float(getattr(withdrawal, 'monto_neto', withdrawal.monto)), "banco": withdrawal.banco},
        request=request
    )

    # Enviar email
    if withdrawal.user and withdrawal.user.email:
        from src.services.email_service import EmailService
        background_tasks.add_task(
            EmailService.send_withdrawal_approval_email,
            to_email=withdrawal.user.email,
            user_name=withdrawal.user.name,
            amount=withdrawal.monto_neto if hasattr(withdrawal, 'monto_neto') else withdrawal.monto,
            method=withdrawal.metodo_pago,
            bank=withdrawal.banco,
            account_number=withdrawal.numero_cuenta
        )
        
    return withdrawal

@router.post("/{withdrawal_id}/reject", response_model=WithdrawalResponse, dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def reject_withdrawal(
    withdrawal_id: int,
    req: WithdrawalRejectRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Reject a pending withdrawal and refund to wallet.
    """
    rejected = await WithdrawalService.reject_withdrawal(db, withdrawal_id, current_user.id, req.motivo_rechazo)

    # Registro inmutable en Audit Trail (H-65)
    await log_audit_trail(
        db=db,
        action="WITHDRAWAL_REJECT",
        module="withdrawals",
        user=current_user,
        entity_type="Withdrawal",
        entity_id=withdrawal_id,
        description=f"Rechazo de retiro #{withdrawal_id}. Motivo: {req.motivo_rechazo}",
        details={"withdrawal_id": withdrawal_id, "motivo_rechazo": req.motivo_rechazo},
        request=request
    )

    return rejected

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

@router.post("/sync-wallet-debits", response_model=Dict[str, Any], dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def sync_wallet_debits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Sincroniza retroactivamente todas las transacciones de débito de billetera creando registros de retiro en estado APROBADO.
    """
    return await WithdrawalService.sync_wallet_debits(db, current_user.id)

@router.post("/bulk-process", response_model=Dict[str, Any], dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def bulk_process_withdrawals(
    req: WithdrawalBulkProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca masivamente una lista de retiros como PROCESADOS.
    """
    return await WithdrawalService.bulk_process_withdrawals(
        db=db,
        withdrawal_ids=req.withdrawal_ids,
        admin_id=current_user.id
    )

@router.post("/bulk-approve", response_model=Dict[str, Any], dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def bulk_approve_withdrawals(
    req: WithdrawalBulkProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aprueba masivamente una lista de retiros (en estado procesado o pendiente).
    """
    return await WithdrawalService.bulk_approve_withdrawals(
        db=db,
        withdrawal_ids=req.withdrawal_ids,
        admin_id=current_user.id
    )

