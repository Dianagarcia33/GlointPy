from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from src.core.database import get_db
from src.schemas.investor import InvestorCreate, InvestorUpdate, InvestorResponse, InvestorPaginatedResponse
from src.services.investor_service import InvestorService
from src.api.deps import RequirePermission, get_current_user
from src.models.user import User

router = APIRouter()

@router.get("/", response_model=InvestorPaginatedResponse, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def read_investors(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    has_history: Optional[bool] = Query(None, description="Filtrar por inversiones que tienen historial de contratos"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve investors paginated with role-based scoping (Advisors only see their assigned clients).
    """
    return await InvestorService.get_investors(
        db, 
        page=page, 
        limit=limit, 
        search=search, 
        has_history=has_history,
        current_user=current_user
    )

@router.get("/my-investments")
async def get_my_investments_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retorna las inversiones activas del usuario autenticado (para app móvil y web).
    """
    from src.api.v1.endpoints.investments import get_my_investments
    return await get_my_investments(current_user=current_user, db=db)

@router.get("/{investor_id}", response_model=InvestorResponse, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def read_investor(
    investor_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific investor by ID.
    """
    return await InvestorService.get_investor(db, investor_id=investor_id)

@router.post("/", response_model=InvestorResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission("admin.investors.create"))])
async def create_investor(
    investor: InvestorCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new investor.
    """
    return await InvestorService.create_investor(db, investor=investor)

@router.put("/{investor_id}", response_model=InvestorResponse, dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def update_investor(
    investor_id: int,
    investor: InvestorUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing investor.
    """
    return await InvestorService.update_investor(db, investor_id=investor_id, investor=investor)

@router.delete("/{investor_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequirePermission("admin.investors.delete"))])
async def delete_investor(
    investor_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an investor.
    """
    await InvestorService.delete_investor(db, investor_id=investor_id)

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def bulk_upload_investors(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and create multiple investors in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8.")
        
    result = await InvestorService.bulk_create_investors(db, csv_text)
    return result

from decimal import Decimal
from datetime import datetime, date
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from src.schemas.investor import AdminWithdrawCapitalRequest
from src.models.investor import Investor
from src.models.withdrawal import Withdrawal, WithdrawalType, WithdrawalStatus
from src.models.wallet import Wallet, WalletTransaction, WalletStatus
from src.models.contract_history import ContractHistory
from src.services.push_notification_service import PushNotificationService
from src.api.deps import get_current_user

@router.post("/{investor_id}/admin-withdraw-capital", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def admin_withdraw_capital(
    investor_id: int,
    req: AdminWithdrawCapitalRequest,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Process capital liquidation for a contract, recording the withdrawal and crediting funds directly to the user's wallet.
    """
    # 1. Fetch Investor
    res = await db.execute(
        select(Investor)
        .options(
            selectinload(Investor.package),
            selectinload(Investor.period),
            selectinload(Investor.user),
            selectinload(Investor.withdrawals)
        )
        .where(Investor.id == investor_id)
    )
    investor = res.scalars().first()
    if not investor:
        raise HTTPException(status_code=404, detail="Inversión no encontrada")

    # 2. Calculate remaining capital
    total_package_value = float(investor.package.value) if investor.package else 0.0
    
    already_withdrawn = 0.0
    if investor.withdrawals:
        for w in investor.withdrawals:
            w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else str(w.tipo)
            w_estado = w.estado.value if hasattr(w.estado, 'value') else str(w.estado)
            if w_tipo.lower() == "capital" and w_estado.lower() in ["pendiente", "aprobado", "procesado"]:
                already_withdrawn += float(w.monto or 0.0)

    available_capital = max(0.0, total_package_value - already_withdrawn)
    if available_capital <= 0:
        raise HTTPException(status_code=400, detail="Este contrato no tiene saldo de capital pendiente por retirar.")

    amount_to_withdraw = float(req.monto) if (req.monto is not None and 0 < float(req.monto) <= available_capital) else available_capital
    amount_decimal = Decimal(str(amount_to_withdraw))
    assigned_code = investor.assigned_code or f"INV-{investor.id}"
    credit_wallet = req.credit_wallet if req.credit_wallet is not None else True
    formatted_amount = f"${amount_to_withdraw:,.0f} COP".replace(",", ".")

    wallet = None
    if credit_wallet:
        # 3. Fetch or Create User Wallet (only if credit_wallet is True)
        wallet_res = await db.execute(select(Wallet).where(Wallet.user_id == investor.user_id))
        wallet = wallet_res.scalars().first()
        if not wallet:
            wallet = Wallet(
                user_id=investor.user_id,
                balance=Decimal("0.00"),
                currency="COP",
                status=WalletStatus.ACTIVE
            )
            db.add(wallet)
            await db.flush()

    # 4. Create Withdrawal Record (Processed)
    origen_val = "wallet_credit" if credit_wallet else "direct_liquidation"
    metodo_val = "Billetera Gloint" if credit_wallet else "Liquidación Externa / Directa"
    obs_val = req.notes or (
        f"Liquidación y retorno de capital a Billetera por finalización de contrato #{assigned_code}"
        if credit_wallet else
        f"Liquidación directa de capital (sin abono a Billetera) por finalización de contrato #{assigned_code}"
    )

    withdrawal = Withdrawal(
        investor_id=investor.id,
        user_id=investor.user_id,
        origen=origen_val,
        tipo=WithdrawalType.CAPITAL,
        monto=amount_decimal,
        impuesto=Decimal("0.00"),
        monto_neto=amount_decimal,
        fecha_solicitud=date.today(),
        estado=WithdrawalStatus.PROCESSED,
        aprobado_por=current_user.id,
        fecha_aprobacion=datetime.utcnow(),
        procesado_por=current_user.id,
        fecha_procesamiento=datetime.utcnow(),
        metodo_pago=metodo_val,
        observaciones=obs_val
    )
    db.add(withdrawal)
    await db.flush()

    # 5. Credit Wallet and Create Transaction (Only if credit_wallet is True)
    if credit_wallet and wallet:
        wallet.balance += amount_decimal
        tx = WalletTransaction(
            wallet_id=wallet.id,
            amount=amount_decimal,
            type="Retiro de Capital",
            reference_type="investor_capital_withdrawal",
            reference_id=withdrawal.id,
            description=f"Retorno de capital - Contrato #{assigned_code}",
            balance_after=wallet.balance
        )
        db.add(tx)

    # 6. Add Contract History Entry
    if investor.start_date and investor.period:
        start_d = investor.start_date.date() if isinstance(investor.start_date, datetime) else investor.start_date
        end_d = start_d
        if hasattr(investor, 'end_date') and investor.end_date:
            end_d = investor.end_date.date() if isinstance(investor.end_date, datetime) else investor.end_date
        
        motivo_hist = "Liquidación y Retiro de Capital a Billetera" if credit_wallet else "Liquidación Directa de Capital (Sin Billetera)"
        obs_hist = (
            f"Se liquidaron {formatted_amount} de capital y se acreditaron a la Billetera Gloint."
            if credit_wallet else
            f"Se liquidaron {formatted_amount} de capital de forma directa (sin transferencia a Billetera)."
        )

        history = ContractHistory(
            investor_id=investor.id,
            paquete_inversion_id=investor.package_id,
            contract_period_id=investor.period_id,
            fecha_inicio=start_d,
            fecha_fin=end_d,
            dias_contrato=investor.period.days if investor.period else 0,
            total_contrato=Decimal(str(total_package_value)),
            tasa_interes=f"{investor.period.percentage}%" if investor.period else "0%",
            motivo=motivo_hist,
            observaciones=obs_hist
        )
        db.add(history)

    # 7. Send In-App Notification
    try:
        if credit_wallet:
            notif_title = "Capital Acreditado en tu Billetera"
            notif_body = f"Se ha liquidado exitosamente el capital de tu contrato #{assigned_code} por un valor de {formatted_amount}, el cual ya se encuentra disponible en tu Billetera Gloint."
            notif_type = "wallet_credit"
        else:
            notif_title = "Capital de Contrato Liquidado"
            notif_body = f"Se ha registrado exitosamente la liquidación oficial del capital de tu contrato #{assigned_code} por un valor de {formatted_amount}."
            notif_type = "investment_liquidation"

        await PushNotificationService.create_and_send_notification(
            db=db,
            user_id=investor.user_id,
            title=notif_title,
            body=notif_body,
            notification_type=notif_type
        )
    except Exception as notif_err:
        print(f"Error creating notification for capital withdrawal: {notif_err}")

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al procesar el retiro de capital: {str(e)}")

    return {
        "message": "Retiro de capital procesado y acreditado a la Billetera con éxito" if credit_wallet else "Liquidación de capital procesada exitosamente (sin abono a billetera)",
        "investor_id": investor.id,
        "monto_liquidado": amount_to_withdraw,
        "monto_acreditado": amount_to_withdraw if credit_wallet else 0.0,
        "credit_wallet": credit_wallet,
        "nuevo_saldo_wallet": float(wallet.balance) if wallet else None,
        "withdrawal_id": withdrawal.id
    }

