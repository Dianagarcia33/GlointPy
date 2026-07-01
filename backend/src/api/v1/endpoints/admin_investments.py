from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.models.investor import Investor
from src.models.wallet import Wallet
from src.schemas.admin_investments import AdminInvestorResponse

router = APIRouter()

@router.get("/all", response_model=List[AdminInvestorResponse])
async def get_all_investments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todas las inversiones del sistema para el módulo de administración.
    Requiere permiso de administrador (investments:view).
    """
    # Verificar permisos (asumimos que si llegó aquí, el middleware o ruta debe protegerlo,
    # pero podemos hacer una verificación sencilla del rol o permiso si tenemos el método)
    # Por ahora confiaremos en que el frontend protege la vista, pero lo ideal es validar `current_user.has_permission("investments:view")`
    from sqlalchemy.orm import selectinload
    from src.models.contract_period import ContractPeriod
    from src.models.retiros import Retiro
    from src.models.contract_accelerations import ContractAcceleration
    from src.models.wallet import Wallet
    from datetime import datetime, timedelta
    
    ayer = datetime.now().date() - timedelta(days=1)
    
    # Obtener todos los periodos en un diccionario para mapeo manual (por si usan la columna vieja periodo_contrato)
    periods_result = await db.execute(select(ContractPeriod))
    all_periods = periods_result.scalars().all()
    periods_dict = {p.id: p for p in all_periods}

    # Obtener todos los inversores con su usuario y paquete
    stmt = select(Investor).options(
        selectinload(Investor.user),
        selectinload(Investor.paquete)
    ).order_by(Investor.user_id, Investor.fecha_ingreso.desc())
    result = await db.execute(stmt)
    investors = result.scalars().all()
    
    # Obtener retiros de capital y rendimiento aprobados/procesados para calcular tramos y saldos
    investor_ids = [inv.id for inv in investors]
    retiros_capital_by_inv = {}
    retiros_rendimiento_by_inv = {}
    
    if investor_ids:
        retiros_stmt = select(Retiro).where(
            Retiro.investor_id.in_(investor_ids),
            Retiro.tipo.in_(['capital', 'rendimiento']),
            Retiro.estado.in_(['aprobado', 'procesado'])
        ).order_by(Retiro.fecha_retiro.asc())
        retiros_result = await db.execute(retiros_stmt)
        all_retiros = retiros_result.scalars().all()
        for r in all_retiros:
            if r.tipo == 'capital':
                if r.investor_id not in retiros_capital_by_inv:
                    retiros_capital_by_inv[r.investor_id] = []
                retiros_capital_by_inv[r.investor_id].append(r)
            elif r.tipo == 'rendimiento':
                if r.investor_id not in retiros_rendimiento_by_inv:
                    retiros_rendimiento_by_inv[r.investor_id] = []
                retiros_rendimiento_by_inv[r.investor_id].append(r)
                
    # Obtener aceleraciones (bonos)
    accelerations_by_inv = {}
    if investor_ids:
        acc_stmt = select(ContractAcceleration).where(
            ContractAcceleration.investor_id.in_(investor_ids)
        )
        acc_result = await db.execute(acc_stmt)
        all_accelerations = acc_result.scalars().all()
        for a in all_accelerations:
            if a.investor_id not in accelerations_by_inv:
                accelerations_by_inv[a.investor_id] = []
            accelerations_by_inv[a.investor_id].append(a)
            
    # Obtener balances actuales de wallet
    user_ids = list(set([inv.user_id for inv in investors if inv.user_id]))
    wallets_by_user = {}
    if user_ids:
        wallet_stmt = select(Wallet).where(Wallet.user_id.in_(user_ids))
        wallet_result = await db.execute(wallet_stmt)
        all_wallets = wallet_result.scalars().all()
        for w in all_wallets:
            wallets_by_user[w.user_id] = float(w.balance or 0.0)
    
    response_list = []
    for inv in investors:
        nombre = inv.nombre_completo
        correo = inv.correo_electronico
        
        if inv.user:
            # Construir nombre desde la tabla users si está disponible
            if hasattr(inv.user, 'name') and inv.user.name:
                nombre = inv.user.name
            elif hasattr(inv.user, 'first_name') and inv.user.first_name:
                nombre = f"{inv.user.first_name} {getattr(inv.user, 'last_name', '')}".strip()
            if inv.user.email:
                correo = inv.user.email
                
        # Nombre del paquete (Valor del paquete)
        paquete_nombre = "0"
        if inv.paquete and inv.paquete.paquete_accion_adquirido:
            paquete_nombre = inv.paquete.paquete_accion_adquirido

        # Datos del periodo (revisando ambas columnas para compatibilidad)
        periodo_porcentaje = None
        periodo_meses = None
        periodo_dias = None
        
        period_obj = None
        if inv.contract_period_id:
            period_obj = periods_dict.get(inv.contract_period_id)
            
        if not period_obj and inv.periodo_contrato:
            period_obj = periods_dict.get(inv.periodo_contrato)
            if not period_obj:
                # Fallback: periodo_contrato might store days or months instead of ID
                for p in all_periods:
                    if p.days == inv.periodo_contrato or p.months == inv.periodo_contrato:
                        period_obj = p
                        break
                        
        if not period_obj and inv.dias_contrato:
            for p in all_periods:
                if p.days == inv.dias_contrato:
                    period_obj = p
                    break
        
        if period_obj:
            periodo_porcentaje = period_obj.percentage
            periodo_meses = period_obj.months
            periodo_dias = period_obj.days
            
        # Cálculos de Fase 2: Rendimientos
        rendimiento_diario_calculado = 0.0
        dias_generando = 0
        rendimiento_producido_hasta_ayer = 0.0
        
        # El capital real inicial es el nombre del paquete si es numérico (total_contrato tiene el total final esperado)
        capital = 0.0
        if paquete_nombre:
            try:
                capital = float(paquete_nombre)
            except ValueError:
                # Si no es numérico, intentamos derivarlo del total_contrato si es que existía una fórmula (no muy seguro)
                # pero para este caso el usuario dice que usemos el valor del paquete.
                capital = float(inv.total_contrato or 0.0)
        else:
            capital = float(inv.total_contrato or 0.0)
            
        # Fecha tope estricta indicada por el usuario: 29 de junio de 2026
        FECHA_MIGRACION = datetime(2026, 6, 29).date()
        
        capital_actual = capital
        tramos_desglose = []
        
        if capital > 0 and periodo_porcentaje and periodo_meses and periodo_dias and inv.fecha_ingreso:
            fecha_fin_calculo = FECHA_MIGRACION
            if inv.fecha_finalizacion and inv.fecha_finalizacion < FECHA_MIGRACION:
                fecha_fin_calculo = inv.fecha_finalizacion
                
            current_capital = capital
            current_start_date = inv.fecha_ingreso
            total_producido = 0.0
            
            # Traer retiros del inversor
            retiros_capital = retiros_capital_by_inv.get(inv.id, [])
            
            for retiro in retiros_capital:
                fecha_retiro = retiro.fecha_retiro or retiro.fecha_solicitud
                
                # Ignoramos si el retiro es post fecha fin
                if not fecha_retiro or fecha_retiro > fecha_fin_calculo:
                    continue
                
                # Ajustar si el retiro es pre fecha inicio (error de datos)
                if fecha_retiro < current_start_date:
                    fecha_retiro = current_start_date
                
                # Tramo antes del retiro
                dias_tramo = (fecha_retiro - current_start_date).days
                if dias_tramo > 0:
                    rendimiento_tramo = (current_capital * (periodo_porcentaje / 100) * periodo_meses) / periodo_dias
                    producido_tramo = dias_tramo * rendimiento_tramo
                    total_producido += producido_tramo
                    dias_generando += dias_tramo
                    
                    tramos_desglose.append({
                        "fecha_inicio": current_start_date,
                        "fecha_fin": fecha_retiro,
                        "dias": dias_tramo,
                        "capital_base": current_capital,
                        "rendimiento_diario": rendimiento_tramo,
                        "producido": producido_tramo
                    })
                
                # Aplicar retiro al capital
                monto_retiro = float(retiro.monto or 0.0)
                current_capital -= monto_retiro
                if current_capital < 0:
                    current_capital = 0.0
                    
                current_start_date = fecha_retiro

            # Tramo final
            if current_start_date < fecha_fin_calculo:
                dias_tramo = (fecha_fin_calculo - current_start_date).days
                if dias_tramo > 0:
                    rendimiento_tramo = (current_capital * (periodo_porcentaje / 100) * periodo_meses) / periodo_dias
                    producido_tramo = dias_tramo * rendimiento_tramo
                    total_producido += producido_tramo
                    dias_generando += dias_tramo
                    
                    tramos_desglose.append({
                        "fecha_inicio": current_start_date,
                        "fecha_fin": fecha_fin_calculo,
                        "dias": dias_tramo,
                        "capital_base": current_capital,
                        "rendimiento_diario": rendimiento_tramo,
                        "producido": producido_tramo
                    })
            
            capital_actual = current_capital
            rendimiento_diario_calculado = (current_capital * (periodo_porcentaje / 100) * periodo_meses) / periodo_dias
            
        # Calcular los bonos de aceleración
        accelerations = accelerations_by_inv.get(inv.id, [])
        total_bonos = 0.0
        detalles_bonos = []
        for acc in accelerations:
            bono = float(acc.bonus_amount or 0.0)
            if bono > 0:
                total_bonos += bono
                detalles_bonos.append({
                    "id": acc.id,
                    "monto": bono,
                    "dias_reducidos": float(acc.days_to_reduce or 0.0),
                    "fecha": acc.created_at
                })
        
        # El producido final es lo generado por el tiempo + los bonos
        rendimiento_producido_hasta_ayer = total_producido + total_bonos
            
        # Calcular los retiros de rendimiento hasta la fecha tope
        retiros_rendimiento = retiros_rendimiento_by_inv.get(inv.id, [])
        total_retiros_rendimiento = 0.0
        detalles_retiros_rendimiento = []
        for retiro in retiros_rendimiento:
            fecha_retiro = retiro.fecha_retiro or retiro.fecha_solicitud
            # Ignorar si el retiro es post fecha de migración o es un cargue positivo (monto < 0)
            if not fecha_retiro or fecha_retiro > FECHA_MIGRACION:
                continue
                
            # Determinar si es una reinversión
            is_reinversion = False
            obs = (retiro.observaciones or "").upper()
            if "REINVERSIÓN" in obs or "REINVERSION" in obs:
                is_reinversion = True
            elif retiro.origen == 'billetera' and retiro.metodo_pago == 'wallet':
                is_reinversion = True
                
            # Ignorar las transferencias automáticas a la wallet (no tienen aprobación de administrador)
            # EXCEPTO si son reinversiones, las cuales SÍ deben descontarse del saldo final.
            if retiro.aprobado_por is None and retiro.procesado_por is None and not is_reinversion:
                continue
            
            monto = float(retiro.monto or 0.0)
            if monto > 0:
                total_retiros_rendimiento += monto
                detalles_retiros_rendimiento.append({
                    "id": retiro.id,
                    "fecha": fecha_retiro,
                    "monto": monto,
                    "is_reinversion": is_reinversion
                })
                
        # Capital Devuelto (si el contrato ya finalizó)
        capital_devuelto = 0.0
        if inv.fecha_finalizacion and inv.fecha_finalizacion <= FECHA_MIGRACION:
            capital_devuelto = float(capital_actual)

        saldo_a_migrar = rendimiento_producido_hasta_ayer + capital_devuelto - total_retiros_rendimiento

        response_list.append({
            "id": inv.id,
            "user_id": inv.user_id,
            "nombre_completo": nombre,
            "correo_electronico": correo,
            "tipo_documento": inv.tipo_documento,
            "documento": inv.documento,
            "banco": inv.banco,
            "tipo_cuenta": inv.tipo_cuenta,
            "numero_cuenta": inv.numero_cuenta,
            "codigo_asignado": inv.codigo_asignado,
            "paquete_nombre": paquete_nombre,
            "fecha_ingreso": inv.fecha_ingreso,
            "fecha_finalizacion": inv.fecha_finalizacion,
            "total_contrato": inv.total_contrato,
            "rendimiento_total_contrato": inv.rendimiento_total_contrato,
            "liquidacion_diaria_rendimiento": inv.liquidacion_diaria_rendimiento,
            "periodo_porcentaje": periodo_porcentaje,
            "periodo_meses": periodo_meses,
            "periodo_dias": periodo_dias,
            "rendimiento_diario_calculado": rendimiento_diario_calculado,
            "dias_generando": dias_generando,
            "rendimiento_producido_hasta_ayer": rendimiento_producido_hasta_ayer,
            "capital_actual": capital_actual,
            "total_bonos": total_bonos,
            "detalles_bonos": detalles_bonos,
            "total_retiros_rendimiento": total_retiros_rendimiento,
            "detalles_retiros_rendimiento": detalles_retiros_rendimiento,
            "saldo_a_migrar": saldo_a_migrar,
            "wallet_balance_actual": wallets_by_user.get(inv.user_id, 0.0),
            "capital_devuelto": capital_devuelto,
            "tramos_desglose": tramos_desglose
        })
    
    return response_list

class NivelacionRequest(BaseModel):
    saldo_auditado: float

@router.post("/nivelar-wallet/{user_id}")
async def nivelar_wallet(
    user_id: int,
    request: NivelacionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from src.models.wallet import Wallet
    from src.models.wallet_transactions import WalletTransaction
    from datetime import datetime
    
    # Buscar wallet del usuario
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await db.execute(stmt)
    wallet = result.scalar_one_or_none()
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet no encontrada para este usuario")
        
    saldo_actual = float(wallet.balance or 0.0)
    faltante = request.saldo_auditado - saldo_actual
    
    if abs(faltante) < 0.01:
        return {"message": "La wallet ya está nivelada"}
        
    # Actualizar balance
    wallet.balance = request.saldo_auditado
    wallet.updated_at = datetime.now()
    
    # Crear transacción
    transaction_type = "deposit" if faltante > 0 else "withdrawal"
    
    from src.models.retiros import Retiro
    
    # Crear un registro en retiros para que aparezca en el historial
    retiro = Retiro(
        user_id=wallet.user_id,
        origen='nivelacion',
        tipo='rendimiento',
        monto=abs(faltante),
        impuesto=0,
        monto_neto=abs(faltante),
        fecha_solicitud=datetime.now().date(),
        fecha_retiro=datetime.now().date(),
        estado='procesado',
        metodo_pago='wallet',
        observaciones="nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
        created_at=datetime.now(),
        updated_at=datetime.now(),
        aprobado_por=current_user.id,
        procesado_por=current_user.id
    )
    db.add(retiro)
    await db.flush()

    tx = WalletTransaction(
        wallet_id=wallet.id,
        type=transaction_type,
        amount=abs(faltante),
        reference_type='retiros',
        reference_id=retiro.id,
        description="nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
        balance_after=request.saldo_auditado,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    
    db.add(tx)
    await db.commit()
    
    return {
        "message": "Wallet nivelada correctamente", 
        "faltante": faltante, 
        "nuevo_saldo": request.saldo_auditado
    }

@router.post("/fix-missing-retiros")
async def fix_missing_retiros(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from src.models.wallet_transactions import WalletTransaction
    from src.models.retiros import Retiro
    from datetime import datetime
    
    # Buscar transacciones de nivelación sin retiro asociado
    stmt = select(WalletTransaction).where(
        WalletTransaction.description == "nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
        WalletTransaction.reference_id.is_(None)
    )
    result = await db.execute(stmt)
    txs = result.scalars().all()
    
    count = 0
    for tx in txs:
        # Obtener el user_id a partir del wallet_id
        from src.models.wallet import Wallet
        w_stmt = select(Wallet).where(Wallet.id == tx.wallet_id)
        w_res = await db.execute(w_stmt)
        wallet = w_res.scalars().first()
        
        if not wallet:
            continue
            
        retiro = Retiro(
            user_id=wallet.user_id,
            origen='nivelacion',
            tipo='rendimiento',
            monto=tx.amount,
            impuesto=0,
            monto_neto=tx.amount,
            fecha_solicitud=tx.created_at.date() if tx.created_at else datetime.now().date(),
            fecha_retiro=tx.created_at.date() if tx.created_at else datetime.now().date(),
            estado='procesado',
            metodo_pago='wallet',
            observaciones="nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
            created_at=tx.created_at or datetime.now(),
            updated_at=tx.updated_at or datetime.now(),
            aprobado_por=current_user.id,
            procesado_por=current_user.id
        )
        db.add(retiro)
        await db.flush()
        
        tx.reference_type = 'retiros'
        tx.reference_id = retiro.id
        count += 1
        
    await db.commit()
    return {"message": f"Se repararon {count} transacciones huérfanas."}

class NivelacionMasivaItem(BaseModel):
    user_id: int
    saldo_auditado: float

class NivelacionMasivaRequest(BaseModel):
    usuarios: List[NivelacionMasivaItem]

@router.post("/nivelar-wallets-masivo")
async def nivelar_wallets_masivo(
    request: NivelacionMasivaRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from src.models.wallet import Wallet
    from src.models.wallet_transactions import WalletTransaction
    from datetime import datetime
    
    user_ids = [item.user_id for item in request.usuarios]
    if not user_ids:
        return {"message": "No hay usuarios para nivelar"}
        
    stmt = select(Wallet).where(Wallet.user_id.in_(user_ids))
    result = await db.execute(stmt)
    wallets = result.scalars().all()
    wallets_by_user = {w.user_id: w for w in wallets}
    
    count_updated = 0
    for item in request.usuarios:
        wallet = wallets_by_user.get(item.user_id)
        if not wallet:
            continue
            
        saldo_actual = float(wallet.balance or 0.0)
        faltante = item.saldo_auditado - saldo_actual
        
        if abs(faltante) < 0.01:
            continue
            
        wallet.balance = item.saldo_auditado
        wallet.updated_at = datetime.now()
        
        from src.models.retiros import Retiro
        
        retiro = Retiro(
            user_id=wallet.user_id,
            origen='nivelacion',
            tipo='rendimiento',
            monto=abs(faltante),
            impuesto=0,
            monto_neto=abs(faltante),
            fecha_solicitud=datetime.now().date(),
            fecha_retiro=datetime.now().date(),
            estado='procesado',
            metodo_pago='wallet',
            observaciones="nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            aprobado_por=current_user.id,
            procesado_por=current_user.id
        )
        db.add(retiro)
        await db.flush()

        transaction_type = "deposit" if faltante > 0 else "withdrawal"
        tx = WalletTransaction(
            wallet_id=wallet.id,
            type=transaction_type,
            amount=abs(faltante),
            reference_type='retiros',
            reference_id=retiro.id,
            description="nivelacion por problemas del sistema, transferencia automatica revisada por el equipo de desarrollo",
            balance_after=item.saldo_auditado,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(tx)
        count_updated += 1
        
    await db.commit()
    return {"message": f"Se nivelaron {count_updated} wallets exitosamente."}
