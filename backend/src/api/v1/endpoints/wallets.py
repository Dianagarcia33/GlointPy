from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
import traceback

from src.core.database import get_db
from src.models.user import User
from src.models.wallet import Wallet
from src.models.wallet_transactions import WalletTransaction
from src.api.dependencies.auth_deps import get_current_user

router = APIRouter()

class WithdrawalRequest(BaseModel):
    monto: float = Field(..., gt=0)

@router.get("/me/balance")
async def get_my_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el balance y la información bancaria del usuario."""
    from src.models.investor import Investor
    try:
        # Balance
        result = await db.execute(
            select(func.sum(Wallet.balance))
            .where(Wallet.user_id == current_user.id)
            .where(Wallet.status == 'active')
        )
        total_balance = result.scalar()
        balance = float(total_balance) if total_balance is not None else 0.0
        
        # Datos bancarios
        inv_stmt = select(Investor).where(
            Investor.user_id == current_user.id,
            Investor.banco != None,
            Investor.numero_cuenta != None
        ).order_by(Investor.id.desc())
        inv_res = await db.execute(inv_stmt)
        investor = inv_res.scalars().first()
        
        bank_details = None
        if investor:
            bank_details = {
                "banco": investor.banco,
                "tipo_cuenta": investor.tipo_cuenta,
                "numero_cuenta": investor.numero_cuenta
            }
        
        return {
            "balance": balance,
            "currency": "COP",
            "bank_details": bank_details
        }
    except Exception as e:
        import traceback
        print("ERROR EN WALLETS:", traceback.format_exc())
        return {
            "balance": 0.0,
            "currency": str(e)
        }

@router.get("/me/movements")
async def get_my_movements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el historial de movimientos de la billetera desde la tabla retiros."""
    from src.models.retiros import Retiro
    try:
        from src.models.wallet_transactions import WalletTransaction
        
        stmt = (
            select(Retiro, WalletTransaction)
            .outerjoin(
                WalletTransaction,
                and_(
                    WalletTransaction.reference_id == Retiro.id,
                    WalletTransaction.reference_type.in_(['retiros', 'App\\Models\\Retiro'])
                )
            )
            .where(Retiro.user_id == current_user.id)
            .order_by(Retiro.created_at.desc())
        )
        result = await db.execute(stmt)
        
        movements = []
        for m, wt in result.all():
            saldo_nuevo = float(wt.balance_after) if wt and wt.balance_after else None
            saldo_anterior = None
            if wt and wt.amount is not None and wt.balance_after is not None:
                # Determinar si fue ingreso o egreso basado en type o método de pago
                metodo_pago_norm = m.metodo_pago.lower() if m.metodo_pago else ""
                origen_norm = m.origen.lower() if m.origen else ""
                
                is_ingreso = False
                if wt.type in ['yield_payout', 'bonus_payout', 'deposit']:
                    is_ingreso = True
                elif origen_norm in ['generacion_rendimiento', 'bono', 'cash', 'auto_yield_transfer', 'auto_bonus_transfer'] or metodo_pago_norm == 'wallet':
                    is_ingreso = True
                
                if is_ingreso:
                    saldo_anterior = float(wt.balance_after) - float(wt.amount)
                else:
                    saldo_anterior = float(wt.balance_after) + float(wt.amount)
            
            movements.append({
                "id": m.id,
                "investor_id": m.investor_id,
                "user_id": m.user_id,
                "origen": m.origen,
                "tipo": m.tipo,
                "monto": float(m.monto) if m.monto else 0,
                "impuesto": float(m.impuesto) if m.impuesto else 0,
                "monto_neto": float(m.monto_neto) if m.monto_neto else 0,
                "fecha_solicitud": m.fecha_solicitud.isoformat() if m.fecha_solicitud else None,
                "fecha_retiro": m.fecha_retiro.isoformat() if m.fecha_retiro else None,
                "estado": m.estado,
                "metodo_pago": m.metodo_pago,
                "banco": m.banco,
                "tipo_cuenta": m.tipo_cuenta,
                "numero_cuenta": m.numero_cuenta,
                "observaciones": m.observaciones,
                "motivo_rechazo": m.motivo_rechazo,
                "fecha_aprobacion": m.fecha_aprobacion.isoformat() if m.fecha_aprobacion else None,
                "fecha_procesamiento": m.fecha_procesamiento.isoformat() if m.fecha_procesamiento else None,
                "created_at": m.created_at.isoformat() if m.created_at else None,
                "updated_at": m.updated_at.isoformat() if m.updated_at else None,
                "saldo_anterior": saldo_anterior,
                "saldo_nuevo": saldo_nuevo
            })
            
        return movements
    except Exception as e:
        print("ERROR EN MOVIMIENTOS:", traceback.format_exc())
        return []

