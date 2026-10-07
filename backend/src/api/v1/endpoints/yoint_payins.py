import logging
from decimal import Decimal
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.models.yoint_payin import YointPayin
from src.models.wallet import Wallet
from src.models.wallet_recharge import WalletRecharge
from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
from src.services.yoint_service import YointService

logger = logging.getLogger(__name__)

router = APIRouter()

class InitPayinRequest(BaseModel):
    payin_type: str = Field(..., description="'WALLET_TOPUP' o 'INVESTMENT_REQUEST'")
    amount: float = Field(..., gt=0, description="Monto en COP a recaudar")
    payment_method: str = Field(..., description="'NEQUI', 'BOTON_BANCOLOMBIA' o 'PSE'")
    investment_request_id: Optional[int] = Field(None, description="ID de la solicitud de inversión (si aplica)")
    phone_nequi: Optional[str] = Field(None, description="Teléfono celular para recaudo Nequi")
    bank_id: Optional[str] = Field(None, description="ID de la entidad financiera para PSE")
    redirect_url: Optional[str] = Field(None, description="URL de retorno a la plataforma tras el pago")

@router.get("/banks", response_model=List[Dict[str, Any]])
async def get_financial_entities(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la lista de bancos y entidades financieras habilitadas para pago PSE.
    """
    return await YointService.get_financial_entities(db)

@router.post("/init")
async def init_payin(
    payload: InitPayinRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Inicia una orden de pago/recaudo con Yoint (Nequi, Botón Bancolombia o PSE).
    Soporta recargas de billetera y pago de solicitudes de inversión.
    """
    amount_dec = Decimal(str(payload.amount))
    if amount_dec < 5000:
        raise HTTPException(status_code=400, detail="El monto mínimo de pago es de $5.000 COP")

    method_clean = payload.payment_method.upper().strip()
    if method_clean not in ["NEQUI", "BOTON_BANCOLOMBIA", "PSE"]:
        raise HTTPException(status_code=400, detail=f"Método de pago '{payload.payment_method}' no soportado")

    client_ip = request.client.host if request.client else "127.0.0.1"

    wallet_recharge_id = None
    investment_request_id = payload.investment_request_id

    # 1. Validaciones para SOLICITUD DE INVERSIÓN
    if payload.payin_type == "INVESTMENT_REQUEST":
        if not investment_request_id:
            raise HTTPException(status_code=400, detail="Se requiere 'investment_request_id' para este tipo de pago")
        
        req_res = await db.execute(
            select(InvestmentRequest).where(
                InvestmentRequest.id == investment_request_id,
                InvestmentRequest.user_id == current_user.id
            )
        )
        inv_req = req_res.scalars().first()
        if not inv_req:
            raise HTTPException(status_code=404, detail="Solicitud de inversión no encontrada")
        
        if inv_req.status != InvestmentRequestStatus.pending:
            raise HTTPException(status_code=400, detail=f"La solicitud ya se encuentra en estado '{inv_req.status.value}'")

    # 2. Preparar RECARGA DE BILLETERA
    elif payload.payin_type == "WALLET_TOPUP":
        w_res = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
        wallet = w_res.scalars().first()
        if not wallet:
            wallet = Wallet(user_id=current_user.id, balance=Decimal("0.00"), currency="COP")
            db.add(wallet)
            await db.flush()

        # Crear registro de recarga preliminar
        recharge = WalletRecharge(
            user_id=current_user.id,
            wallet_id=wallet.id,
            amount=amount_dec,
            status="pending",
            payment_method=f"Yoint {method_clean}",
            reference_number="EN_PROCESO_YOINT",
            receipt_url="https://yoint.co/gateway",
            user_notes=f"Recarga iniciada en línea ({method_clean})"
        )
        db.add(recharge)
        await db.commit()
        await db.refresh(recharge)
        wallet_recharge_id = recharge.id

    else:
        raise HTTPException(status_code=400, detail=f"Tipo de pago '{payload.payin_type}' no soportado")

    # 3. Invocar YointService para registrar y solicitar el recaudo a Yoint
    result = await YointService.create_payin_order(
        db=db,
        user=current_user,
        amount=amount_dec,
        payment_method=method_clean,
        payin_type=payload.payin_type,
        investment_request_id=investment_request_id,
        wallet_recharge_id=wallet_recharge_id,
        phone_nequi=payload.phone_nequi,
        redirect_url=payload.redirect_url,
        bank_id=payload.bank_id,
        ip_address=client_ip
    )

    if not result.get("success"):
        raise HTTPException(status_code=502, detail=result.get("error", "Error iniciando pago con la pasarela Yoint"))

    return result

@router.get("/{payin_id}/status")
async def get_payin_status(
    payin_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Consulta el estado en tiempo real de una orden de recaudo.
    Si está en estado PENDING, interroga directamente a la API de Yoint.
    """
    res = await db.execute(
        select(YointPayin).where(
            YointPayin.id == payin_id,
            YointPayin.user_id == current_user.id
        )
    )
    payin = res.scalars().first()
    if not payin:
        raise HTTPException(status_code=404, detail="Orden de pago no encontrada")

    PENDING_STATUSES = {
        "PENDING", "IN_PROGRESS", "PROCESSING", "WAITING", 
        "CREATED", "INITIATED", "EN_PROCESO", "PENDIENTE"
    }

    # Si está pendiente o en proceso y tiene order_id, consultar estado a Yoint
    if (not payin.status or payin.status.upper() in PENDING_STATUSES) and payin.order_id:
        try:
            await YointService.query_payin_status(db, payin)
            await db.refresh(payin)
        except Exception as e:
            logger.warning(f"Error consultando Yoint para payin #{payin.id}: {e}")

    # Verificar si la inversión ya quedó aprobada
    investment_approved = False
    if payin.investment_request_id:
        inv_res = await db.execute(
            select(InvestmentRequest.status).where(InvestmentRequest.id == payin.investment_request_id)
        )
        inv_status = inv_res.scalar_one_or_none()
        if inv_status == InvestmentRequestStatus.approved:
            investment_approved = True
        elif payin.status == "SUCCESS":
            # Si el pago ya está confirmado como exitoso pero la inversión aún no se aprobó, intentar aprobar ahora
            try:
                await YointService.process_payin_status_transition(
                    db=db, payin=payin, new_status="SUCCESS", payload=payin.webhook_payload
                )
                inv_res2 = await db.execute(
                    select(InvestmentRequest.status).where(InvestmentRequest.id == payin.investment_request_id)
                )
                if inv_res2.scalar_one_or_none() == InvestmentRequestStatus.approved:
                    investment_approved = True
            except Exception as auto_err:
                logger.warning(f"Error en reintento de auto-aprobación para inversión #{payin.investment_request_id}: {auto_err}")

    return {
        "payin_id": payin.id,
        "order_id": payin.order_id,
        "status": payin.status,
        "payment_method": payin.payment_method,
        "amount": float(payin.amount),
        "payin_type": payin.payin_type,
        "redirect_url": payin.redirect_url,
        "investment_request_id": payin.investment_request_id,
        "investment_approved": investment_approved,
        "created_at": payin.created_at.isoformat() if payin.created_at else None,
        "updated_at": payin.updated_at.isoformat() if payin.updated_at else None
    }

@router.get("/my")
async def get_my_payins(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna el historial de recaudos y pagos realizados por el usuario actual.
    """
    res = await db.execute(
        select(YointPayin)
        .where(YointPayin.user_id == current_user.id)
        .order_by(YointPayin.id.desc())
        .limit(20)
    )
    payins = res.scalars().all()
    return [
        {
            "id": p.id,
            "order_id": p.order_id,
            "status": p.status,
            "payment_method": p.payment_method,
            "amount": float(p.amount),
            "payin_type": p.payin_type,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in payins
    ]
