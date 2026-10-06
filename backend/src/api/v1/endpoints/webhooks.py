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
    x_webhook_secret: Optional[str] = Header(None)
):
    """
    Webhook público para recibir notificaciones automáticas en tiempo real de Yoint Payments.
    Actualiza el estado de las dispersiones (APPROVED, REJECTED, etc.) y ejecuta
    la aprobación o la reversión a la wallet según corresponda.
    """
    # 1. Validación de seguridad si se configuró YOINT_WEBHOOK_SECRET
    if settings.YOINT_WEBHOOK_SECRET:
        if x_webhook_secret != settings.YOINT_WEBHOOK_SECRET:
            logger.warning("Intento de acceso a webhook Yoint con secreto inválido o ausente.")
            raise HTTPException(status_code=401, detail="Unauthorized webhook")

    # 2. Leer payload JSON
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Payload no válido en webhook Yoint: {e}")
        return {"received": True, "error": "Invalid JSON"}

    logger.info(f"Webhook Yoint recibido: {payload}")

    # 3. Extraer orderId y estado (tolerante a múltiples formatos de pasarela)
    order_id = (
        payload.get("orderId") 
        or payload.get("order_id")
        or payload.get("data", {}).get("orderId")
        or payload.get("data", {}).get("order_id")
        or payload.get("id")
    )
    
    new_status = (
        payload.get("status") 
        or payload.get("state")
        or payload.get("data", {}).get("status")
        or payload.get("data", {}).get("state")
        or payload.get("event")
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
