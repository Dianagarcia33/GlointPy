import asyncio
import logging
from sqlalchemy.future import select

from src.core.database import async_session_maker
from src.core.config import settings
from src.models.yoint_dispersion import YointDispersion
from src.services.yoint_service import YointService

logger = logging.getLogger(__name__)

async def background_yoint_sync_worker():
    """
    Worker en segundo plano que concilia periódicamente el estado de las órdenes en proceso de Yoint.
    Sirve como capa de respaldo por si un Webhook de Yoint se pierde o se demora.
    """
    # Esperar 45 segundos tras el arranque de la app
    await asyncio.sleep(45)
    logger.info("🚀 [YointSyncWorker] Iniciando servicio de sincronización y conciliación periódica con Yoint...")

    while True:
        try:
            # Solo consultar si hay credenciales configuradas
            if settings.YOINT_API_KEY or settings.YOINT_CLIENT_ID:
                async with async_session_maker() as db:
                    # Buscar órdenes pendientes o en procesamiento
                    q = select(YointDispersion).where(
                        YointDispersion.order_id.isnot(None),
                        YointDispersion.status.in_(["PROCESSING", "PENDING"])
                    ).order_by(YointDispersion.id.asc()).limit(50)

                    res = await db.execute(q)
                    pending_dispersions = res.scalars().all()

                    if pending_dispersions:
                        logger.info(f"[YointSyncWorker] Consultando estado de {len(pending_dispersions)} dispersiones pendientes...")
                        for disp in pending_dispersions:
                            try:
                                await YointService.query_order_status(db, disp)
                                # Pequeña pausa entre llamadas a la API de Yoint para no saturar
                                await asyncio.sleep(1)
                            except Exception as item_err:
                                logger.warning(f"[YointSyncWorker] Error consultando orden {disp.order_id}: {item_err}")

        except asyncio.CancelledError:
            logger.info("[YointSyncWorker] Deteniendo worker de conciliación Yoint.")
            break
        except Exception as e:
            logger.error(f"[YointSyncWorker] Error inesperado en ciclo de sincronización: {e}")

        # Ejecutar cada 15 minutos (900 segundos)
        await asyncio.sleep(900)
