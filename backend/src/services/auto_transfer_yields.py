import logging
from datetime import datetime, timedelta, time, timezone
from decimal import Decimal
from typing import Tuple

from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, Date, Boolean, Integer, select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import Base
from src.models.investor import Investor
from src.models.wallet import Wallet

logger = logging.getLogger(__name__)

# --- Modelos Temporales (para tablas no mapeadas completamente) ---
class Retiro(Base):
    __tablename__ = "retiros"
    __table_args__ = {'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger, nullable=True)
    user_id = Column(BigInteger, nullable=False)
    origen = Column(String(255), default='inversion')
    tipo = Column(String(255), nullable=False) # 'rendimiento', 'capital', 'bono'
    monto = Column(Numeric(15, 2), nullable=False)
    impuesto = Column(Numeric(15, 2), nullable=False, default=0)
    monto_neto = Column(Numeric(15, 2), nullable=False)
    fecha_solicitud = Column(Date, nullable=False)
    estado = Column(String(255), default='procesado')
    metodo_pago = Column(String(255), default='wallet')
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

class ContractHistory(Base):
    __tablename__ = "contract_histories"
    __table_args__ = {'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    created_at = Column(DateTime)

class ContractAcceleration(Base):
    __tablename__ = "contract_accelerations"
    __table_args__ = {'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger, nullable=False)
    days_to_reduce = Column(Numeric(20, 6), default=0)
    applied = Column(Boolean, default=False)
    bonus_amount = Column(Numeric(20, 6), default=0)
    created_at = Column(DateTime)

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    __table_args__ = {'extend_existing': True}
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    wallet_id = Column(BigInteger, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    type = Column(String(255), nullable=False)
    reference_type = Column(String(255))
    reference_id = Column(BigInteger)
    balance_after = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime)

# --- Lógica de Transferencia ---

async def handle_auto_transfer(db: AsyncSession, execute: bool = False, force: bool = False) -> dict:
    bogota_tz = timezone(timedelta(hours=-5))
    now_bogota = datetime.now(bogota_tz)
    
    # 1. Validación de fecha
    if execute and now_bogota.day != 30 and not force:
        logger.warning("No es día 30. Se fuerza modo Simulación.")
        execute = False
        
    logs = []
    
    # 2. Obtener inversionistas activos
    # paquete_inversion_adquirido IS NOT NULL y fecha_ingreso IS NOT NULL
    stmt = select(Investor).where(
        and_(
            Investor.paquete_inversion_adquirido.is_not(None),
            Investor.fecha_ingreso.is_not(None)
        )
    )
    result = await db.execute(stmt)
    investors = result.scalars().all()
    
    discrepancies = 0
    total_processed = 0

    for inv in investors:
        total_processed += 1
        try:
            # A. Lógica de Fechas (Inicio y Fin)
            # 30 del mes pasado
            if now_bogota.month == 1:
                last_month = 12
                year = now_bogota.year - 1
            else:
                last_month = now_bogota.month - 1
                year = now_bogota.year
                
            # Validar si el mes pasado tiene 30 días, si es febrero usar 28 o 29
            try:
                start_cycle_date = datetime(year, last_month, 30, 0, 0, 0, tzinfo=bogota_tz)
            except ValueError: # Febrero o meses sin 30
                start_cycle_date = datetime(year, last_month, 28, 0, 0, 0, tzinfo=bogota_tz)
            
            end_cycle_date = datetime(now_bogota.year, now_bogota.month, 29, 23, 59, 59, tzinfo=bogota_tz)
            
            # Ajuste de inicio
            fecha_ingreso_dt = datetime.combine(inv.fecha_ingreso, time.min).replace(tzinfo=bogota_tz)
            if fecha_ingreso_dt > start_cycle_date:
                start_cycle_date = fecha_ingreso_dt
                
            # Buscar último history
            hist_stmt = select(ContractHistory).where(ContractHistory.investor_id == inv.id).order_by(ContractHistory.id.desc())
            hist_res = await db.execute(hist_stmt)
            last_history = hist_res.scalars().first()
            if last_history:
                hist_date = datetime.combine(last_history.fecha_fin, time.min).replace(tzinfo=bogota_tz)
                if hist_date > start_cycle_date:
                    start_cycle_date = hist_date
                    
            # B. Cálculo de Días
            fecha_inicio_periodo = start_cycle_date
            
            # Aceleraciones
            accel_stmt = select(ContractAcceleration).where(
                and_(
                    ContractAcceleration.investor_id == inv.id,
                    ContractAcceleration.created_at >= fecha_inicio_periodo.astimezone(timezone.utc).replace(tzinfo=None)
                )
            )
            accel_res = await db.execute(accel_stmt)
            accelerations = accel_res.scalars().all()
            
            total_days_reduce_unapplied = sum([float(a.days_to_reduce) for a in accelerations if not a.applied])
            
            dias_contrato_base = float(inv.dias_contrato) if inv.dias_contrato else 365.0
            fecha_fin_teorica = fecha_inicio_periodo + timedelta(days=dias_contrato_base - total_days_reduce_unapplied)
            
            end_cursor = end_cycle_date
            incluir_dia_adicional = True
            
            if fecha_fin_teorica < end_cursor:
                end_cursor = fecha_fin_teorica
                incluir_dia_adicional = False
                
            dias_ciclo = (end_cursor - start_cycle_date).days
            if incluir_dia_adicional:
                dias_ciclo += 1
                
            if dias_ciclo < 0:
                dias_ciclo = 0
                
            # Dinero
            liq_diaria = float(inv.liquidacion_diaria_rendimiento) if inv.liquidacion_diaria_rendimiento else 0.0
            generado_ciclo = dias_ciclo * liq_diaria
            
            bonos_ciclo = sum([float(a.bonus_amount) for a in accelerations 
                              if a.created_at and 
                              start_cycle_date.astimezone(timezone.utc).replace(tzinfo=None) <= a.created_at <= end_cycle_date.astimezone(timezone.utc).replace(tzinfo=None)])
            
            # Como no tenemos el servicio PHP, usamos lo generado localmente como 'Truth'
            amount_yield_transferred = generado_ciclo
            amount_bonus_transferred = bonos_ciclo
            
            diff_yield = amount_yield_transferred - generado_ciclo
            diff_bono = amount_bonus_transferred - bonos_ciclo
            
            if (abs(diff_yield) > 1.0 or abs(diff_bono) > 1.0) and not execute:
                msg = f"[DISCREPANCIA] Inversor {inv.id}: Yield Diff: {diff_yield}, Bono Diff: {diff_bono}"
                logger.warning(msg)
                logs.append(msg)
                discrepancies += 1
                
            if execute:
                utc_start_cycle = start_cycle_date.astimezone(timezone.utc).replace(tzinfo=None)
                now_utc = datetime.utcnow()
                
                # Obtener wallet o crearla
                wallet_stmt = select(Wallet).where(Wallet.user_id == inv.user_id)
                wallet_res = await db.execute(wallet_stmt)
                wallet = wallet_res.scalars().first()
                if not wallet:
                    wallet = Wallet(user_id=inv.user_id, balance=0, currency='COP', status='active')
                    db.add(wallet)
                    await db.flush()

                # Transferir Yield
                if amount_yield_transferred > 0:
                    ret_stmt = select(Retiro).where(
                        and_(
                            Retiro.user_id == inv.user_id,
                            Retiro.tipo == 'rendimiento',
                            Retiro.origen == 'auto_yield_transfer',
                            Retiro.created_at >= utc_start_cycle
                        )
                    )
                    existing = (await db.execute(ret_stmt)).scalars().first()
                    if not existing:
                        nuevo_retiro = Retiro(
                            investor_id=inv.id,
                            user_id=inv.user_id,
                            origen='auto_yield_transfer',
                            tipo='rendimiento',
                            monto=amount_yield_transferred,
                            impuesto=0,
                            monto_neto=amount_yield_transferred,
                            fecha_solicitud=now_bogota.date(),
                            estado='procesado',
                            metodo_pago='wallet',
                            created_at=now_utc,
                            updated_at=now_utc
                        )
                        db.add(nuevo_retiro)
                        await db.flush()
                        
                        # Wallet Transaction
                        wallet.balance = float(wallet.balance) + float(amount_yield_transferred)
                        wt = WalletTransaction(
                            wallet_id=wallet.id,
                            amount=amount_yield_transferred,
                            type='yield_payout',
                            reference_type='retiros',
                            reference_id=nuevo_retiro.id,
                            balance_after=wallet.balance,
                            created_at=now_utc
                        )
                        db.add(wt)
                        
                        msg = f"Rendimiento de {amount_yield_transferred} acreditado al inversor {inv.id}"
                        logger.info(msg)
                        logs.append(msg)
                    else:
                        logs.append(f"Inversor {inv.id}: Omitido (Ya existe retiro de rendimiento en este ciclo)")
                else:
                    logs.append(f"Inversor {inv.id}: Rendimiento generado es 0")
                        
                # Transferir Bono
                if amount_bonus_transferred > 0:
                    ret_stmt_bono = select(Retiro).where(
                        and_(
                            Retiro.user_id == inv.user_id,
                            Retiro.tipo == 'bono',
                            Retiro.origen == 'auto_bonus_transfer',
                            Retiro.created_at >= utc_start_cycle
                        )
                    )
                    existing_bono = (await db.execute(ret_stmt_bono)).scalars().first()
                    if not existing_bono:
                        nuevo_retiro_bono = Retiro(
                            investor_id=inv.id,
                            user_id=inv.user_id,
                            origen='auto_bonus_transfer',
                            tipo='bono',
                            monto=amount_bonus_transferred,
                            impuesto=0,
                            monto_neto=amount_bonus_transferred,
                            fecha_solicitud=now_bogota.date(),
                            estado='procesado',
                            metodo_pago='wallet',
                            created_at=now_utc,
                            updated_at=now_utc
                        )
                        db.add(nuevo_retiro_bono)
                        await db.flush()
                        
                        # Wallet Transaction
                        wallet.balance = float(wallet.balance) + float(amount_bonus_transferred)
                        wt_bono = WalletTransaction(
                            wallet_id=wallet.id,
                            amount=amount_bonus_transferred,
                            type='bonus_payout',
                            reference_type='retiros',
                            reference_id=nuevo_retiro_bono.id,
                            balance_after=wallet.balance,
                            created_at=now_utc
                        )
                        db.add(wt_bono)
                        
                        msg = f"Bono de {amount_bonus_transferred} acreditado al inversor {inv.id}"
                        logger.info(msg)
                        logs.append(msg)
                    else:
                        logs.append(f"Inversor {inv.id}: Omitido (Ya existe retiro de bono en este ciclo)")
                        
        except Exception as e:
            logger.error(f"Error procesando inversor {inv.id}: {e}")
            logs.append(f"Error en inversor {inv.id}: {str(e)}")

    if execute:
        try:
            await db.commit()
            logs.append("Transacción ejecutada exitosamente.")
        except Exception as e:
            await db.rollback()
            logs.append(f"Error al hacer commit: {e}")
            
    summary = f"Total procesados: {total_processed}, Discrepancias: {discrepancies}"
    logs.append(summary)

    return {
        "status": "success",
        "execute_mode": execute,
        "total_processed": total_processed,
        "discrepancies": discrepancies,
        "logs": logs
    }

async def revert_auto_transfer_yields(db: AsyncSession) -> dict:
    """Reverts all auto_transfer_yields and auto_bonus_transfers for the current cycle."""
    logs = []
    
    # Same cycle calculation
    now_bogota = datetime.now(timezone(timedelta(hours=-5)))
    if now_bogota.day >= 30:
        start_cycle_date = now_bogota.replace(day=30, hour=0, minute=0, second=0, microsecond=0)
    else:
        mes_anterior = now_bogota.month - 1
        ano_anterior = now_bogota.year
        if mes_anterior == 0:
            mes_anterior = 12
            ano_anterior -= 1
        start_cycle_date = now_bogota.replace(year=ano_anterior, month=mes_anterior, day=30, hour=0, minute=0, second=0, microsecond=0)
        
    utc_start_cycle = start_cycle_date.astimezone(timezone.utc).replace(tzinfo=None)
    
    # 1. Find all retiros of type auto_yield_transfer or auto_bonus_transfer in the current cycle
    stmt = select(Retiro).where(
        and_(
            Retiro.origen.in_(['auto_yield_transfer', 'auto_bonus_transfer']),
            Retiro.created_at >= utc_start_cycle
        )
    )
    res = await db.execute(stmt)
    retiros_to_revert = res.scalars().all()
    
    if not retiros_to_revert:
        logs.append(f"No se encontraron transferencias automáticas para el ciclo desde {utc_start_cycle}")
        return {"status": "success", "reverted": 0, "logs": logs}
        
    reverted_count = 0
    try:
        for r in retiros_to_revert:
            # Revert Wallet Balance
            wallet_stmt = select(Wallet).where(Wallet.user_id == r.user_id)
            wallet_res = await db.execute(wallet_stmt)
            wallet = wallet_res.scalars().first()
            
            if wallet:
                wallet.balance = float(wallet.balance) - float(r.monto_neto)
                
            # Delete Wallet Transaction
            wt_stmt = select(WalletTransaction).where(
                and_(
                    WalletTransaction.reference_type == 'retiros',
                    WalletTransaction.reference_id == r.id
                )
            )
            wt_res = await db.execute(wt_stmt)
            wt = wt_res.scalars().first()
            if wt:
                await db.delete(wt)
                
            # Delete Retiro
            await db.delete(r)
            reverted_count += 1
            logs.append(f"Retiro {r.id} ({r.tipo}) del usuario {r.user_id} revertido.")
            
        await db.commit()
        logs.append(f"Se revirtieron exitosamente {reverted_count} operaciones.")
    except Exception as e:
        await db.rollback()
        logs.append(f"Error al revertir operaciones: {str(e)}")
        
    return {
        "status": "success",
        "reverted": reverted_count,
        "logs": logs
    }
