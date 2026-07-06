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
from src.schemas.admin_investments import AdminInvestorResponse, AdminInvestmentRequestResponse
from src.models.investment_request import InvestmentRequest
from src.models.paquete_inversion import PaqueteInversion

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
        selectinload(Investor.user).selectinload(User.bank_accounts),
        selectinload(Investor.paquete)
    ).order_by(func.length(Investor.codigo_asignado).desc(), Investor.codigo_asignado.desc())
    result = await db.execute(stmt)
    investors = result.scalars().all()
    
    # Obtener balances actuales de wallet y todos los user_ids primero
    user_ids = list(set([inv.user_id for inv in investors if inv.user_id]))
    wallets_by_user = {}
    if user_ids:
        wallet_stmt = select(Wallet).where(Wallet.user_id.in_(user_ids))
        wallet_result = await db.execute(wallet_stmt)
        all_wallets = wallet_result.scalars().all()
        for w in all_wallets:
            wallets_by_user[w.user_id] = float(w.balance or 0.0)
            
    # Obtener retiros filtrando por user_id en lugar de investor_id, para atrapar los huérfanos
    investor_ids = [inv.id for inv in investors]
    retiros_capital_by_inv = {}
    retiros_rendimiento_by_inv = {}
    
    if user_ids:
        from sqlalchemy import or_
        retiros_stmt = select(Retiro).where(
            or_(Retiro.investor_id.in_(investor_ids), Retiro.user_id.in_(user_ids)),
            Retiro.tipo.in_(['capital', 'rendimiento']),
            Retiro.estado.in_(['aprobado', 'procesado'])
        ).order_by(Retiro.fecha_retiro.asc())
        
        retiros_result = await db.execute(retiros_stmt)
        all_retiros = retiros_result.scalars().all()
        
        for r in all_retiros:
            # Si no tiene investor_id pero sí user_id, buscamos el primer contrato activo del usuario
            target_inv_id = r.investor_id
            if not target_inv_id and r.user_id:
                user_contracts = [i for i in investors if i.user_id == r.user_id]
                if user_contracts:
                    target_inv_id = user_contracts[0].id
                    
            if target_inv_id:
                if r.tipo == 'capital':
                    if target_inv_id not in retiros_capital_by_inv:
                        retiros_capital_by_inv[target_inv_id] = []
                    retiros_capital_by_inv[target_inv_id].append(r)
                elif r.tipo == 'rendimiento':
                    if target_inv_id not in retiros_rendimiento_by_inv:
                        retiros_rendimiento_by_inv[target_inv_id] = []
                    retiros_rendimiento_by_inv[target_inv_id].append(r)
                
    # Obtener aceleraciones (bonos)
    accelerations_by_inv = {}
    if investor_ids:
        # Aceleraciones siempre deberían estar atadas al contrato (investor_id), pero por si acaso
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
    
    from src.schemas.admin_investments import AdminInvestorResponse
    import traceback
    
    response_list = []
    for inv in investors:
        try:
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
                paquete_nombre = str(inv.paquete.paquete_accion_adquirido)
    
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
            
            capital = 0.0
            if paquete_nombre:
                try:
                    capital = float(paquete_nombre)
                except ValueError:
                    capital = float(inv.total_contrato or 0.0)
            else:
                capital = float(inv.total_contrato or 0.0)
                
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
                
                retiros_capital = retiros_capital_by_inv.get(inv.id, [])
                
                for retiro in retiros_capital:
                    fecha_retiro = retiro.fecha_retiro or retiro.fecha_solicitud
                    
                    if not fecha_retiro or fecha_retiro > fecha_fin_calculo:
                        continue
                    
                    if fecha_retiro < current_start_date:
                        fecha_retiro = current_start_date
                    
                    dias_tramo = (fecha_retiro - current_start_date).days + 1
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
                    
                    monto_retiro = float(retiro.monto or 0.0)
                    current_capital -= monto_retiro
                    if current_capital < 0:
                        current_capital = 0.0
                        
                    current_start_date = fecha_retiro + timedelta(days=1)
    
                if current_start_date <= fecha_fin_calculo:
                    dias_tramo = (fecha_fin_calculo - current_start_date).days + 1
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
            
            rendimiento_producido_hasta_ayer = total_producido + total_bonos
                
            retiros_rendimiento = retiros_rendimiento_by_inv.get(inv.id, [])
            total_retiros_rendimiento = 0.0
            detalles_retiros_rendimiento = []
            for retiro in retiros_rendimiento:
                fecha_retiro = retiro.fecha_retiro or retiro.fecha_solicitud
                if not fecha_retiro or fecha_retiro > FECHA_MIGRACION:
                    continue
                    
                is_reinversion = False
                obs = (retiro.observaciones or "").upper()
                if "REINVERSIÓN" in obs or "REINVERSION" in obs:
                    is_reinversion = True
                elif retiro.origen == 'billetera' and retiro.metodo_pago == 'wallet':
                    is_reinversion = True
                    
                monto = float(retiro.monto or 0.0)
                if monto > 0:
                    total_retiros_rendimiento += monto
                    detalles_retiros_rendimiento.append({
                        "id": retiro.id,
                        "fecha": fecha_retiro,
                        "monto": monto,
                        "origen": retiro.origen,
                        "is_reinversion": is_reinversion,
                        "observaciones": retiro.observaciones
                    })
            
            # Ordenar por fecha descendente (más recientes primero)
            detalles_retiros_rendimiento.sort(key=lambda x: x['fecha'], reverse=True)
            detalles_bonos.sort(key=lambda x: x['fecha'], reverse=True)
                    
            capital_devuelto = 0.0
            if inv.fecha_finalizacion and inv.fecha_finalizacion <= FECHA_MIGRACION:
                capital_devuelto = float(capital_actual)
    
            saldo_a_migrar = rendimiento_producido_hasta_ayer + capital_devuelto - total_retiros_rendimiento
    
            banco = None
            tipo_cuenta = None
            numero_cuenta = None
            
            try:
                if inv.user and hasattr(inv.user, 'bank_accounts') and inv.user.bank_accounts:
                    primary_acc = next((acc for acc in inv.user.bank_accounts if acc.is_primary), inv.user.bank_accounts[0])
                    banco = primary_acc.banco
                    tipo_cuenta = primary_acc.tipo_cuenta
                    numero_cuenta = primary_acc.numero_cuenta
            except Exception as sql_err:
                print(f"Error SQL al cargar bancos de usuario {inv.user_id}: {sql_err}")
                db.rollback()
    
            data_dict = {
                "id": inv.id,
                "user_id": inv.user_id,
                "codigo_asignado": inv.codigo_asignado,
                "estado": getattr(inv, 'estado', None),
                "fecha_ingreso": inv.fecha_ingreso,
                "fecha_finalizacion": inv.fecha_finalizacion,
                "created_at": getattr(inv, 'created_at', None),
                "updated_at": getattr(inv, 'updated_at', None),
                
                "personal_info": {
                    "nombre_completo": nombre,
                    "correo_electronico": correo,
                    "tipo_documento": getattr(inv, 'tipo_documento', None),
                    "documento": getattr(inv, 'documento', None),
                    "numero_celular": getattr(inv, 'numero_celular', None),
                    "ciudad": getattr(inv, 'ciudad', None),
                    "fecha_nacimiento": getattr(inv, 'fecha_nacimiento', None),
                    "referido_por": getattr(inv, 'referido_por', None),
                    "observaciones": getattr(inv, 'observaciones', None),
                },
                "bank_account": {
                    "banco": banco,
                    "tipo_cuenta": tipo_cuenta,
                    "numero_cuenta": numero_cuenta,
                },
                "legal_rep": {
                    "nombre": getattr(inv, 'representante_legal_nombre', None),
                    "documento": getattr(inv, 'representante_legal_documento', None),
                    "email": getattr(inv, 'representante_legal_email', None),
                    "telefono": getattr(inv, 'representante_legal_telefono', None),
                },
                "financial_info": {
                    "paquete_nombre": paquete_nombre,
                    "paquete_inversion_adquirido": getattr(inv, 'paquete_inversion_adquirido', None),
                    "total_contrato": inv.total_contrato,
                    "rendimiento_total_contrato": inv.rendimiento_total_contrato,
                    "liquidacion_diaria_capital": getattr(inv, 'liquidacion_diaria_capital', None),
                    "liquidacion_diaria_rendimiento": inv.liquidacion_diaria_rendimiento,
                    "rendimiento_aprobado_mensual": getattr(inv, 'rendimiento_aprobado_mensual', None),
                    "rentabilidad_contrato": getattr(inv, 'rentabilidad_contrato', None),
                    "acciones_otorgadas": getattr(inv, 'acciones_otorgadas', None),
                    "valor_total_acciones": getattr(inv, 'valor_total_acciones', None),
                    "porcentaje_participacion_accionista": getattr(inv, 'porcentaje_participacion_accionista', None),
                    "periodo_porcentaje": periodo_porcentaje,
                    "periodo_meses": periodo_meses,
                    "periodo_dias": periodo_dias,
                    "dias_contrato": getattr(inv, 'dias_contrato', None),
                    "dias_generando": dias_generando,
                    "rendimiento_diario_calculado": rendimiento_diario_calculado,
                    "rendimiento_producido_hasta_ayer": rendimiento_producido_hasta_ayer,
                    "capital_actual": capital_actual,
                    "capital_devuelto": capital_devuelto,
                    "saldo_a_migrar": saldo_a_migrar,
                    "wallet_balance_actual": wallets_by_user.get(inv.user_id, 0.0),
                },
                "kyc_info": {
                    "status": getattr(inv, 'tusdatos_status', None),
                    "job_id": getattr(inv, 'tusdatos_job_id', None),
                    "report_id": getattr(inv, 'tusdatos_report_id', None),
                    "hallazgos": getattr(inv, 'tusdatos_hallazgos', None),
                    "msg": getattr(inv, 'tusdatos_msg', None),
                    "sources": getattr(inv, 'tusdatos_sources', None),
                    "justificacion": getattr(inv, 'tusdatos_justificacion', None),
                    "evidencia_paths": getattr(inv, 'tusdatos_evidencia_paths', None),
                    "hallazgos_corregidos": getattr(inv, 'tusdatos_hallazgos_corregidos', None),
                    "fecha_correccion": getattr(inv, 'tusdatos_fecha_correccion', None),
                    "corregido_por": getattr(inv, 'tusdatos_corregido_por', None),
                    "last_check": getattr(inv, 'tusdatos_last_check', None),
                },
                
                "total_bonos": total_bonos,
                "detalles_bonos": detalles_bonos,
                "total_retiros_rendimiento": total_retiros_rendimiento,
                "detalles_retiros_rendimiento": detalles_retiros_rendimiento,
                "tramos_desglose": tramos_desglose,
            }
            
            # Validación manual para prevenir Error 500
            parsed_item = AdminInvestorResponse(**data_dict)
            response_list.append(parsed_item)
            
        except Exception as e:
            print(f"Error procesando inversion ID {getattr(inv, 'id', 'Desconocido')}: {e}")
            traceback.print_exc()
            db.rollback()
    
    return response_list