@router.post("/me/withdraw")
async def request_withdrawal(
    request: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una solicitud de retiro, calcula impuestos y descuenta de la billetera."""
    from src.models.retiros import Retiro
    
    try:
        # 1. Obtener la billetera activa del usuario
        wallet_stmt = select(Wallet).where(
            Wallet.user_id == current_user.id,
            Wallet.status == 'active'
        )
        wallet_res = await db.execute(wallet_stmt)
        wallet = wallet_res.scalars().first()
        
        if not wallet:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Billetera no encontrada o inactiva."
            )
            
        # 2. Validar saldo
        monto_solicitado = Decimal(str(request.monto))
        saldo_actual = Decimal(str(wallet.balance))
        
        if saldo_actual < monto_solicitado:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Saldo insuficiente para realizar el retiro."
            )
            
        # 3. Obtener datos bancarios
        from src.models.investor import Investor
        inv_stmt = select(Investor).where(
            Investor.user_id == current_user.id,
            Investor.banco != None,
            Investor.numero_cuenta != None
        ).order_by(Investor.id.desc())
        inv_res = await db.execute(inv_stmt)
        investor = inv_res.scalars().first()
        
        if not investor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No tienes información bancaria registrada. Por favor contacta a soporte."
            )
            
        # 4. Calcular impuesto (3.2%) y monto neto
        impuesto = monto_solicitado * Decimal('0.032')
        monto_neto = monto_solicitado - impuesto
        
        now_utc = datetime.utcnow()
        
        # 5. Crear el Retiro (pendiente)
        nuevo_retiro = Retiro(
            investor_id=investor.id,
            user_id=current_user.id,
            origen='retiro_wallet',
            tipo='rendimiento', # O genérico
            monto=monto_solicitado,
            impuesto=impuesto,
            monto_neto=monto_neto,
            fecha_solicitud=now_utc.date(),
            estado='pendiente',
            metodo_pago='transferencia_bancaria',
            banco=investor.banco,
            tipo_cuenta=investor.tipo_cuenta,
            numero_cuenta=investor.numero_cuenta,
            created_at=now_utc,
            updated_at=now_utc
        )
        db.add(nuevo_retiro)
        await db.flush() # Para obtener el ID
        
        # 6. Descontar saldo de la billetera
        wallet.balance = saldo_actual - monto_solicitado
        db.add(wallet)
        
        # 7. Registrar en WalletTransaction
        wt = WalletTransaction(
            wallet_id=wallet.id,
            amount=monto_solicitado,
            type='withdrawal_request',
            reference_type='retiros',
            reference_id=nuevo_retiro.id,
            balance_after=wallet.balance,
            created_at=now_utc
        )
        db.add(wt)
        
        await db.commit()
        
        return {
            "status": "success",
            "message": "Retiro solicitado correctamente",
            "retiro_id": nuevo_retiro.id,
            "monto": float(monto_solicitado),
            "impuesto": float(impuesto),
            "monto_neto": float(monto_neto)
        }
        
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        print("ERROR EN RETIRO:", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar el retiro."
        )
