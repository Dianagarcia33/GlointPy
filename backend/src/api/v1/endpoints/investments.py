from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import date, datetime
from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.investment_request import InvestmentRequest
from src.models.contract_history import ContractHistory
from src.models.investor import Investor

router = APIRouter()

@router.get("/me")
async def get_my_investments(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get the investments (requests) of the current logged-in user.
    """
    # 1. Fetch Investment Requests (Solo pendientes o rechazadas, las aprobadas ya están en Investor)
    from src.models.investment_request import InvestmentRequestStatus
    result = await db.execute(
        select(InvestmentRequest)
        .options(selectinload(InvestmentRequest.package))
        .where(InvestmentRequest.user_id == current_user.id)
    )
    all_requests = result.scalars().all()
    
    requests = []
    for req in all_requests:
        raw_status = req.status.value if hasattr(req.status, 'value') else req.status
        status_str = str(raw_status).lower() if raw_status else "pending"
        if status_str != "approved":
            requests.append(req)
    
    investments = []
    today = date.today()
    
    for req in requests:
        inv = {
            "id": f"req_{req.id}",
            "user_id": req.user_id,
            "monto": float(req.monto),
            "status": (req.status.value if hasattr(req.status, 'value') else req.status).lower() if req.status else "pending",
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "paquete": {
                "id": req.package.id,
                "paquete_accion_adquirido": str(req.package.value),
                "acciones_otorgadas": req.package.granted_shares
            } if req.package else None
        }
        investments.append(inv)
        
    # 2. Fetch Active Contracts from Investor table
    investors_result = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
        .where(Investor.user_id == current_user.id)
    )
    active_investors = investors_result.scalars().all()
    
    for inv_record in active_investors:
        # Calcular fecha_fin si tenemos start_date y period.months
        from dateutil.relativedelta import relativedelta
        fecha_ingreso = inv_record.start_date
        fecha_fin = None
        dias_contrato = 0
        if fecha_ingreso and inv_record.period:
            fecha_fin = fecha_ingreso + relativedelta(months=inv_record.period.months)
            dias_contrato = (fecha_fin.date() - fecha_ingreso.date()).days

        # Determinar status
        is_active = True
        if fecha_fin and fecha_fin.date() < today:
            is_active = False

        monto = float(inv_record.package.value) if inv_record.package else 0
        
        # Rendimiento
        rendimiento_total = 0
        if inv_record.period and monto:
            # rendimiento_aprobado_mensual * meses
            rendimiento_total = monto * float(inv_record.period.percentage) / 100 * inv_record.period.months
            
        inv = {
            "id": inv_record.id,
            "user_id": current_user.id,
            "monto": monto,
            "status": "approved" if is_active else "finished",
            "created_at": inv_record.created_at.isoformat() if inv_record.created_at else None,
            "total_contrato": monto + rendimiento_total,
            "rendimiento_total_contrato": rendimiento_total,
            "liquidacion_diaria_rendimiento": rendimiento_total / dias_contrato if dias_contrato > 0 else 0,
            "dias_contrato": dias_contrato,
            "fecha_ingreso": fecha_ingreso.isoformat() if fecha_ingreso else None,
            "fecha_finalizacion": fecha_fin.isoformat() if fecha_fin else None,
            "paquete": {
                "id": inv_record.package.id if inv_record.package else 0,
                "paquete_accion_adquirido": str(inv_record.package.value) if inv_record.package else "0",
                "acciones_otorgadas": inv_record.package.granted_shares if inv_record.package else 0
            } if inv_record.package else None
        }
        investments.append(inv)
        
    return investments


@router.get("/{investment_id}")
async def get_investment_details(investment_id: str, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Get detailed information about a single investment.
    """
    from dateutil.relativedelta import relativedelta
    from src.models.withdrawal import Withdrawal
    from sqlalchemy import desc
    from src.models.investment_request import InvestmentRequest

    today = date.today()
    
    # 1. Is it a request?
    if str(investment_id).startswith("req_"):
        req_id = int(str(investment_id).replace("req_", ""))
        req_res = await db.execute(
            select(InvestmentRequest).options(selectinload(InvestmentRequest.package)).where(InvestmentRequest.id == req_id, InvestmentRequest.user_id == current_user.id)
        )
        req = req_res.scalars().first()
        if not req:
            raise HTTPException(status_code=404, detail="Inversión no encontrada")
            
        inv = {
            "id": f"req_{req.id}",
            "user_id": req.user_id,
            "monto": float(req.monto),
            "status": (req.status.value if hasattr(req.status, 'value') else req.status).lower() if req.status else "pending",
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "paquete": {
                "id": req.package.id,
                "paquete_accion_adquirido": str(req.package.value),
                "acciones_otorgadas": req.package.granted_shares
            } if req.package else None,
            "movements": [],
            "history": [],
            "capital_liberado": 0,
            "capital_disponible": 0,
            "can_upgrade": False
        }
        return inv
        
    # 2. It's an active Investor contract
    inv_id = int(investment_id)
    inv_res = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
        .where(Investor.id == inv_id, Investor.user_id == current_user.id)
    )
    inv_record = inv_res.scalars().first()
    
    if not inv_record:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
        
    fecha_ingreso = inv_record.start_date
    fecha_fin = None
    dias_contrato = 0
    dias_transcurridos = 0
    
    if fecha_ingreso and inv_record.period:
        fecha_fin = fecha_ingreso + relativedelta(months=inv_record.period.months)
        dias_contrato = (fecha_fin.date() - fecha_ingreso.date()).days
        
        diffTime = (today - fecha_ingreso.date()).days
        dias_transcurridos = diffTime if diffTime > 0 else 0

    is_active = True
    if fecha_fin and fecha_fin.date() < today:
        is_active = False

    monto = float(inv_record.package.value) if inv_record.package else 0
    
    rendimiento_total = 0
    if inv_record.period and monto:
        rendimiento_total = monto * float(inv_record.period.percentage) / 100 * inv_record.period.months
        
    # --- Capital Release Logic ---
    capital_diario = monto / dias_contrato if dias_contrato > 0 else 0
    bloques_cumplidos = dias_transcurridos // 60
    capital_liberado = (capital_diario * 60) * bloques_cumplidos
    
    # Cap to max amount
    if capital_liberado > monto:
        capital_liberado = monto
        
    # --- Fetch Movements (Withdrawals linked to this investment) ---
    w_res = await db.execute(
        select(Withdrawal)
        .where(Withdrawal.investor_id == inv_id)
        .order_by(desc(Withdrawal.created_at))
    )
    withdrawals = w_res.scalars().all()
    
    # Sum capital already withdrawn
    capital_retirado = 0
    movements = []
    
    for w in withdrawals:
        w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else w.tipo
        if w_tipo.lower() == "capital" and w.estado.lower() in ["pendiente", "aprobado", "procesado"]:
            capital_retirado += float(w.monto)
            
        movements.append({
            "id": w.id,
            "tipo": w_tipo,
            "monto": float(w.monto),
            "estado": w.estado.value if hasattr(w.estado, 'value') else w.estado,
            "fecha_solicitud": w.fecha_solicitud.isoformat() if w.fecha_solicitud else None,
            "metodo_pago": w.metodo_pago
        })
        
    capital_disponible = capital_liberado - capital_retirado
    if capital_disponible < 0:
        capital_disponible = 0
        
    # --- Fetch Contract History ---
    h_res = await db.execute(
        select(ContractHistory)
        .where(ContractHistory.investor_id == inv_id)
        .order_by(desc(ContractHistory.created_at))
    )
    history_records = h_res.scalars().all()
    history = []
    for h in history_records:
        history.append({
            "id": h.id,
            "cambio_tipo": h.change_type,
            "observacion": h.details,
            "fecha": h.created_at.isoformat() if h.created_at else None
        })

    # Upgrade eligibility (less than 90 days)
    can_upgrade = dias_transcurridos <= 90

    # --- Yield Projection Cycles ---
    projection_table = []
    if fecha_ingreso and fecha_fin and inv_record.period:
        current_start = fecha_ingreso.date() if isinstance(fecha_ingreso, datetime) else fecha_ingreso
        end_contract = fecha_fin.date() if isinstance(fecha_fin, datetime) else fecha_fin
        
        while current_start < end_contract:
            # Advance at least 1 day to find the NEXT 29th
            temp_date = current_start + relativedelta(days=1)
            
            if temp_date.day <= 29:
                try:
                    next_end = temp_date.replace(day=29)
                except ValueError:
                    next_end = temp_date.replace(day=28)
            else:
                next_month = temp_date + relativedelta(months=1)
                try:
                    next_end = next_month.replace(day=29)
                except ValueError:
                    next_end = next_month.replace(day=28)
                    
            if next_end > end_contract:
                next_end = end_contract
                
            dias_ciclo = (next_end - current_start).days
            if dias_ciclo <= 0:
                # Fallback to avoid ANY possibility of infinite loop
                current_start = current_start + relativedelta(days=1)
                continue
                
            # Calculate capital base for this cycle
            # (Initial capital minus any capital withdrawals requested before or on next_end)
            capital_retirado_ciclo = 0
            for w in withdrawals:
                w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else w.tipo
                if w_tipo.lower() == "capital" and w.estado.lower() in ["pendiente", "aprobado", "procesado"]:
                    w_date = w.fecha_solicitud.date() if isinstance(w.fecha_solicitud, datetime) else w.fecha_solicitud
                    if w_date <= next_end:
                        capital_retirado_ciclo += float(w.monto)
            
            capital_base_ciclo = max(0, monto - capital_retirado_ciclo)
            porcentaje = float(inv_record.period.percentage)
            
            rendimiento_generado = (capital_base_ciclo * (porcentaje / 100)) / 30 * dias_ciclo
            
            # Status: Paid vs Projected
            estado_ciclo = "Procesado" if next_end <= today else "Proyectado"
            
            projection_table.append({
                "fecha_inicio": current_start.isoformat(),
                "fecha_fin": next_end.isoformat(),
                "dias": dias_ciclo,
                "capital_base": capital_base_ciclo,
                "rendimiento": rendimiento_generado,
                "estado": estado_ciclo
            })
            
            current_start = next_end

    inv = {
        "id": inv_record.id,
        "user_id": current_user.id,
        "monto": monto,
        "status": "approved" if is_active else "finished",
        "created_at": inv_record.created_at.isoformat() if inv_record.created_at else None,
        "total_contrato": monto + rendimiento_total,
        "rendimiento_total_contrato": rendimiento_total,
        "liquidacion_diaria_rendimiento": rendimiento_total / dias_contrato if dias_contrato > 0 else 0,
        "dias_contrato": dias_contrato,
        "dias_transcurridos": dias_transcurridos,
        "fecha_ingreso": fecha_ingreso.isoformat() if fecha_ingreso else None,
        "fecha_finalizacion": fecha_fin.isoformat() if fecha_fin else None,
        "paquete": {
            "id": inv_record.package.id if inv_record.package else 0,
            "paquete_accion_adquirido": str(inv_record.package.value) if inv_record.package else "0",
            "acciones_otorgadas": inv_record.package.granted_shares if inv_record.package else 0
        } if inv_record.package else None,
        
        "capital_liberado": capital_liberado,
        "capital_retirado": capital_retirado,
        "capital_disponible": capital_disponible,
        "can_upgrade": can_upgrade,
        "movements": movements,
        "history": history,
        "projection": projection_table
    }
    return inv


