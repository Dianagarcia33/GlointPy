
from typing import Optional, List
from fastapi import APIRouter, Depends, Form, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.investment_request import InvestmentRequest
from src.models.contract_history import ContractHistory
from src.models.investor import Investor

from src.api.v1.endpoints.wallets import check_withdrawal_dates_active

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
        .options(selectinload(Investor.package), selectinload(Investor.period), selectinload(Investor.accelerations))
        .where(Investor.user_id == current_user.id)
    )
    active_investors = investors_result.scalars().all()
    
    for inv_record in active_investors:
        fecha_ingreso = inv_record.start_date
        fecha_fin = None
        dias_contrato = 0

        if fecha_ingreso and inv_record.period:
            inv_start = fecha_ingreso.date() if isinstance(fecha_ingreso, datetime) else fecha_ingreso
            dias_base = getattr(inv_record.period, 'days', 0) or (inv_record.period.months * 30 if inv_record.period.months else 0)
            fecha_fin_date = inv_start + timedelta(days=dias_base)
            fecha_fin = datetime.combine(fecha_fin_date, datetime.min.time()) if isinstance(fecha_ingreso, datetime) else fecha_fin_date
            dias_contrato = dias_base

        # Contrato en curso (fecha_fin > hoy) es ACTIVO, vencido (fecha_fin <= hoy) es FINALIZADO
        is_active = True
        current_today = date.today()
        check_date = fecha_fin.date() if isinstance(fecha_fin, datetime) else fecha_fin
        if check_date and check_date <= current_today:
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
            "aceleracion_dias": 0,
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
        .options(
            selectinload(Investor.package), 
            selectinload(Investor.period),
            selectinload(Investor.accelerations)
        )
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
    dias_reducidos_totales = 0.0
    accelerations_list = []

    if hasattr(inv_record, 'accelerations') and inv_record.accelerations:
        for acc in inv_record.accelerations:
            if acc.applied:
                dias_reducidos_totales += float(acc.days_to_reduce or 0)
                accelerations_list.append({
                    "id": acc.id,
                    "bonus_amount": float(acc.bonus_amount or 0),
                    "days_to_reduce": round(float(acc.days_to_reduce or 0), 2),
                    "percentage": float(acc.acceleration_percentage or 5),
                    "created_at": acc.created_at.isoformat() if acc.created_at else None
                })
    
    if fecha_ingreso and inv_record.period:
        fecha_fin_original = fecha_ingreso + relativedelta(months=inv_record.period.months)
        dias_contrato_original = (fecha_fin_original.date() - fecha_ingreso.date()).days
        
        # Descontar los días reducidos por bonos/aceleraciones
        dias_contrato = max(1, int(dias_contrato_original - dias_reducidos_totales))
        from datetime import timedelta
        fecha_fin = fecha_ingreso + timedelta(days=dias_contrato)
        
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
    
    from src.models.user_bank_account import UserBankAccount
    bank_res = await db.execute(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id, UserBankAccount.is_active == True))
    bank = bank_res.scalars().first()
    bank_info = None
    if bank:
        bank_info = {
            "banco": bank.banco,
            "tipo_cuenta": bank.tipo_cuenta,
            "numero_cuenta": bank.numero_cuenta
        }

    # History
    history = []
    for h in history_records:
        history.append({
            "id": h.id,
            "cambio_tipo": h.motivo,
            "observacion": h.observaciones,
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

    # --- Current 29th-to-29th Cycle Accumulated Yield ---
    if today.day >= 29:
        last_29th = date(today.year, today.month, 29)
    else:
        if today.month == 1:
            last_29th = date(today.year - 1, 12, 29)
        else:
            last_29th = date(today.year, today.month - 1, 29)

    contract_start = fecha_ingreso.date() if isinstance(fecha_ingreso, datetime) else fecha_ingreso if fecha_ingreso else today
    cycle_start = max(last_29th, contract_start)
    
    dias_ciclo_actual = (today - cycle_start).days if today >= cycle_start else 0
    daily_yield = rendimiento_total / dias_contrato if dias_contrato > 0 else 0
    rendimiento_ciclo_actual = round(dias_ciclo_actual * daily_yield, 2)

    inv = {
        "id": inv_record.id,
        "user_id": current_user.id,
        "monto": monto,
        "status": "approved" if is_active else "finished",
        "created_at": inv_record.created_at.isoformat() if inv_record.created_at else None,
        "total_contrato": monto + rendimiento_total,
        "rendimiento_total_contrato": rendimiento_total,
        "liquidacion_diaria_rendimiento": daily_yield,
        "rendimiento_ciclo_actual": rendimiento_ciclo_actual,
        "dias_ciclo_actual": dias_ciclo_actual,
        "fecha_inicio_ciclo_actual": cycle_start.isoformat(),
        "dias_contrato": dias_contrato,
        "dias_transcurridos": dias_transcurridos,
        "fecha_ingreso": fecha_ingreso.isoformat() if fecha_ingreso else None,
        "fecha_finalizacion": fecha_fin.isoformat() if fecha_fin else None,
        "paquete": {
            "id": inv_record.package.id if inv_record.package else 0,
            "paquete_accion_adquirido": str(inv_record.package.value) if inv_record.package else "0",
            "acciones_otorgadas": inv_record.package.granted_shares if inv_record.package else 0
        } if inv_record.package else None,
        "periodo": {
            "id": inv_record.period.id,
            "months": inv_record.period.months
        } if getattr(inv_record, "period", None) else None,
        
        "capital_liberado": capital_liberado,
        "capital_retirado": capital_retirado,
        "capital_disponible": capital_disponible,
        "can_withdraw_capital": (await check_withdrawal_dates_active(db))[0] and (capital_disponible > 0),
        "withdrawal_date_message": (await check_withdrawal_dates_active(db))[1],
        "can_upgrade": can_upgrade,
        "movements": movements,
        "history": history,
        "projection": projection_table,
        "bank_info": bank_info,
        "accelerations": accelerations_list,
        "dias_reducidos_totales": round(dias_reducidos_totales, 2)
    }
    return inv


class WithdrawCapitalConfirmRequest(BaseModel):
    code: str
    bank_account_id: Optional[int] = None

@router.post("/{investment_id}/withdraw-capital/send-code")
async def send_investment_withdrawal_code(investment_id: int, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Send a 6-digit verification code to the user's email for capital withdrawal.
    """
    from src.models.user_bank_account import UserBankAccount
    from src.models.withdrawal_verification_code import WithdrawalVerificationCode
    from src.services.email_service import EmailService
    from dateutil.relativedelta import relativedelta
    from src.models.withdrawal import Withdrawal
    import random
    from datetime import timedelta
    
    # 0. Check Withdrawal Dates Window
    can_withdraw_window, date_msg = await check_withdrawal_dates_active(db)
    if not can_withdraw_window:
        raise HTTPException(status_code=400, detail=date_msg or "Actualmente no nos encontramos en fechas de retiro de capital autorizadas.")

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
    bank_res = await db.execute(select(UserBankAccount).where(UserBankAccount.user_id == current_user.id, UserBankAccount.is_active == True))
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
        
    # Invalidate previous codes
    await db.execute(
        WithdrawalVerificationCode.__table__.update()
        .where(WithdrawalVerificationCode.user_id == current_user.id)
        .where(WithdrawalVerificationCode.used_at == None)
        .values(used_at=datetime.utcnow())
    )
    
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    new_code = WithdrawalVerificationCode(
        user_id=current_user.id,
        code=code,
        expires_at=expires_at,
        used_at=None
    )
    db.add(new_code)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al generar el código: {str(e)}")
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificación - Retiro de Capital</title>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f7f9fc; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
            .header {{ background-color: #6366f1; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }}
            .content {{ padding: 40px 30px; }}
            .code-box {{ background-color: #f0fdf4; border: 2px dashed #22c55e; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }}
            .code {{ font-size: 36px; font-weight: bold; color: #166534; letter-spacing: 5px; margin: 0; }}
            .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }}
            .footer p {{ margin: 0; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Retiro de Capital - Gloint</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{current_user.name}</strong>,</p>
                <p>Has solicitado retirar capital disponible de tu inversión <strong>#{inv_record.id}</strong>.</p>
                <p>Para confirmar y procesar esta solicitud, por favor ingresa el siguiente código de 6 dígitos en la plataforma:</p>
                <div class="code-box">
                    <p class="code">{code}</p>
                </div>
                <p style="font-size: 14px; color: #64748b; text-align: center;">Este código expirará en 10 minutos por razones de seguridad.</p>
                <p style="margin-top: 30px;">Si no has solicitado este retiro, por favor ignora este correo y contacta a soporte inmediatamente.</p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} Gloint. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    EmailService.send_html_email(
        to_email=current_user.email,
        subject="Código de Verificación - Retiro de Capital Gloint",
        html_content=html_content
    )
    
    return {"message": "Código enviado al correo"}


@router.post("/{investment_id}/withdraw-capital")
async def withdraw_investment_capital(investment_id: int, req: WithdrawCapitalConfirmRequest, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Verify code and withdraw available released capital for an investment to a registered bank account.
    """
    from dateutil.relativedelta import relativedelta
    from src.models.withdrawal import Withdrawal, WithdrawalType, WithdrawalStatus
    from src.models.user_bank_account import UserBankAccount
    from src.models.withdrawal_verification_code import WithdrawalVerificationCode
    from fastapi import HTTPException
    from datetime import datetime, timedelta
    
    # 0. Check Withdrawal Dates Window
    can_withdraw_window, date_msg = await check_withdrawal_dates_active(db)
    if not can_withdraw_window:
        raise HTTPException(status_code=400, detail=date_msg or "Actualmente no nos encontramos en fechas de retiro de capital autorizadas.")

    # 1. Check Verification Code
    code_res = await db.execute(
        select(WithdrawalVerificationCode)
        .where(
            WithdrawalVerificationCode.user_id == current_user.id,
            WithdrawalVerificationCode.code == req.code,
            WithdrawalVerificationCode.used_at == None
        )
    )
    verification = code_res.scalars().first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="Código inválido o ya utilizado")
        
    # Check expiration (make both naive or both aware to compare safely)
    expires_at = verification.expires_at.replace(tzinfo=None) if verification.expires_at.tzinfo else verification.expires_at
    if expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El código de verificación ha expirado")
        
    # Mark code as used
    verification.used_at = datetime.utcnow()
    
    # 2. Fetch Investor
    inv_res = await db.execute(
        select(Investor)
        .options(selectinload(Investor.package), selectinload(Investor.period))
        .where(Investor.id == investment_id, Investor.user_id == current_user.id)
    )
    inv_record = inv_res.scalars().first()
    if not inv_record:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")
        
    # 3. Check Bank Account
    if req.bank_account_id is not None and req.bank_account_id > 0:
        bank_res = await db.execute(
            select(UserBankAccount).where(
                UserBankAccount.id == req.bank_account_id,
                UserBankAccount.user_id == current_user.id,
                UserBankAccount.is_active == True
            )
        )
        bank_account = bank_res.scalars().first()
    else:
        bank_res = await db.execute(
            select(UserBankAccount).where(
                UserBankAccount.user_id == current_user.id,
                UserBankAccount.is_active == True
            ).order_by(UserBankAccount.id.desc())
        )
        bank_account = bank_res.scalars().first()
    
    if not bank_account:
        raise HTTPException(status_code=400, detail="No tienes una cuenta bancaria activa configurada. Por favor, añádela en tu perfil.")
        
    # 4. Calculate Available Capital
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
        
    # 5. Create Withdrawal (Tax 3.2%)
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

import os
import uuid

@router.post("/requests")
async def create_investment_request(
    paquete_inversion_id: int = Form(...),
    monto: float = Form(...),
    periodo_contrato: int = Form(...),
    monto_billetera_usado: float = Form(0.0),
    codigo_referido: str = Form(None),
    is_upgrade: bool = Form(False),
    investor_id: Optional[int] = Form(None),
    user_id: Optional[int] = Form(None),
    comprobantes: list[UploadFile] = File(default=[]),
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
    from src.models.package import Package
    
    UPLOAD_DIR = "uploads/comprobantes"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    comprobante_path = None
    extra_paths = []
    
    if comprobantes:
        for i, file in enumerate(comprobantes):
            if file.filename:
                file_ext = os.path.splitext(file.filename)[1] if os.path.splitext(file.filename)[1] else ".png"
                filename = f"{uuid.uuid4()}{file_ext}"
                file_path = os.path.join(UPLOAD_DIR, filename)
                
                content = await file.read()
                with open(file_path, "wb") as f:
                    f.write(content)
                    
                path_str = f"/{file_path}"
                if i == 0:
                    comprobante_path = path_str
                else:
                    extra_paths.append(path_str)
                    
    target_user_id = user_id or current_user.id
    extra_data = {}
    if extra_paths:
        extra_data["comprobantes_adicionales"] = extra_paths
    if monto_billetera_usado > 0:
        extra_data["monto_billetera_usado"] = monto_billetera_usado
    if codigo_referido:
        extra_data["codigo_referido"] = codigo_referido
    if is_upgrade or investor_id:
        extra_data["es_aumento_capital"] = True
        extra_data["is_upgrade"] = True
    if periodo_contrato:
        extra_data["contract_period_id"] = periodo_contrato

    if investor_id:
        extra_data["investor_id"] = investor_id
        extra_data["previous_contract_id"] = investor_id
        inv_res = await db.execute(select(Investor).options(selectinload(Investor.package)).where(Investor.id == investor_id))
        prev_inv = inv_res.scalars().first()
        if prev_inv:
            extra_data["previous_package_id"] = prev_inv.package_id
            if prev_inv.package:
                extra_data["previous_package_value"] = float(prev_inv.package.value)
            extra_data["previous_period_id"] = prev_inv.period_id
            if not user_id:
                target_user_id = prev_inv.user_id

    if paquete_inversion_id:
        pkg_res = await db.execute(select(Package).where(Package.id == paquete_inversion_id))
        target_pkg = pkg_res.scalars().first()
        if target_pkg:
            extra_data["new_package_id"] = target_pkg.id
            extra_data["new_package_value"] = float(target_pkg.value)
        
    new_request = InvestmentRequest(
        user_id=target_user_id,
        investor_id=investor_id,
        paquete_inversion_id=paquete_inversion_id,
        monto=monto,
        comprobante_path=comprobante_path,
        status=InvestmentRequestStatus.pending,
        extra_data=extra_data if extra_data else None
    )
    
    db.add(new_request)
    await db.flush()

    if monto_billetera_usado > 0:
        from decimal import Decimal
        from src.models.wallet import Wallet, WalletStatus, WalletTransaction
        wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == target_user_id))
        wallet = wallet_res.scalars().first()
        if not wallet or float(wallet.balance or 0.0) < monto_billetera_usado:
            raise HTTPException(
                status_code=400, 
                detail=f"Saldo insuficiente en la billetera del usuario. Disponible: ${float(wallet.balance if wallet else 0.0):,.0f}"
            )
        
        old_bal = float(wallet.balance or 0.0)
        new_bal = old_bal - monto_billetera_usado
        wallet.balance = Decimal(str(new_bal))
        
        w_tx = WalletTransaction(
            wallet_id=wallet.id,
            amount=Decimal(str(-monto_billetera_usado)),
            type="investment_payment",
            reference_type="investment_request",
            reference_id=new_request.id,
            description=f"Abono de billetera para solicitud de inversión #{new_request.id}",
            balance_after=Decimal(str(new_bal))
        )
        db.add(w_tx)

    try:
        await db.commit()
        await db.refresh(new_request)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Solicitud creada exitosamente", "id": new_request.id}

@router.get("/admin/search-user")
async def admin_search_user(
    query: Optional[str] = "", 
    current_user = Depends(RequirePermission(["admin.investments.manage", "admin.investments.solicitud_inversion", "admin.investors.manage", "admin.investors.create"])), 
    db: AsyncSession = Depends(get_db)
):
    """
    Search users by name, email, or document for admin investment creation.
    """
    from src.models.user import User
    from sqlalchemy import or_
    
    q = (query or "").strip()
    if not q or len(q) < 2:
        res = await db.execute(select(User).where(User.is_active == True).limit(30))
        users = res.scalars().all()
    else:
        search_term = f"%{q}%"
        res = await db.execute(
            select(User).where(
                User.is_active == True,
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.document_id.ilike(search_term)
                )
            ).limit(30)
        )
        users = res.scalars().all()
    
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "document_id": u.document_id,
            "documento": u.document_id,
            "numero_celular": getattr(u, "phone_number", getattr(u, "phone", "")),
            "ciudad": getattr(u, "city", ""),
            "banco": "",
            "tipo_cuenta": "Ahorros",
            "numero_cuenta": ""
        }
        for u in users
    ]
