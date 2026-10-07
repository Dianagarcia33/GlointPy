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
    - Si HAY pagos en proceso (recaudos PSE/Nequi/Bancolombia, dispersiones o inversiones pendientes de conciliar),
      consulta cada 10-12 segundos para que el usuario reciba su inversión o recarga activa de inmediato
      incluso si cerró su sesión o salió del navegador.
    - Si NO hay órdenes en proceso, descansa 60 segundos sin realizar llamadas HTTP externas innecesarias.
    - No bloquea la API y previene saturación con pausas de 1s entre llamadas.
    """
    # Esperar 15 segundos tras el arranque de la app
    await asyncio.sleep(15)
    logger.info("🚀 [YointSyncWorker] Iniciando servicio de conciliación inteligente con Yoint (Adaptive Polling)...")

    while True:
        poll_interval = 60  # Intervalo por defecto cuando no hay actividad (1 minuto)
        try:
            # Solo consultar si hay credenciales configuradas
            if settings.YOINT_API_KEY or settings.YOINT_CLIENT_ID:
                async with async_session_maker() as db:
                    from src.models.yoint_payin import YointPayin
                    from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
                    from src.models.wallet_recharge import WalletRecharge

                    # 1. Buscar dispersiones activas o retiros en estado 'procesado'
                    q_disp = (
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
                    res_disp = await db.execute(q_disp)
                    pending_dispersions = res_disp.scalars().all()

                    # 2. Buscar recaudos/payins activos en estado pendiente o en proceso
                    q_payins = (
                        select(YointPayin)
                        .where(
                            YointPayin.status.in_([
                                "PENDING", "IN_PROGRESS", "PROCESSING", 
                                "WAITING", "CREATED", "INITIATED", "EN_PROCESO", "PENDIENTE"
                            ]),
                            or_(
                                YointPayin.order_id.isnot(None),
                                YointPayin.payment_reference.isnot(None),
                                YointPayin.response_payload.isnot(None)
                            )
                        )
                        .order_by(YointPayin.id.asc())
                        .limit(30)
                    )
                    res_payins = await db.execute(q_payins)
                    pending_payins = res_payins.scalars().all()

                    # 3. Auto-conciliación de contingencia: Payins que ya son SUCCESS pero cuya
                    # inversión o recarga siga en PENDING (por ejemplo si el usuario cerró la pestaña
                    # o hubo una intermitencia antes de ejecutar el approve).
                    q_unconciliated_inv = (
                        select(YointPayin)
                        .join(InvestmentRequest, YointPayin.investment_request_id == InvestmentRequest.id)
                        .where(
                            YointPayin.status == "SUCCESS",
                            InvestmentRequest.status == InvestmentRequestStatus.pending
                        )
                        .order_by(YointPayin.id.asc())
                        .limit(20)
                    )
                    res_unconciliated_inv = await db.execute(q_unconciliated_inv)
                    unconciliated_inv_payins = res_unconciliated_inv.scalars().all()

                    q_unconciliated_rec = (
                        select(YointPayin)
                        .join(WalletRecharge, YointPayin.wallet_recharge_id == WalletRecharge.id)
                        .where(
                            YointPayin.status == "SUCCESS",
                            WalletRecharge.status == "pending"
                        )
                        .order_by(YointPayin.id.asc())
                        .limit(20)
                    )
                    res_unconciliated_rec = await db.execute(q_unconciliated_rec)
                    unconciliated_rec_payins = res_unconciliated_rec.scalars().all()

                    has_active_activity = (
                        bool(pending_dispersions) 
                        or bool(pending_payins) 
                        or bool(unconciliated_inv_payins) 
                        or bool(unconciliated_rec_payins)
                    )

                    if has_active_activity:
                        poll_interval = 12  # Polling rápido cada 12 segundos mientras hay transacciones vivas

                        # A. Conciliar dispersiones
                        if pending_dispersions:
                            logger.info(f"[YointSyncWorker] Conciliando {len(pending_dispersions)} dispersión(es) activa(s) con Yoint...")
                            for disp in pending_dispersions:
                                try:
                                    await YointService.query_order_status(db, disp)
                                    await asyncio.sleep(1)
                                except Exception as item_err:
                                    logger.warning(f"[YointSyncWorker] Error consultando dispersión {disp.order_id or disp.payment_reference}: {item_err}")

                        # B. Conciliar recaudos pendientes
                        if pending_payins:
                            logger.info(f"[YointSyncWorker] Conciliando {len(pending_payins)} recaudo(s) en proceso con Yoint...")
                            for p in pending_payins:
                                try:
                                    await YointService.query_payin_status(db, p)
                                    await asyncio.sleep(1)
                                except Exception as payin_err:
                                    logger.warning(f"[YointSyncWorker] Error consultando recaudo #{p.id} ({p.order_id}): {payin_err}")

                        # C. Auto-conciliar inversiones pendientes con pago SUCCESS
                        if unconciliated_inv_payins:
                            logger.info(f"[YointSyncWorker] Auto-activando {len(unconciliated_inv_payins)} inversión(es) con pago confirmado...")
                            for p in unconciliated_inv_payins:
                                try:
                                    await YointService.process_payin_status_transition(
                                        db=db, payin=p, new_status="SUCCESS", payload=p.webhook_payload
                                    )
                                    await asyncio.sleep(1)
                                except Exception as act_err:
                                    logger.error(f"[YointSyncWorker] Error auto-activando inversión #{p.investment_request_id}: {act_err}")

                        # D. Auto-conciliar recargas pendientes con pago SUCCESS
                        if unconciliated_rec_payins:
                            logger.info(f"[YointSyncWorker] Auto-acreditando {len(unconciliated_rec_payins)} recarga(s) con pago confirmado...")
                            for p in unconciliated_rec_payins:
                                try:
                                    await YointService.process_payin_status_transition(
                                        db=db, payin=p, new_status="SUCCESS", payload=p.webhook_payload
                                    )
                                    await asyncio.sleep(1)
                                except Exception as rec_err:
                                    logger.error(f"[YointSyncWorker] Error auto-acreditando recarga #{p.wallet_recharge_id}: {rec_err}")

        except asyncio.CancelledError:
            logger.info("[YointSyncWorker] Deteniendo worker de conciliación Yoint.")
            break
        except Exception as e:
            logger.error(f"[YointSyncWorker] Error inesperado en ciclo de sincronización Yoint: {e}")
            poll_interval = 30

        # Latido inteligente: 12s si hay pagos en curso, 60s si el sistema está tranquilo
        await asyncio.sleep(poll_interval)