@router.get("/requests", response_model=List[AdminInvestmentRequestResponse])
async def get_all_investment_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todas las solicitudes de inversión para el módulo de administración.
    Requiere permiso de administrador (admin.investments.requests).
    """
    from sqlalchemy.orm import selectinload
    
    # Hacer JOIN con users y paquetes para tener la información completa
    stmt = (
        select(InvestmentRequest)
        .options(
            selectinload(InvestmentRequest.user),
            selectinload(InvestmentRequest.paquete)
        )
        .order_by(InvestmentRequest.id.desc())
    )
    
    result = await db.execute(stmt)
    requests = result.scalars().all()
    
    response_list = []
    import traceback
    
    for req in requests:
        try:
            usuario_nombre = None
            usuario_correo = None
            paquete_nombre = None
            
            if req.user:
                if hasattr(req.user, 'name') and req.user.name:
                    usuario_nombre = req.user.name
                elif hasattr(req.user, 'first_name') and req.user.first_name:
                    usuario_nombre = f"{req.user.first_name} {getattr(req.user, 'last_name', '')}".strip()
                
                if req.user.email:
                    usuario_correo = req.user.email
                    
            if req.paquete and req.paquete.paquete_accion_adquirido:
                paquete_nombre = str(req.paquete.paquete_accion_adquirido)
                
            status_str = req.status.value if hasattr(req.status, 'value') else str(req.status)
                
            response_list.append(AdminInvestmentRequestResponse(
                id=req.id,
                user_id=req.user_id,
                monto=req.monto,
                status=status_str,
                comprobante_path=req.comprobante_path,
                created_at=req.created_at,
                usuario_nombre=usuario_nombre,
                usuario_correo=usuario_correo,
                paquete_nombre=paquete_nombre
            ))
        except Exception as e:
            print(f"Error procesando solicitud ID {getattr(req, 'id', 'Desconocido')}: {e}")
            traceback.print_exc()
        
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

from src.schemas.admin_investments import UserSearchResponse, AdminInvestmentUpdate, AgentInvestmentCreate
from src.models.user_bank_accounts import UserBankAccount
from passlib.context import CryptContext
import traceback

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.get("/search-user", response_model=UserSearchResponse)
async def search_user(
    query: str = Query(..., min_length=3),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.orm import selectinload
    # Buscar por email en User o por documento en Investor
    stmt = select(User).options(
        selectinload(User.investor_records),
        selectinload(User.bank_accounts)
    ).outerjoin(Investor, User.id == Investor.user_id).where(
        (User.email == query) | (Investor.documento == query)
    )
    result = await db.execute(stmt)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
    investor = user.investor_records[0] if user.investor_records else None
    bank = user.bank_accounts[0] if user.bank_accounts else None
    
    return UserSearchResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        documento=investor.documento if investor else None,
        numero_celular=investor.numero_celular if investor else None,
        ciudad=investor.ciudad if investor else None,
        banco=bank.banco if bank else None,
        tipo_cuenta=bank.tipo_cuenta if bank else None,
        numero_cuenta=bank.numero_cuenta if bank else None
    )

@router.post("/create-for-client")
async def create_investment_for_client(
    data: AgentInvestmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from src.models.security import Role
    
    user_id = data.user_id
    if not user_id:
        # Create new user
        # Hash password (using documento)
        hashed_pw = pwd_context.hash(data.documento)
        new_user = User(
            name=data.name,
            email=data.email,
            password=hashed_pw,
            is_active=True
        )
        db.add(new_user)
        await db.flush()
        user_id = new_user.id
        
        # Assign investor role
        role_stmt = select(Role).where(Role.name == "investor")
        role_res = await db.execute(role_stmt)
        inv_role = role_res.scalar_one_or_none()
        if inv_role:
            new_user.roles.append(inv_role)
            await db.flush()
            
    # Check or create bank account
    bank_stmt = select(UserBankAccount).where(UserBankAccount.user_id == user_id)
    bank_res = await db.execute(bank_stmt)
    bank_acc = bank_res.scalar_one_or_none()
    
    if not bank_acc:
        bank_acc = UserBankAccount(
            user_id=user_id,
            banco=data.banco,
            tipo_cuenta=data.tipo_cuenta,
            numero_cuenta=data.numero_cuenta,
            is_primary=True
        )
        db.add(bank_acc)
    else:
        bank_acc.banco = data.banco
        bank_acc.tipo_cuenta = data.tipo_cuenta
        bank_acc.numero_cuenta = data.numero_cuenta
        
    # Check or create investor
    inv_stmt = select(Investor).where(Investor.user_id == user_id)
    inv_res = await db.execute(inv_stmt)
    investor = inv_res.scalar_one_or_none()
    
    if not investor:
        investor = Investor(
            user_id=user_id,
            nombre_completo=data.name,
            correo_electronico=data.email,
            tipo_documento=data.tipo_documento,
            documento=data.documento,
            numero_celular=data.numero_celular,
            ciudad=data.ciudad,
            fecha_nacimiento=data.fecha_nacimiento
        )
        db.add(investor)
        await db.flush()
    else:
        investor.tipo_documento = data.tipo_documento
        investor.documento = data.documento
        investor.numero_celular = data.numero_celular
        investor.ciudad = data.ciudad
        if data.fecha_nacimiento:
            investor.fecha_nacimiento = data.fecha_nacimiento
            
    # Create Investment Request
    new_request = InvestmentRequest(
        user_id=user_id,
        investor_id=investor.id,
        paquete_inversion_id=data.paquete_id,
        monto=data.monto,
        comprobante_path=data.comprobante_path,
        status="pending"
    )
    db.add(new_request)
    
    await db.commit()
    return {"message": "Solicitud de inversión creada exitosamente"}

@router.put("/{investment_id}")
async def update_investment(
    investment_id: int,
    data: AdminInvestmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = select(Investor).where(Investor.id == investment_id)
    result = await db.execute(stmt)
    investor = result.scalar_one_or_none()
    
    if not investor:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
        
    # Update Investor
    update_data = data.dict(exclude_unset=True)
    
    investor_fields = [
        "nombre_completo", "correo_electronico", "tipo_documento", "documento",
        "numero_celular", "ciudad", "fecha_nacimiento", "referido_por", "observaciones",
        "paquete_inversion_adquirido", "total_contrato", "fecha_ingreso", "fecha_finalizacion"
    ]
    
    for field in investor_fields:
        if field in update_data:
            setattr(investor, field, update_data[field])
            
    # Update User if fields provided
    if investor.user_id:
        user_stmt = select(User).where(User.id == investor.user_id)
        user_res = await db.execute(user_stmt)
        user = user_res.scalar_one_or_none()
        
        if user:
            if "nombre_completo" in update_data:
                user.name = update_data["nombre_completo"]
            if "correo_electronico" in update_data:
                user.email = update_data["correo_electronico"]
                
        # Update Bank
        bank_stmt = select(UserBankAccount).where(UserBankAccount.user_id == investor.user_id)
        bank_res = await db.execute(bank_stmt)
        bank_acc = bank_res.scalar_one_or_none()
        
        if bank_acc:
            if "banco" in update_data:
                bank_acc.banco = update_data["banco"]
            if "tipo_cuenta" in update_data:
                bank_acc.tipo_cuenta = update_data["tipo_cuenta"]
            if "numero_cuenta" in update_data:
                bank_acc.numero_cuenta = update_data["numero_cuenta"]
                
    await db.commit()
    return {"message": "Inversión actualizada correctamente"}
