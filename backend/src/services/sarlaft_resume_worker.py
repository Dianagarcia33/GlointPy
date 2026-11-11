"""Worker que retoma las validaciones SARLAFT que quedaron en proceso (nunca más se quedan bloqueadas)."""
import asyncio
import logging

from src.core.database import async_session_maker
from src.services.tusdatos_service import TusdatosService

logger = logging.getLogger(__name__)

INTERVAL_SECONDS = 120


async def background_sarlaft_resume_worker():
    # Esperar tras el arranque para no competir con el arranque inicial
    await asyncio.sleep(45)
    while True:
        try:
            async with async_session_maker() as db:
                await TusdatosService.resume_pending_checks(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error en ciclo background_sarlaft_resume_worker: {e}")
        await asyncio.sleep(INTERVAL_SECONDS)
