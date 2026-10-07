import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.config import settings
from src.services.yoint_service import YointService

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/yoint")
async def yoint_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_webhook_secret: Optional[str] = Header(None),
    x_yoint_secret: Optional[str] = Header(None),
    x_signature: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
):
    """
    Webhook público para recibir notificaciones automáticas en tiempo real de Yoint Payments.
    Actualiza el estado de las dispersiones (APPROVED, REJECTED, etc.) y ejecuta
    la aprobación o la reversión a la wallet según corresponda.
    """
    # 1. Validación de seguridad si se configuró YOINT_WEBHOOK_SECRET
    if settings.YOINT_WEBHOOK_SECRET:
        expected_secret = settings.YOINT_WEBHOOK_SECRET.strip()
        auth_val = (authorization or "").replace("Bearer ", "").replace("bearer ", "").strip()
        query_val = request.query_params.get("secret", "").strip()

        received = [
            (x_webhook_secret or "").strip(),
            (x_yoint_secret or "").strip(),
            (x_signature or "").strip(),
            auth_val,
            query_val
        ]

        if not any(expected_secret == r for r in received if r):
            logger.warning(f"Intento de acceso a webhook Yoint no autorizado (secreto no coincide).")
            raise HTTPException(status_code=401, detail="Unauthorized webhook")

    # 2. Leer payload JSON
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Payload no válido en webhook Yoint: {e}")
        return {"received": True, "error": "Invalid JSON"}

    logger.info(f"Webhook Yoint recibido: {payload}")

    # 3. Extraer orderId / referencia y estado (tolerante a múltiples formatos de pasarela)
    data_obj = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    dispersions_list = payload.get("dispersions") if isinstance(payload.get("dispersions"), list) else []
    first_disp = dispersions_list[0] if dispersions_list and isinstance(dispersions_list[0], dict) else {}

    order_id = (
        payload.get("orderId") 
        or payload.get("order_id")
        or payload.get("paymentReference")
        or payload.get("payment_reference")
        or payload.get("reference")
        or payload.get("id")
        or data_obj.get("orderId")
        or data_obj.get("order_id")
        or data_obj.get("paymentReference")
        or data_obj.get("reference")
        or data_obj.get("id")
        or first_disp.get("orderId")
        or first_disp.get("paymentReference")
    )
    
    new_status = (
        payload.get("status") 
        or payload.get("state")
        or payload.get("event")
        or data_obj.get("status")
        or data_obj.get("state")
        or first_disp.get("status")
        or first_disp.get("state")
    )

    if not order_id or not new_status:
        logger.warning(f"Webhook Yoint sin orderId o status identificable: {payload}")
        return {"received": True, "warning": "Missing orderId or status"}

    # 4. Procesar la transición de estado automáticamente
    processed = await YointService.process_status_transition(
        db=db,
        order_id=str(order_id),
        new_status=str(new_status),
        payload=payload
    )

    return {
        "received": True, 
        "order_id": str(order_id), 
        "status": str(new_status),
        "processed": processed
    }
