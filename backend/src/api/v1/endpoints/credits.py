import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.models.user import User
from src.models.credit import Credit, CreditInstallment, CreditConfig
from src.models.user_bank_account import UserBankAccount
from src.schemas.credit import (
    CreditConfigOut,
    CreditConfigUpdate,
    CreditCreate,
    CreditApprove,
    CreditReject,
    CreditOut,
    CreditPaginatedResponse,
    CreditInstallmentOut,
    CreditInstallmentPayRequest,
    CreditInstallmentReviewRequest,
    CreditSimulationResponse
)
from src.services.credit_service import CreditService
from src.api.deps import get_current_user, RequirePermission
from src.services.audit_trail_service import log_audit_trail

router = APIRouter()


# =========================================================================
# 1. CONFIGURACIÓN Y TASA DE USURA LEGAL (SUPERFINANCIERA)
# =========================================================================

@router.get("/config", response_model=CreditConfigOut)
async def get_credit_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la configuración vigente de créditos y la tasa de usura legal en Colombia.
    """
    config = await CreditService.get_or_create_config(db)
    return config


@router.put("/config", response_model=CreditConfigOut, dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def update_credit_config(
    data: CreditConfigUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permite al Administrador actualizar los límites crediticios y la Tasa de Usura legal.
    """
    config = await CreditService.update_config(db, current_user, data)
    
    await log_audit_trail(
        db=db,
        action="CREDIT_CONFIG_UPDATE",
        module="credits",
        user=current_user,
        entity_type="CreditConfig",
        entity_id=config.id,
        description=f"Tasa de usura actualizada por admin: EA {config.max_usury_rate_ea}%, Mensual {config.max_usury_rate_monthly}%. Tasa estándar: {config.default_interest_rate_monthly}%",
        details=data.dict(exclude_none=True),
        request=request
    )
    return config


# =========================================================================
# 2. SIMULADOR DE CRÉDITO
# =========================================================================

