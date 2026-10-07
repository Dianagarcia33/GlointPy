import asyncio
import logging
from sqlalchemy.future import select
from sqlalchemy import or_

from src.core.database import async_session_maker
from src.core.config import settings
from src.models.yoint_dispersion import YointDispersion
from src.models.withdrawal import Withdrawal, WithdrawalStatus
from src.services.yoint_service import YointService

logger = logging.getLogger(__name__)

async def background_yoint_sync_worker():
    """
    Worker en segundo plano que concilia periódicamente el estado de las órdenes en proceso de Yoint.
    Aplica 'Adaptive Polling' inteligente:
    - Si HAY órdenes en proceso (PENDING / PROCESSING / QUEUED o retiros en estado PROCESADO), consulta cada 30 segundos.
    - Si NO hay órdenes en proceso, descansa 120 segundos sin realizar llamadas HTTP externas.
    - No bloquea la API y previene saturación con pausas de 1s entre llamadas.
    """
    # Esperar 20 segundos tras el arranque de la app
    await asyncio.sleep(20)
    logger.info("🚀 [YointSyncWorker] Iniciando servicio de conciliación inteligente con Yoint (Adaptive Polling)...")

    while True:
        poll_interval = 120  # Intervalo por defecto cuando no hay actividad (2 minutos)
        try:
            # Solo consultar si hay credenciales configuradas
            if settings.YOINT_API_KEY or settings.YOINT_CLIENT_ID:
                async with async_session_maker() as db:
                    # Buscar dispersiones activas o retiros en estado 'procesado'
                    q = (
                        select(YointDispersion)
                        .join(Withdrawal, YointDispersion.withdrawal_id == Withdrawal.id)
                        .where(
                            or_(
                                YointDispersion.order_id.isnot(None),
                                YointDispersion.payment_reference.isnot(None)
                            ),
                            or_(
                                YointDispersion.status.in_(["PROCESSING", "PENDING", "QUEUED"]),
                                Withdrawal.estado == WithdrawalStatus.PROCESSED
                            )
                        )
                        .order_by(YointDispersion.id.asc())
                        .limit(30)
                    )

                    res = await db.execute(q)
                    pending_dispersions = res.scalars().all()

                    if pending_dispersions:
                        # Si hay órdenes en proceso, acelerar la sincronización a 30 segundos
                        poll_interval = 30
                        logger.info(f"[YointSyncWorker] Conciliando {len(pending_dispersions)} dispersión(es) activa(s) con Yoint...")

                        for disp in pending_dispersions:
                            try:
                                await YointService.query_order_status(db, disp)
                                # Pequeña pausa entre llamadas a la API de Yoint para no saturar
                                await asyncio.sleep(1)
                            except Exception as item_err:
                                logger.warning(f"[YointSyncWorker] Error consultando orden {disp.order_id or disp.payment_reference}: {item_err}")

        except asyncio.CancelledError:
            logger.info("[YointSyncWorker] Deteniendo worker de conciliación Yoint.")
            break
        except Exception as e:
            logger.error(f"[YointSyncWorker] Error inesperado en ciclo de sincronización Yoint: {e}")
            poll_interval = 60

        # Latido inteligente: 60s si hay pagos pendientes, 120s si no hay nada
        await asyncio.sleep(poll_interval)
