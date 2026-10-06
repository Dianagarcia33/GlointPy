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

@router.get("/company-tax-wallet", dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def get_company_tax_wallet(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el balance y los últimos movimientos contables de la Billetera Corporativa (Caja de Impuestos 3.2%).
    """
    from src.services.company_wallet_service import CompanyWalletService
    return await CompanyWalletService.get_tax_wallet_summary(db)

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

@router.get("/{withdrawal_id}/yoint", dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def get_withdrawal_yoint_info(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el historial forense y payloads completos de dispersión de Yoint para un retiro.
    """
    from sqlalchemy.future import select
    from src.models.yoint_dispersion import YointDispersion

    q = select(YointDispersion).where(YointDispersion.withdrawal_id == withdrawal_id).order_by(YointDispersion.id.desc())
    res = await db.execute(q)
    dispersions = res.scalars().all()

    return [
        {
            "id": d.id,
            "order_id": d.order_id,
            "idempotency_key": d.idempotency_key,
            "payment_reference": d.payment_reference,
            "status": d.status,
            "amount": float(d.amount),
            "tax_amount": float(d.tax_amount),
            "financial_entity_id": d.financial_entity_id,
            "financial_entity_name": d.financial_entity_name,
            "account_number": d.account_number,
            "account_type": d.account_type,
            "recipient_name": d.recipient_name,
            "recipient_document": d.recipient_document,
            "request_payload": d.request_payload,
            "response_payload": d.response_payload,
            "webhook_payload": d.webhook_payload,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None
        }
        for d in dispersions
    ]

@router.post("/{withdrawal_id}/disperse-yoint", dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def manually_disperse_to_yoint(
    withdrawal_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permite al Administrador reenviar o forzar la dispersión de un retiro a la API de Yoint.
    """
    from src.services.yoint_service import YointService

    withdrawal = await WithdrawalService.get_withdrawal(db, withdrawal_id)
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Retiro no encontrado")

    if not withdrawal.user:
        raise HTTPException(status_code=400, detail="El retiro no tiene usuario asignado")

    dispersion = await YointService.send_dispersion(db=db, withdrawal=withdrawal, user=withdrawal.user)

    await log_audit_trail(
        db=db,
        action="WITHDRAWAL_YOINT_DISPERSE",
        module="withdrawals",
        user=current_user,
        entity_type="Withdrawal",
        entity_id=withdrawal_id,
        description=f"Dispersión manual a Yoint para retiro #{withdrawal_id}. Estado: {dispersion.status}, OrderId: {dispersion.order_id}",
        details={"dispersion_id": dispersion.id, "order_id": dispersion.order_id, "status": dispersion.status},
        request=request
    )

    return {
        "message": "Dispersión procesada con Yoint",
        "dispersion_id": dispersion.id,
        "order_id": dispersion.order_id,
        "status": dispersion.status,
        "error_message": dispersion.error_message
    }

@router.get("/{withdrawal_id}/yoint-status", dependencies=[Depends(RequirePermission("admin.withdrawals.manage"))])
async def check_withdrawal_yoint_status(
    withdrawal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Consulta en vivo a la API de Yoint el estado de la última orden de este retiro.
    """
    from sqlalchemy.future import select
    from src.models.yoint_dispersion import YointDispersion
    from src.services.yoint_service import YointService

    q = select(YointDispersion).where(YointDispersion.withdrawal_id == withdrawal_id).order_by(YointDispersion.id.desc())
    res = await db.execute(q)
    dispersion = res.scalars().first()

    if not dispersion:
        raise HTTPException(status_code=404, detail="Este retiro no tiene dispersiones registradas en Yoint")

    live_status = await YointService.query_order_status(db, dispersion)
    return {
        "order_id": dispersion.order_id,
        "current_local_status": dispersion.status,
        "live_yoint_response": live_status
    }

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