@router.get("/simulate", response_model=CreditSimulationResponse)
async def simulate_credit(
    amount: float = Query(..., ge=10000.0, description="Monto del crédito"),
    term_months: int = Query(..., ge=1, le=48, description="Plazo en meses"),
    interest_rate: Optional[float] = Query(None, description="Tasa mensual (%) opcional"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Simula una tabla de amortización con cuota fija y desglose mensual de capital e intereses.
    """
    config = await CreditService.get_or_create_config(db)
    applied_rate = interest_rate if interest_rate is not None else float(config.default_interest_rate_monthly)
    return CreditService.simulate(amount, term_months, applied_rate)


# =========================================================================
# 3. CLIENTE (INVERSIONISTA / USUARIO GLOINT)
# =========================================================================

@router.get("/me", response_model=List[CreditOut], dependencies=[Depends(RequirePermission(["credits:view", "credits:request", "dashboard:view_investments", "wallets:view"]))])
async def get_my_credits(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los créditos solicitados y activos del cliente autenticado.
    """
    credits = await CreditService.get_user_credits(db, current_user.id)
    
    # Mapear respuesta con datos extendidos
    res = []
    for c in credits:
        total_rep = sum(float(i.total_amount) for i in c.installments) if c.installments else (float(c.approved_amount or c.requested_amount))
        total_p = sum(float(i.paid_amount) for i in c.installments) if c.installments else 0.0
        rem = max(0.0, total_rep - total_p)
        
        c_dict = {
            "id": c.id,
            "user_id": c.user_id,
            "user_name": current_user.name,
            "user_email": current_user.email,
            "user_document": current_user.document_id,
            "user_phone": current_user.phone_number,
            "requested_amount": float(c.requested_amount),
            "approved_amount": float(c.approved_amount) if c.approved_amount else None,
            "term_months": c.term_months,
            "interest_rate": float(c.interest_rate),
            "frequency": c.frequency,
            "status": c.status,
            "purpose": c.purpose,
            "user_bank_account_id": c.user_bank_account_id,
            "banco": c.banco,
            "tipo_cuenta": c.tipo_cuenta,
            "numero_cuenta": c.numero_cuenta,
            "approved_at": c.approved_at,
            "rejected_at": c.rejected_at,
            "rejection_reason": c.rejection_reason,
            "disbursed_at": c.disbursed_at,
            "disbursement_method": c.disbursement_method,
            "disbursement_reference": c.disbursement_reference,
            "disbursement_receipt_url": c.disbursement_receipt_url,
            "admin_notes": c.admin_notes,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "total_repayable": total_rep,
            "total_paid": total_p,
            "remaining_balance": rem,
            "installments": [
                {
                    "id": inst.id,
                    "credit_id": inst.credit_id,
                    "installment_number": inst.installment_number,
                    "due_date": inst.due_date,
                    "principal_amount": float(inst.principal_amount),
                    "interest_amount": float(inst.interest_amount),
                    "total_amount": float(inst.total_amount),
                    "wallet_amount_paid": float(inst.wallet_amount_paid),
                    "external_amount_paid": float(inst.external_amount_paid),
                    "paid_amount": float(inst.paid_amount),
                    "status": inst.status,
                    "payment_method": inst.payment_method,
                    "payment_reference": inst.payment_reference,
                    "receipt_url": inst.receipt_url,
                    "paid_at": inst.paid_at,
                    "rejection_reason": inst.rejection_reason,
                    "notes": inst.notes,
                    "created_at": inst.created_at,
                }
                for inst in c.installments
            ]
        }
        res.append(c_dict)
    return res


@router.get("/me/bank-accounts")
async def get_my_credit_bank_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna las cuentas bancarias registradas del usuario para seleccionar destino del desembolso.
    """
    res = await db.execute(
        select(UserBankAccount).where(
            (UserBankAccount.user_id == current_user.id) & 
            (UserBankAccount.is_active == True)
        )
    )
    accounts = res.scalars().all()
    return [
        {
            "id": a.id,
            "banco": a.banco,
            "tipo_cuenta": a.tipo_cuenta,
            "numero_cuenta": a.numero_cuenta
        }
        for a in accounts
    ]


@router.post("/me/request", dependencies=[Depends(RequirePermission(["credits:request", "credits:view", "dashboard:view_investments", "wallets:view"]))])
async def request_credit(
    data: CreditCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Crea una nueva solicitud de crédito para el cliente autenticado.
    """
    credit = await CreditService.request_credit(db, current_user, data)
    
    await log_audit_trail(
        db=db,
        action="CREDIT_REQUEST_CREATED",
        module="credits",
        user=current_user,
        entity_type="Credit",
        entity_id=credit.id,
        description=f"Solicitud de crédito #{credit.id} por ${credit.requested_amount:,.0f} COP para desembolso a {credit.banco} ({credit.numero_cuenta})",
        details={
            "requested_amount": float(credit.requested_amount),
            "term_months": credit.term_months,
            "banco": credit.banco,
            "numero_cuenta": credit.numero_cuenta
        },
        request=request
    )

    return {
        "message": "Solicitud de crédito radicada con éxito. Será evaluada por el equipo administrativo.",
        "credit_id": credit.id,
        "status": credit.status
    }


@router.post("/installments/{installment_id}/pay", dependencies=[Depends(RequirePermission(["credits:pay", "credits:view", "dashboard:view_investments", "wallets:view"]))])
async def pay_credit_installment(
    installment_id: int,
    use_wallet_amount: float = Form(0.0),
    payment_method: str = Form("MANUAL_TRANSFER"),
    payment_reference: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    receipt: Optional[UploadFile] = File(None),
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Paga una cuota de crédito de forma mixta o directa:
    - use_wallet_amount: Opcional, debita saldo de billetera en tiempo real.
    - Si queda saldo pendiente: sube el comprobante de transferencia bancaria manual.
    """
    pay_data = CreditInstallmentPayRequest(
        use_wallet_amount=use_wallet_amount,
        payment_method=payment_method,
        payment_reference=payment_reference,
        notes=notes
    )

    installment = await CreditService.pay_installment(
        db=db,
        user=current_user,
        installment_id=installment_id,
        pay_data=pay_data,
        receipt_file=receipt
    )

    await log_audit_trail(
        db=db,
        action="CREDIT_INSTALLMENT_PAYMENT",
        module="credits",
        user=current_user,
        entity_type="CreditInstallment",
        entity_id=installment.id,
        description=f"Pago cuota #{installment.installment_number} de crédito #{installment.credit_id}. Wallet: ${installment.wallet_amount_paid:,.0f} COP, Externo: ${installment.external_amount_paid:,.0f} COP. Estado: {installment.status}",
        details={
            "wallet_paid": float(installment.wallet_amount_paid),
            "external_paid": float(installment.external_amount_paid),
            "status": installment.status
        },
        request=request
    )

    return {
        "message": "Pago de cuota procesado correctamente.",
        "installment_id": installment.id,
        "status": installment.status,
        "wallet_amount_paid": float(installment.wallet_amount_paid),
        "external_amount_paid": float(installment.external_amount_paid),
        "paid_amount": float(installment.paid_amount)
    }


# =========================================================================
# 4. ADMINISTRADOR (GESTIÓN FINTECH & YOINT DISPERSIONS)
# =========================================================================

@router.get("/admin", response_model=CreditPaginatedResponse, dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def get_admin_credits(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Bandeja administrativa con filtros, búsqueda y paginación para auditar créditos.
    """
    items, total = await CreditService.get_admin_credits(
        db=db,
        page=page,
        limit=limit,
        status_filter=status,
        search=search
    )

    pages = (total + limit - 1) // limit if total > 0 else 1

    formatted_items = []
    for c in items:
        user_obj = c.user
        total_rep = sum(float(i.total_amount) for i in c.installments) if c.installments else (float(c.approved_amount or c.requested_amount))
        total_p = sum(float(i.paid_amount) for i in c.installments) if c.installments else 0.0
        rem = max(0.0, total_rep - total_p)

        formatted_items.append({
            "id": c.id,
            "user_id": c.user_id,
            "user_name": user_obj.name if user_obj else "Usuario",
            "user_email": user_obj.email if user_obj else None,
            "user_document": user_obj.document_id if user_obj else None,
            "user_phone": user_obj.phone_number if user_obj else None,
            "requested_amount": float(c.requested_amount),
            "approved_amount": float(c.approved_amount) if c.approved_amount else None,
            "term_months": c.term_months,
            "interest_rate": float(c.interest_rate),
            "frequency": c.frequency,
            "status": c.status,
            "purpose": c.purpose,
            "user_bank_account_id": c.user_bank_account_id,
            "banco": c.banco,
            "tipo_cuenta": c.tipo_cuenta,
            "numero_cuenta": c.numero_cuenta,
            "approved_at": c.approved_at,
            "rejected_at": c.rejected_at,
            "rejection_reason": c.rejection_reason,
            "disbursed_at": c.disbursed_at,
            "disbursement_method": c.disbursement_method,
            "disbursement_reference": c.disbursement_reference,
            "disbursement_receipt_url": c.disbursement_receipt_url,
            "admin_notes": c.admin_notes,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "total_repayable": total_rep,
            "total_paid": total_p,
            "remaining_balance": rem,
            "installments": [
                {
                    "id": inst.id,
                    "credit_id": inst.credit_id,
                    "installment_number": inst.installment_number,
                    "due_date": inst.due_date,
                    "principal_amount": float(inst.principal_amount),
                    "interest_amount": float(inst.interest_amount),
                    "total_amount": float(inst.total_amount),
                    "wallet_amount_paid": float(inst.wallet_amount_paid),
                    "external_amount_paid": float(inst.external_amount_paid),
                    "paid_amount": float(inst.paid_amount),
                    "status": inst.status,
                    "payment_method": inst.payment_method,
                    "payment_reference": inst.payment_reference,
                    "receipt_url": inst.receipt_url,
                    "paid_at": inst.paid_at,
                    "rejection_reason": inst.rejection_reason,
                    "notes": inst.notes,
                    "created_at": inst.created_at,
                }
                for inst in c.installments
            ]
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
        "items": formatted_items
    }


@router.get("/admin/{credit_id}", response_model=CreditOut, dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def get_admin_credit_detail(
    credit_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Detalle ampliado de un crédito para evaluación administrativa.
    """
    q = select(Credit).options(
        selectinload(Credit.user),
        selectinload(Credit.installments),
        selectinload(Credit.bank_account),
        selectinload(Credit.yoint_dispersions)
    ).where(Credit.id == credit_id)
    
    res = await db.execute(q)
    c = res.scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Crédito no encontrado")

    user_obj = c.user
    total_rep = sum(float(i.total_amount) for i in c.installments) if c.installments else (float(c.approved_amount or c.requested_amount))
    total_p = sum(float(i.paid_amount) for i in c.installments) if c.installments else 0.0
    rem = max(0.0, total_rep - total_p)

    return {
        "id": c.id,
        "user_id": c.user_id,
        "user_name": user_obj.name if user_obj else "Usuario",
        "user_email": user_obj.email if user_obj else None,
        "user_document": user_obj.document_id if user_obj else None,
        "user_phone": user_obj.phone_number if user_obj else None,
        "requested_amount": float(c.requested_amount),
        "approved_amount": float(c.approved_amount) if c.approved_amount else None,
        "term_months": c.term_months,
        "interest_rate": float(c.interest_rate),
        "frequency": c.frequency,
        "status": c.status,
        "purpose": c.purpose,
        "user_bank_account_id": c.user_bank_account_id,
        "banco": c.banco,
        "tipo_cuenta": c.tipo_cuenta,
        "numero_cuenta": c.numero_cuenta,
        "approved_at": c.approved_at,
        "rejected_at": c.rejected_at,
        "rejection_reason": c.rejection_reason,
        "disbursed_at": c.disbursed_at,
        "disbursement_method": c.disbursement_method,
        "disbursement_reference": c.disbursement_reference,
        "disbursement_receipt_url": c.disbursement_receipt_url,
        "admin_notes": c.admin_notes,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "total_repayable": total_rep,
        "total_paid": total_p,
        "remaining_balance": rem,
        "installments": [
            {
                "id": inst.id,
                "credit_id": inst.credit_id,
                "installment_number": inst.installment_number,
                "due_date": inst.due_date,
                "principal_amount": float(inst.principal_amount),
                "interest_amount": float(inst.interest_amount),
                "total_amount": float(inst.total_amount),
                "wallet_amount_paid": float(inst.wallet_amount_paid),
                "external_amount_paid": float(inst.external_amount_paid),
                "paid_amount": float(inst.paid_amount),
                "status": inst.status,
                "payment_method": inst.payment_method,
                "payment_reference": inst.payment_reference,
                "receipt_url": inst.receipt_url,
                "paid_at": inst.paid_at,
                "rejection_reason": inst.rejection_reason,
                "notes": inst.notes,
                "created_at": inst.created_at,
            }
            for inst in c.installments
        ]
    }


@router.post("/admin/{credit_id}/approve", dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def approve_credit(
    credit_id: int,
    data: CreditApprove,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aprobación en 1 Clic del Crédito:
    - Genera tabla de amortización con cuota fija.
    - Dispara orden de dispersión hacia Yoint a la cuenta del cliente.
    - Activa el crédito.
    """
    credit = await CreditService.approve_credit(
        db=db,
        admin_user=current_user,
        credit_id=credit_id,
        data=data
    )

    await log_audit_trail(
        db=db,
        action="CREDIT_APPROVED_AND_DISPERSED",
        module="credits",
        user=current_user,
        entity_type="Credit",
        entity_id=credit.id,
        description=f"Crédito #{credit.id} APROBADO por ${credit.approved_amount:,.0f} COP a {credit.term_months} meses ({credit.interest_rate}% M.V.). Dispersión Yoint generada: {credit.disbursement_reference}",
        details={
            "approved_amount": float(credit.approved_amount),
            "term_months": credit.term_months,
            "interest_rate": float(credit.interest_rate),
            "disbursement_reference": credit.disbursement_reference
        },
        request=request
    )

    return {
        "message": "Crédito aprobado y orden de dispersión enviada a Yoint exitosamente.",
        "credit_id": credit.id,
        "approved_amount": float(credit.approved_amount),
        "status": credit.status,
        "disbursement_reference": credit.disbursement_reference,
        "installments_count": len(credit.installments)
    }


@router.post("/admin/{credit_id}/reject", dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def reject_credit(
    credit_id: int,
    data: CreditReject,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Rechaza una solicitud de crédito.
    """
    credit = await CreditService.reject_credit(
        db=db,
        admin_user=current_user,
        credit_id=credit_id,
        data=data
    )

    await log_audit_trail(
        db=db,
        action="CREDIT_REJECTED",
        module="credits",
        user=current_user,
        entity_type="Credit",
        entity_id=credit.id,
        description=f"Crédito #{credit.id} RECHAZADO por admin. Causa: {data.reason}",
        details={"reason": data.reason},
        request=request
    )

    return {
        "message": "Solicitud de crédito rechazada.",
        "credit_id": credit.id,
        "status": credit.status,
        "reason": credit.rejection_reason
    }


@router.get("/admin/installments/pending-review", dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def get_pending_review_installments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna todas las cuotas de créditos con comprobante de pago pendiente de validar.
    """
    q = select(CreditInstallment).options(
        selectinload(CreditInstallment.credit).selectinload(Credit.user)
    ).where(CreditInstallment.status == "IN_REVIEW").order_by(CreditInstallment.id.asc())

    res = await db.execute(q)
    installments = res.scalars().all()

    return [
        {
            "installment_id": inst.id,
            "credit_id": inst.credit_id,
            "installment_number": inst.installment_number,
            "user_name": inst.credit.user.name if inst.credit and inst.credit.user else "Usuario",
            "user_email": inst.credit.user.email if inst.credit and inst.credit.user else None,
            "due_date": inst.due_date,
            "total_amount": float(inst.total_amount),
            "wallet_amount_paid": float(inst.wallet_amount_paid),
            "external_amount_paid": float(inst.external_amount_paid),
            "paid_amount": float(inst.paid_amount),
            "payment_reference": inst.payment_reference,
            "receipt_url": inst.receipt_url,
            "created_at": inst.created_at,
            "notes": inst.notes
        }
        for inst in installments
    ]


@router.post("/admin/installments/{installment_id}/review", dependencies=[Depends(RequirePermission(["admin.credits.manage", "credits:manage"]))])
async def review_installment(
    installment_id: int,
    data: CreditInstallmentReviewRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aprueba o rechaza el comprobante de pago de una cuota.
    """
    inst = await CreditService.review_installment_payment(
        db=db,
        admin_user=current_user,
        installment_id=installment_id,
        data=data
    )

    action_name = "CREDIT_INSTALLMENT_APPROVED" if data.approve else "CREDIT_INSTALLMENT_REJECTED"
    desc_str = f"Cuota #{inst.installment_number} de crédito #{inst.credit_id} APROBADA" if data.approve else f"Cuota #{inst.installment_number} de crédito #{inst.credit_id} RECHAZADA: {data.rejection_reason}"

    await log_audit_trail(
        db=db,
        action=action_name,
        module="credits",
        user=current_user,
        entity_type="CreditInstallment",
        entity_id=inst.id,
        description=desc_str,
        details={"approve": data.approve, "rejection_reason": data.rejection_reason},
        request=request
    )

    return {
        "message": "Revisión de cuota registrada con éxito.",
        "installment_id": inst.id,
        "status": inst.status
    }