@router.post("/{investment_id}/withdraw-capital")
async def withdraw_investment_capital(investment_id: int, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Withdraw available released capital for an investment to a registered bank account.
    """
    from dateutil.relativedelta import relativedelta
    from src.models.withdrawal import Withdrawal, WithdrawalType, WithdrawalStatus
    from src.models.bank_account import BankAccount
    from fastapi import HTTPException
    
    # 1. Fetch Investor
    inv_res = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
        .where(Investor.id == investment_id, Investor.user_id == current_user.id)
    )
    inv_record = inv_res.scalars().first()
    if not inv_record:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
        
    # 2. Check Bank Account
    bank_res = await db.execute(select(BankAccount).where(BankAccount.user_id == current_user.id, BankAccount.is_active == True))
    bank_account = bank_res.scalars().first()
    
    if not bank_account:
        raise HTTPException(status_code=400, detail="No tienes una cuenta bancaria activa configurada. Por favor, añádela en tu perfil.")
        
    # 3. Calculate Available Capital
    today = date.today()
    fecha_ingreso = inv_record.start_date
    dias_contrato = 0
    dias_transcurridos = 0
    if fecha_ingreso and inv_record.period:
        fecha_fin = fecha_ingreso + relativedelta(months=inv_record.period.months)
        dias_contrato = (fecha_fin.date() - fecha_ingreso.date()).days
        diffTime = (today - fecha_ingreso.date()).days
        dias_transcurridos = diffTime if diffTime > 0 else 0

    monto = float(inv_record.package.value) if inv_record.package else 0
    capital_diario = monto / dias_contrato if dias_contrato > 0 else 0
    bloques_cumplidos = dias_transcurridos // 60
    capital_liberado = (capital_diario * 60) * bloques_cumplidos
    
    if capital_liberado > monto:
        capital_liberado = monto
        
    w_res = await db.execute(select(Withdrawal).where(Withdrawal.investor_id == investment_id))
    withdrawals = w_res.scalars().all()
    
    capital_retirado = 0
    for w in withdrawals:
        w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else w.tipo
        if w_tipo.lower() == "capital" and w.estado.lower() in ["pendiente", "aprobado", "procesado"]:
            capital_retirado += float(w.monto)
            
    capital_disponible = capital_liberado - capital_retirado
    
    if capital_disponible <= 0:
        raise HTTPException(status_code=400, detail="No tienes capital disponible para retirar en este momento.")
        
    # 4. Create Withdrawal (Tax 3.2%)
    tax = capital_disponible * 0.032
    net_amount = capital_disponible - tax
    
    withdrawal = Withdrawal(
        investor_id=investment_id,
        user_id=current_user.id,
        origen="investment_capital",
        tipo=WithdrawalType.CAPITAL,
        monto=capital_disponible,
        impuesto=tax,
        monto_neto=net_amount,
        fecha_solicitud=today,
        estado=WithdrawalStatus.PENDING,
        metodo_pago="Transferencia",
        banco=bank_account.banco,
        tipo_cuenta=bank_account.tipo_cuenta,
        numero_cuenta=bank_account.numero_cuenta
    )
    
    db.add(withdrawal)
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Retiro de capital solicitado exitosamente", "monto": capital_disponible}
