import asyncio
import json
import traceback
from datetime import datetime, date, timedelta, time
from decimal import Decimal
from typing import Optional, Dict, Any, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.database import async_session_maker
from src.core.timezone import BOGOTA_TZ, get_colombia_now, get_colombia_today
from src.models.user import User
from src.models.investor import Investor
from src.models.wallet import Wallet, WalletTransaction
from src.models.audit_log import AuditLog
from src.services.yield_calculator import calculate_investment_yield
from src.services.audit_trail_service import log_audit_trail


class DailyYieldService:

    @staticmethod
    async def execute_yield_dispersal(
        db: AsyncSession,
        start_date: date,
        end_date: date,
        pay_mode: str = "all",
        is_automatic: bool = True,
        triggered_by_user: Optional[User] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Ejecuta la dispersión masiva de rendimientos (y/o bonos de aceleración) para un ciclo de fechas.
        Aplica estricta idempotencia por contrato/inversión y almacena una pista de auditoría forense
        completa en audit_logs para permitir auditoría línea por línea y reversiones exactas.
        """
        include_yields = pay_mode in ("all", "yields_only")
        include_bonuses = pay_mode in ("all", "bonuses_only")

        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        batch_id = f"YIELD_BATCH_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}_{timestamp_str}"

        # 1. Cargar todos los usuarios con sus billeteras e inversiones activas
        query = select(User).options(
            selectinload(User.wallet),
            selectinload(User.investments).selectinload(Investor.package),
            selectinload(User.investments).selectinload(Investor.period),
            selectinload(User.investments).selectinload(Investor.withdrawals),
            selectinload(User.investments).selectinload(Investor.accelerations)
        )
        result = await db.execute(query)
        users = result.scalars().all()

        total_users_paid = 0
        total_investments_processed = 0
        global_yield_total = Decimal("0.00")
        global_acceleration_bonus_total = Decimal("0.00")
        global_grand_total = Decimal("0.00")

        transfers_log: List[Dict[str, Any]] = []
        skipped_transfers: List[Dict[str, Any]] = []

        # Pre-cargar transacciones existentes para blindaje de idempotencia en una sola consulta O(1)
        existing_tx_res = await db.execute(
            select(WalletTransaction.wallet_id, WalletTransaction.reference_id, WalletTransaction.description).where(
                WalletTransaction.reference_type.in_(["rendimiento_inversion", "bono_aceleracion"])
            )
        )
        existing_tx_set = {
            (r[0], r[1], r[2]) for r in existing_tx_res.fetchall()
        }

        try:
            for user in users:
                if not user.investments:
                    continue

                user_yield_total = Decimal("0.00")
                user_acc_bonus_total = Decimal("0.00")
                transactions_to_add = []

                # Asegurar billetera del usuario
                wallet = user.wallet
                if not wallet:
                    wallet = Wallet(user_id=user.id, balance=Decimal("0.00"), status="active")
                    db.add(wallet)
                    await db.flush()

                for investment in user.investments:
                    calc_res = calculate_investment_yield(investment, start_date, end_date)

                    # Rendimiento ordinario
                    if include_yields and calc_res.total_yield > 0:
                        yield_desc = f"Rendimiento del {calc_res.effective_start_date} al {calc_res.effective_end_date} (Inv. {investment.assigned_code})"

                        # Blindaje de Idempotencia O(1)
                        if (wallet.id, investment.id, yield_desc) in existing_tx_set:
                            skipped_transfers.append({
                                "user_id": user.id,
                                "investment_id": investment.id,
                                "assigned_code": investment.assigned_code,
                                "amount": float(calc_res.total_yield),
                                "reason": "Rendimiento ya acreditado previamente para este rango de fechas"
                            })
                        else:
                            user_yield_total += calc_res.total_yield
                            transactions_to_add.append({
                                "investment_id": investment.id,
                                "assigned_code": investment.assigned_code,
                                "package_name": f"Paquete ${investment.package.value:,}" if (investment.package and investment.package.value) else "N/A",
                                "amount": calc_res.total_yield,
                                "type": "ingreso",
                                "reference_type": "rendimiento_inversion",
                                "description": yield_desc
                            })

                    # Bono de aceleración
                    if include_bonuses and calc_res.acceleration_bonus > 0:
                        bonus_desc = f"Bono de aceleración de inversión {investment.assigned_code}"

                        # Blindaje de Idempotencia O(1)
                        if (wallet.id, investment.id, bonus_desc) in existing_tx_set:
                            skipped_transfers.append({
                                "user_id": user.id,
                                "investment_id": investment.id,
                                "assigned_code": investment.assigned_code,
                                "amount": float(calc_res.acceleration_bonus),
                                "reason": "Bono de aceleración ya acreditado previamente"
                            })
                        else:
                            user_acc_bonus_total += calc_res.acceleration_bonus
                            transactions_to_add.append({
                                "investment_id": investment.id,
                                "assigned_code": investment.assigned_code,
                                "package_name": f"Paquete ${investment.package.value:,}" if (investment.package and investment.package.value) else "N/A",
                                "amount": calc_res.acceleration_bonus,
                                "type": "ingreso",
                                "reference_type": "bono_aceleracion",
                                "description": bonus_desc
                            })

                user_grand_total = user_yield_total + user_acc_bonus_total

                if user_grand_total > 0 and transactions_to_add:
                    current_balance = wallet.balance
                    for tx_info in transactions_to_add:
                        prev_bal = current_balance
                        current_balance += tx_info["amount"]

                        tx = WalletTransaction(
                            wallet_id=wallet.id,
                            amount=tx_info["amount"],
                            type=tx_info["type"],
                            reference_type=tx_info["reference_type"],
                            reference_id=tx_info["investment_id"],
                            description=tx_info["description"],
                            balance_after=current_balance
                        )
                        db.add(tx)
                        await db.flush()  # Obtener tx.id

                        transfers_log.append({
                            "transaction_id": tx.id,
                            "user_id": user.id,
                            "user_name": user.name or user.email,
                            "user_email": user.email,
                            "document_id": user.document_id,
                            "wallet_id": wallet.id,
                            "investment_id": tx_info["investment_id"],
                            "assigned_code": tx_info["assigned_code"],
                            "package_name": tx_info["package_name"],
                            "amount": float(tx_info["amount"]),
                            "balance_before": float(prev_bal),
                            "balance_after": float(current_balance),
                            "reference_type": tx_info["reference_type"],
                            "description": tx_info["description"],
                            "timestamp_utc": datetime.utcnow().isoformat(),
                            "timestamp_cot": get_colombia_now().isoformat()
                        })

                        try:
                            await db.execute(text("""
                                INSERT INTO auto_transfer_logs (batch_id, investor_id, user_id, type, amount, status, message, metadata, created_at)
                                VALUES (:batch_id, :investor_id, :user_id, :type, :amount, :status, :message, :metadata, NOW())
                            """), {
                                "batch_id": batch_id,
                                "investor_id": tx_info["investment_id"],
                                "user_id": user.id,
                                "type": tx_info["reference_type"],
                                "amount": float(tx_info["amount"]),
                                "status": "COMPLETED",
                                "message": tx_info["description"][:255],
                                "metadata": json.dumps({
                                    "transaction_id": tx.id,
                                    "wallet_id": wallet.id,
                                    "balance_before": float(prev_bal),
                                    "balance_after": float(current_balance),
                                    "assigned_code": tx_info["assigned_code"]
                                })
                            })
                        except Exception:
                            pass

                    wallet.balance = current_balance
                    total_users_paid += 1
                    total_investments_processed += len(transactions_to_add)
                    global_yield_total += user_yield_total
                    global_acceleration_bonus_total += user_acc_bonus_total
                    global_grand_total += user_grand_total

            await db.commit()

            # 2. Registrar pista de auditoría forense inmutable
            action_name = "AUTOMATIC_DAILY_YIELD_DISPERSAL" if is_automatic else "MANUAL_BULK_YIELD_DISPERSAL"
            dispersal_desc = (
                f"Dispersión {'automática' if is_automatic else 'manual'} de rendimientos del ciclo {start_date} al {end_date}. "
                f"Total: ${global_grand_total:,.2f} COP en {len(transfers_log)} transferencias a {total_users_paid} inversionistas."
            )

            details_data = {
                "batch_id": batch_id,
                "is_automatic": is_automatic,
                "pay_mode": pay_mode,
                "cycle_start_date": str(start_date),
                "cycle_end_date": str(end_date),
                "executed_at_cot": get_colombia_now().strftime("%Y-%m-%d %H:%M:%S COT"),
                "executed_at_utc": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
                "total_users_paid": total_users_paid,
                "total_transfers_count": len(transfers_log),
                "skipped_count": len(skipped_transfers),
                "global_yield_total": float(global_yield_total),
                "global_acceleration_bonus_total": float(global_acceleration_bonus_total),
                "global_grand_total": float(global_grand_total),
                "transfers": transfers_log,
                "skipped_transfers": skipped_transfers
            }

            await log_audit_trail(
                db=db,
                action=action_name,
                module="audit",
                user=triggered_by_user,
                entity_type="BatchDispersal",
                entity_id=batch_id,
                description=dispersal_desc,
                details=details_data,
                ip_address=ip_address,
                user_agent=user_agent,
                status="SUCCESS"
            )

            return {
                "success": True,
                "batch_id": batch_id,
                "message": dispersal_desc,
                "start_date": str(start_date),
                "end_date": str(end_date),
                "total_users_paid": total_users_paid,
                "total_transfers_count": len(transfers_log),
                "skipped_count": len(skipped_transfers),
                "global_yield_total": float(global_yield_total),
                "global_acceleration_bonus_total": float(global_acceleration_bonus_total),
                "global_grand_total": float(global_grand_total)
            }

        except Exception as e:
            await db.rollback()
            error_msg = f"Error en dispersión de rendimientos (Lote {batch_id}): {str(e)}"
            print(f"[DailyYieldService] ERROR: {error_msg}")
            traceback.print_exc()

            try:
                await log_audit_trail(
                    db=db,
                    action="DAILY_YIELD_DISPERSAL_FAILED",
                    module="audit",
                    user=triggered_by_user,
                    entity_type="BatchDispersal",
                    entity_id=batch_id,
                    description=error_msg[:500],
                    details={
                        "batch_id": batch_id,
                        "error": str(e),
                        "traceback": traceback.format_exc(),
                        "cycle_start_date": str(start_date),
                        "cycle_end_date": str(end_date),
                        "is_automatic": is_automatic
                    },
                    status="FAILED"
                )
            except Exception:
                pass

            raise e

    @staticmethod
    async def rollback_yield_batch(
        db: AsyncSession,
        batch_id: str,
        operator_user: Optional[User] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reversa de forma segura y controlada un lote de dispersión de rendimientos ejecutado previamente.
        Verifica cada transacción registrada en AuditLog, debita el saldo y genera contrapartidas contables (EGRESO).
        """
        # Buscar el log de auditoría del lote
        query = select(AuditLog).where(
            AuditLog.entity_id == batch_id,
            AuditLog.action.in_(["AUTOMATIC_DAILY_YIELD_DISPERSAL", "MANUAL_BULK_YIELD_DISPERSAL"]),
            AuditLog.status == "SUCCESS"
        )
        res = await db.execute(query)
        batch_log = res.scalars().first()

        if not batch_log:
            raise ValueError(f"No se encontró un lote de dispersión exitoso con identificador '{batch_id}'")

        # Verificar si ya fue reversado previamente
        check_rollback = await db.execute(
            select(AuditLog.id).where(
                AuditLog.entity_id == batch_id,
                AuditLog.action == "YIELD_BATCH_ROLLBACK",
                AuditLog.status == "SUCCESS"
            )
        )
        if check_rollback.scalars().first():
            raise ValueError(f"El lote '{batch_id}' ya fue reversado previamente.")

        details = batch_log.details or {}
        transfers = details.get("transfers", [])
        if not transfers:
            raise ValueError(f"El lote '{batch_id}' no contiene transferencias registradas para reversar.")

        reversed_transfers = []
        total_reverted_amount = Decimal("0.00")

        for item in transfers:
            wallet_id = item.get("wallet_id")
            amount = Decimal(str(item.get("amount", "0")))
            inv_code = item.get("assigned_code", "")

            # Obtener billetera
            w_res = await db.execute(select(Wallet).where(Wallet.id == wallet_id))
            wallet = w_res.scalars().first()
            if not wallet:
                continue

            prev_balance = wallet.balance
            # Debitar saldo
            wallet.balance = max(Decimal("0.00"), wallet.balance - amount)
            total_reverted_amount += amount

            # Registrar contrapartida contable
            reversal_desc = f"Reverso de rendimiento por lote {batch_id} (Inv. {inv_code})"
            if reason:
                reversal_desc += f" - Motivo: {reason}"

            tx = WalletTransaction(
                wallet_id=wallet.id,
                amount=amount,
                type="egreso",
                reference_type="reverso_rendimiento",
                reference_id=item.get("investment_id"),
                description=reversal_desc[:255],
                balance_after=wallet.balance
            )
            db.add(tx)
            await db.flush()

            reversed_transfers.append({
                "original_transaction_id": item.get("transaction_id"),
                "reversal_transaction_id": tx.id,
                "user_id": item.get("user_id"),
                "wallet_id": wallet.id,
                "amount": float(amount),
                "balance_before": float(prev_balance),
                "balance_after": float(wallet.balance)
            })

            try:
                await db.execute(text("""
                    INSERT INTO auto_transfer_logs (batch_id, investor_id, user_id, type, amount, status, message, metadata, created_at)
                    VALUES (:batch_id, :investor_id, :user_id, :type, :amount, :status, :message, :metadata, NOW())
                """), {
                    "batch_id": batch_id,
                    "investor_id": item.get("investment_id"),
                    "user_id": item.get("user_id"),
                    "type": "reverso_rendimiento",
                    "amount": float(amount),
                    "status": "REVERSED",
                    "message": reversal_desc[:255],
                    "metadata": json.dumps({
                        "reversal_transaction_id": tx.id,
                        "original_transaction_id": item.get("transaction_id"),
                        "wallet_id": wallet.id,
                        "balance_before": float(prev_balance),
                        "balance_after": float(wallet.balance)
                    })
                })
            except Exception:
                pass

        await db.commit()

        # Registrar log de auditoría de la reversión
        rollback_details = {
            "batch_id": batch_id,
            "original_cycle_start": details.get("cycle_start_date"),
            "original_cycle_end": details.get("cycle_end_date"),
            "operator_user_id": operator_user.id if operator_user else None,
            "operator_email": operator_user.email if operator_user else None,
            "reason": reason,
            "reverted_at_cot": get_colombia_now().strftime("%Y-%m-%d %H:%M:%S COT"),
            "reverted_at_utc": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "total_transfers_reverted": len(reversed_transfers),
            "total_reverted_amount": float(total_reverted_amount),
            "reversals": reversed_transfers
        }

        await log_audit_trail(
            db=db,
            action="YIELD_BATCH_ROLLBACK",
            module="audit",
            user=operator_user,
            entity_type="BatchDispersal",
            entity_id=batch_id,
            description=f"Reverso ejecutado para el lote {batch_id}. Se debitaron ${total_reverted_amount:,.2f} COP en {len(reversed_transfers)} transacciones.",
            details=rollback_details,
            status="SUCCESS"
        )

        return {
            "success": True,
            "batch_id": batch_id,
            "message": f"Lote {batch_id} reversado con éxito",
            "total_reverted_amount": float(total_reverted_amount),
            "total_transfers_reverted": len(reversed_transfers)
        }

    @staticmethod
    async def get_historical_batches(db: AsyncSession, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Obtiene el historial de lotes de dispersión ejecutados (automáticos y manuales) para control y auditoría.
        """
        query = select(AuditLog).where(
            AuditLog.module == "audit",
            AuditLog.action.in_([
                "AUTOMATIC_DAILY_YIELD_DISPERSAL",
                "MANUAL_BULK_YIELD_DISPERSAL",
                "YIELD_BATCH_ROLLBACK"
            ])
        ).order_by(AuditLog.created_at.desc()).limit(limit)

        result = await db.execute(query)
        logs = result.scalars().all()

        batches = []
        for log in logs:
            det = log.details or {}
            batches.append({
                "id": log.id,
                "batch_id": log.entity_id,
                "action": log.action,
                "description": log.description,
                "is_automatic": det.get("is_automatic", False),
                "cycle_start_date": det.get("cycle_start_date"),
                "cycle_end_date": det.get("cycle_end_date"),
                "executed_at_cot": det.get("executed_at_cot"),
                "executed_at_utc": det.get("executed_at_utc"),
                "total_users_paid": det.get("total_users_paid", 0),
                "total_transfers_count": det.get("total_transfers_count", 0),
                "global_grand_total": det.get("global_grand_total", 0.0),
                "status": log.status,
                "created_at": log.created_at.isoformat() if log.created_at else None
            })
        return batches


async def check_and_run_daily_yield(db: AsyncSession) -> Optional[Dict[str, Any]]:
    """
    Verifica si la liquidación del ciclo diario (ayer -> hoy) ya fue ejecutada.
    Si no se ha ejecutado hoy, la dispara automáticamente (Catch-up seguro e idempotente).
    """
    run_time_cot = get_colombia_now()
    today_cot = run_time_cot.date()
    yesterday_cot = today_cot - timedelta(days=1)

    # Comprobar en audit_logs si ya hay un lote registrado para este ciclo (ayer -> hoy)
    batch_check_query = select(AuditLog).where(
        AuditLog.module == "audit",
        AuditLog.action.in_(["AUTOMATIC_DAILY_YIELD_DISPERSAL", "MANUAL_BULK_YIELD_DISPERSAL"]),
        AuditLog.status == "SUCCESS"
    ).order_by(AuditLog.id.desc()).limit(20)

    res = await db.execute(batch_check_query)
    logs = res.scalars().all()
    already_run = False
    for l in logs:
        det = l.details or {}
        if det.get("cycle_end_date") == str(today_cot) and det.get("cycle_start_date") == str(yesterday_cot):
            already_run = True
            print(f"[DailyYieldWorker] ℹ️ El ciclo de rendimientos ({yesterday_cot} -> {today_cot}) ya fue ejecutado previamente en lote {l.entity_id}.", flush=True)
            break

    if already_run:
        return None

    print(f"[DailyYieldWorker] 🔔 INICIANDO liquidación de rendimientos: Ciclo {yesterday_cot} -> {today_cot}...", flush=True)
    summary = await DailyYieldService.execute_yield_dispersal(
        db=db,
        start_date=yesterday_cot,
        end_date=today_cot,
        pay_mode="all",
        is_automatic=True
    )
    print(f"[DailyYieldWorker] ✅ Liquidación automática finalizada con éxito: {summary['message']}", flush=True)
    return summary


async def background_daily_yield_worker():
    """
    Worker asíncrono en segundo plano que se ejecuta permanentemente en el backend.
    1. Al arrancar (con retardo de 10s), verifica si la liquidación de hoy ya corrió. Si no, la ejecuta (Catch-up).
    2. Luego duerme hasta la próxima medianoche hora de Colombia (00:00:05 COT).
    3. Al despertar a medianoche, ejecuta la liquidación del día recién finalizado.
    """
    print("[DailyYieldWorker] 🚀 Iniciando servicio de dispersión automática diaria de rendimientos (Zona horaria: America/Bogota)...", flush=True)

    # Pequeño retardo de arranque para no interferir con la inicialización del servidor
    await asyncio.sleep(10)

    # CATCH-UP AL INICIAR: Si el servidor arrancó después de medianoche o fue reiniciado
    try:
        async with async_session_maker() as db:
            await check_and_run_daily_yield(db)
    except Exception as e:
        print(f"[DailyYieldWorker] ⚠️ Error en catch-up inicial de rendimientos: {e}", flush=True)
        traceback.print_exc()

    while True:
        try:
            now_cot = get_colombia_now()
            # La próxima medianoche es el día de mañana a las 00:00:05 COT
            tomorrow_date = now_cot.date() + timedelta(days=1)
            next_midnight = datetime.combine(tomorrow_date, time(0, 0, 5), tzinfo=BOGOTA_TZ)

            sleep_seconds = (next_midnight - now_cot).total_seconds()
            if sleep_seconds <= 0:
                sleep_seconds = 5

            hours = int(sleep_seconds // 3600)
            minutes = int((sleep_seconds % 3600) // 60)
            secs = int(sleep_seconds % 60)
            print(f"[DailyYieldWorker] ⏳ Próxima liquidación automática programada para: {next_midnight.strftime('%Y-%m-%d %H:%M:%S COT')} (en {hours}h {minutes}m {secs}s).", flush=True)

            await asyncio.sleep(sleep_seconds)

            # --- EJECUCIÓN A MEDIANOCHE COT ---
            async with async_session_maker() as db:
                await check_and_run_daily_yield(db)

            # Pausa de seguridad de 60s para no disparar dos veces en el mismo segundo
            await asyncio.sleep(60)

        except asyncio.CancelledError:
            print("[DailyYieldWorker] 🛑 Worker de rendimientos cancelado.", flush=True)
            break
        except Exception as e:
            print(f"[DailyYieldWorker] ⚠️ Error en ciclo automático de rendimientos: {e}", flush=True)
            traceback.print_exc()
            await asyncio.sleep(60)
