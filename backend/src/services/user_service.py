from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.models.user import User
from src.models.security import Role
from src.core.security import get_password_hash
from fastapi import HTTPException
import csv
import io
from datetime import datetime

class UserService:
    @staticmethod
    async def get_all_users(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20, 
        search: str = None, 
        role_id: int = None, 
        is_active: bool = None,
        has_wallet: bool = None
    ) -> dict:
        from sqlalchemy import or_, func
        from src.models.wallet import Wallet
        
        query = select(User)
        
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    User.name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.document_id.ilike(search_term)
                )
            )
            
        if is_active is not None:
            query = query.where(User.is_active == is_active)
            
        if role_id is not None:
            query = query.join(User.roles).where(Role.id == role_id)
            
        if has_wallet is not None:
            if has_wallet:
                query = query.join(User.wallet)
            else:
                query = query.outerjoin(User.wallet).where(Wallet.id == None)
            
        # Contar total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        # Paginar y obtener data
        offset = (page - 1) * limit
        query = query.options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.bank_accounts),
            selectinload(User.wallet)
        )
        query = query.order_by(User.id.desc()).offset(offset).limit(limit)
        
        result = await db.execute(query)
        data = result.scalars().all()
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data
        }

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User:
        result = await db.execute(
            select(User).options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.bank_accounts),
                selectinload(User.wallet)
            ).where(User.id == user_id)
        )
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user

    @staticmethod
    async def create_wallet_for_user(db: AsyncSession, user_id: int) -> dict:
        from src.models.wallet import Wallet, WalletStatus
        user = await UserService.get_user_by_id(db, user_id)
        if user.wallet:
            raise HTTPException(status_code=400, detail="El usuario ya posee una billetera activa.")
        
        new_wallet = Wallet(
            user_id=user.id,
            balance=0,
            currency="COP",
            status=WalletStatus.ACTIVE
        )
        db.add(new_wallet)
        await db.commit()
        await db.refresh(new_wallet)
        return {
            "message": "Billetera creada exitosamente",
            "wallet_id": new_wallet.id,
            "user_id": user.id
        }

    @staticmethod
    async def create_user_admin(db: AsyncSession, user_data: dict) -> User:
        # Check if email exists
        result = await db.execute(select(User).where(User.email == user_data["email"]))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Create user with default password
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            document_id=user_data.get("document_id"),
            phone_number=user_data.get("phone_number"),
            date_of_birth=user_data.get("date_of_birth"),
            password_hash=get_password_hash("Temp123!"),
            must_change_password=True,
            is_active=user_data.get("is_active", True)
        )
        
        # Asignar roles si se proveen
        if "role_ids" in user_data and user_data["role_ids"]:
            roles_result = await db.execute(select(Role).where(Role.id.in_(user_data["role_ids"])))
            user.roles = roles_result.scalars().all()
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        # Fetch again to eagerly load roles for response
        return await UserService.get_user_by_id(db, user.id)

    @staticmethod
    async def reset_user_password(db: AsyncSession, user_id: int) -> dict:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        user.password_hash = get_password_hash("123456789")
        user.must_change_password = True
        user.failed_login_attempts = 0
        user.locked_until = None

        await db.commit()
        await db.refresh(user)
        return {
            "message": "Contraseña restablecida exitosamente a la clave temporal '123456789'",
            "user_id": user.id
        }

    @staticmethod
    async def update_user_admin(db: AsyncSession, user_id: int, user_data: dict) -> User:
        user = await UserService.get_user_by_id(db, user_id)
        
        # If email changed, check uniqueness
        if "email" in user_data and user_data["email"] != user.email:
            result = await db.execute(select(User).where(User.email == user_data["email"]))
            if result.scalars().first():
                raise HTTPException(status_code=400, detail="Email already registered")

        for key, value in user_data.items():
            if key != "role_ids":
                setattr(user, key, value)

        # Update roles if provided
        if "role_ids" in user_data:
            if user_data["role_ids"]:
                roles_result = await db.execute(select(Role).where(Role.id.in_(user_data["role_ids"])))
                user.roles = roles_result.scalars().all()
            else:
                user.roles = []

        await db.commit()
        await db.refresh(user)
        return await UserService.get_user_by_id(db, user.id)

    @staticmethod
    async def bulk_create_users(db: AsyncSession, csv_content: str) -> dict:
        try:
            dialect = csv.Sniffer().sniff(csv_content[:1024])
            reader = csv.DictReader(io.StringIO(csv_content), dialect=dialect)
        except Exception:
            reader = csv.DictReader(io.StringIO(csv_content))
            
        success_count = 0
        errors = []
        
        # Load all roles to map names to objects
        roles_result = await db.execute(select(Role))
        all_roles = {r.name.lower(): r for r in roles_result.scalars().all()}
        
        print(f"--- Iniciando Carga Masiva de Usuarios ---", flush=True)

        for row_number, row in enumerate(reader, start=2):
            try:
                name = row.get("name", "").strip()
                email = row.get("email", "").strip()
                
                print(f"Procesando fila {row_number}: email={email}", flush=True)
                
                if not name or not email:
                    errors.append(f"Fila {row_number}: Nombre o Correo electrónico faltante.")
                    continue

                # Check if email exists
                existing = await db.execute(select(User).where(User.email == email))
                if existing.scalars().first():
                    errors.append(f"Fila {row_number}: El correo {email} ya existe en base de datos.")
                    continue
                
                user_id_str = row.get("id", "").strip()
                user_id = None
                if user_id_str and user_id_str.isdigit():
                    user_id = int(user_id_str)
                    existing_id = await db.execute(select(User).where(User.id == user_id))
                    if existing_id.scalars().first():
                        errors.append(f"Fila {row_number}: El ID {user_id} ya está en uso.")
                        continue
                
                doc_id = row.get("document_id", "").strip()
                if not doc_id:
                    errors.append(f"Fila {row_number}: Documento de identidad faltante (requerido para contraseña inicial).")
                    continue
                
                # Prevenir duplicados de documento en base de datos
                existing_doc = await db.execute(select(User).where(User.document_id == doc_id))
                if existing_doc.scalars().first():
                    errors.append(f"Fila {row_number}: El documento {doc_id} ya existe en base de datos.")
                    continue
                
                raw_dob = row.get("date_of_birth", "").strip()
                date_of_birth = None
                if raw_dob:
                    if "/" in raw_dob:
                        try:
                            date_of_birth = datetime.strptime(raw_dob, "%d/%m/%Y").strftime("%Y-%m-%d")
                        except ValueError:
                            try:
                                date_of_birth = datetime.strptime(raw_dob, "%Y/%m/%d").strftime("%Y-%m-%d")
                            except ValueError:
                                date_of_birth = raw_dob
                    else:
                        date_of_birth = raw_dob

                user = User(
                    name=name,
                    email=email,
                    document_id=doc_id,
                    phone_number=row.get("phone_number", "").strip() or None,
                    date_of_birth=date_of_birth,
                    password_hash=get_password_hash(doc_id),
                    must_change_password=True,
                    is_active=True
                )
                
                if user_id:
                    user.id = user_id

                roles_str = row.get("roles", "").strip()
                if roles_str:
                    role_names = [r.strip().lower() for r in roles_str.split(",")]
                    assigned_roles = []
                    for r_name in role_names:
                        if r_name in all_roles:
                            assigned_roles.append(all_roles[r_name])
                    user.roles = assigned_roles

                db.add(user)
                # Commit here to save each user individually
                await db.commit()
                success_count += 1
                print(f"-> Fila {row_number} guardada con éxito.", flush=True)
                
            except Exception as e:
                await db.rollback() # Limpiar la transacción en caso de error
                print(f"-> Error en fila {row_number}: {str(e)}", flush=True)
                errors.append(f"Fila {row_number}: Error inesperado - {str(e)}")

        print(f"--- Fin Carga Masiva. Exitosos: {success_count}, Errores: {len(errors)} ---", flush=True)
        return {
            "success": success_count,
            "errors": errors
        }

    @staticmethod
    async def get_user_account_statement(
        db: AsyncSession,
        user_id: int,
        start_date_str: str = None,
        end_date_str: str = None
    ) -> dict:
        from src.models.wallet import Wallet, WalletTransaction
        from src.models.withdrawal import Withdrawal
        from src.models.investor import Investor
        from src.models.user_bank_account import UserBankAccount
        from src.models.package import Package
        from src.models.period import Period
        from datetime import datetime, date, time
        from sqlalchemy import desc, asc, and_

        # 1. Fetch user with relations
        user_res = await db.execute(
            select(User)
            .options(
                selectinload(User.roles),
                selectinload(User.bank_accounts),
                selectinload(User.wallet)
            )
            .where(User.id == user_id)
        )
        user = user_res.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # 2. Parse dates if provided
        start_dt = None
        end_dt = None
        if start_date_str:
            try:
                start_dt = datetime.combine(datetime.strptime(start_date_str, "%Y-%m-%d").date(), time.min)
            except Exception:
                pass
        if end_date_str:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date_str, "%Y-%m-%d").date(), time.max)
            except Exception:
                pass

        # 3. Fetch Wallet Transactions
        wallet = user.wallet
        wallet_transactions_list = []
        opening_balance = 0.0
        closing_balance = float(wallet.balance) if wallet else 0.0
        total_credits = 0.0
        total_debits = 0.0

        if wallet:
            # Query all transactions
            t_query = select(WalletTransaction).where(WalletTransaction.wallet_id == wallet.id)
            t_res = await db.execute(t_query.order_by(asc(WalletTransaction.created_at), asc(WalletTransaction.id)))
            all_transactions = t_res.scalars().all()

            for t in all_transactions:
                t_dt = t.created_at
                t_amount = float(t.amount or 0)
                t_balance_after = float(t.balance_after or 0)

                # If before start_dt, calculate opening balance
                if start_dt and t_dt < start_dt:
                    opening_balance = t_balance_after
                    continue

                # If after end_dt, skip from period list
                if end_dt and t_dt > end_dt:
                    continue

                if t_amount >= 0:
                    total_credits += t_amount
                else:
                    total_debits += abs(t_amount)

                # Translate and format transaction type
                tx_type_map = {
                    "yield_payout": "Pago de Rendimientos",
                    "yield payout": "Pago de Rendimientos",
                    "bonus_payout": "Pago de Bono",
                    "bonus payout": "Pago de Bono",
                    "withdrawal_request": "Solicitud de Retiro",
                    "withdrawal request": "Solicitud de Retiro",
                    "withdrawal_refund": "Reembolso de Retiro",
                    "withdrawal refund": "Reembolso de Retiro",
                    "withdrawal_rejection": "Rechazo de Retiro",
                    "withdrawal rejection": "Rechazo de Retiro",
                    "investment_reservation": "Reserva de Inversión",
                    "investment reservation": "Reserva de Inversión",
                    "investment_payment": "Pago de Inversión",
                    "investment payment": "Pago de Inversión",
                    "transfer_received": "Transferencia Recibida",
                    "transfer received": "Transferencia Recibida",
                    "transfer_in": "Transferencia Recibida",
                    "transfer in": "Transferencia Recibida",
                    "transfer_sent": "Transferencia Enviada",
                    "transfer sent": "Transferencia Enviada",
                    "transfer_out": "Transferencia Enviada",
                    "transfer out": "Transferencia Enviada",
                    "yield_payout_reversed": "Rendimiento Revertido",
                    "yield payout reversed": "Rendimiento Revertido",
                    "yield_payout_reversal": "Reversión de Rendimiento",
                    "yield payout reversal": "Reversión de Rendimiento",
                    "admin_adjustment": "Ajuste Administrativo",
                    "admin adjustment": "Ajuste Administrativo",
                    "adjustment": "Ajuste de Saldo",
                    "ingreso": "Abono / Rendimiento",
                    "egreso": "Débito de Fondos",
                    "capital_increase": "Aumento de Capital",
                    "capital increase": "Aumento de Capital",
                    "capital_withdrawal": "Retiro de Capital",
                    "capital withdrawal": "Retiro de Capital",
                    "pending_payout": "Pago Pendiente",
                    "pending payout": "Pago Pendiente",
                }
                raw_type = (t.type or "").strip().lower()
                clean_type = tx_type_map.get(raw_type, (t.type or "Movimiento").replace("_", " ").replace("-", " ").title())

                wallet_transactions_list.append({
                    "id": t.id,
                    "created_at": t_dt.isoformat() if t_dt else None,
                    "type": clean_type,
                    "description": t.description or clean_type,
                    "amount": t_amount,
                    "is_credit": t_amount >= 0,
                    "balance_after": t_balance_after
                })

        # 4. Fetch Withdrawals
        w_query = select(Withdrawal).where(Withdrawal.user_id == user_id)
        if start_dt:
            w_query = w_query.where(Withdrawal.created_at >= start_dt)
        if end_dt:
            w_query = w_query.where(Withdrawal.created_at <= end_dt)

        w_res = await db.execute(w_query.order_by(desc(Withdrawal.created_at)))
        withdrawals = w_res.scalars().all()

        withdrawals_list = []
        total_withdrawn_paid = 0.0
        total_withdrawn_pending = 0.0

        for w in withdrawals:
            w_tipo = w.tipo.value if hasattr(w.tipo, 'value') else str(w.tipo)
            w_estado = w.estado.value if hasattr(w.estado, 'value') else str(w.estado)
            monto_bruto = float(w.monto or 0)
            monto_neto = float(w.monto_neto or w.monto or 0)
            retencion = max(0.0, monto_bruto - monto_neto)

            if w_estado.lower() in ["aprobado", "procesado"]:
                total_withdrawn_paid += monto_neto
            elif w_estado.lower() == "pendiente":
                total_withdrawn_pending += monto_neto

            withdrawals_list.append({
                "id": w.id,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "fecha_solicitud": w.fecha_solicitud.isoformat() if w.fecha_solicitud else None,
                "fecha_aprobacion": w.fecha_aprobacion.isoformat() if hasattr(w, 'fecha_aprobacion') and w.fecha_aprobacion else None,
                "tipo": w_tipo,
                "monto_bruto": monto_bruto,
                "retencion": retencion,
                "monto_neto": monto_neto,
                "estado": w_estado,
                "banco": w.banco or "N/A",
                "tipo_cuenta": w.tipo_cuenta or "Ahorros",
                "numero_cuenta": w.numero_cuenta or "N/A",
                "metodo_pago": w.metodo_pago or "Transferencia Bancaria"
            })

        # 5. Fetch Active Investment Contracts
        from dateutil.relativedelta import relativedelta

        inv_res = await db.execute(
            select(Investor)
            .options(selectinload(Investor.package), selectinload(Investor.period))
            .where(Investor.user_id == user_id)
            .order_by(desc(Investor.created_at))
        )
        investors = inv_res.scalars().all()

        investments_list = []
        total_capital_invested = 0.0
        today_date = date.today()

        for inv in investors:
            pkg_val = float(inv.package.value) if inv.package else 0.0
            pct = float(inv.period.percentage) if inv.period else 0.0
            months = int(inv.period.months) if inv.period else 12

            inv_start = inv.start_date or inv.created_at
            is_active = True
            if inv_start:
                start_d = inv_start.date() if isinstance(inv_start, datetime) else inv_start
                end_d = start_d + relativedelta(months=months)
                if end_d <= today_date:
                    is_active = False

            estado = "Activo" if is_active else "Finalizado"
            if is_active:
                total_capital_invested += pkg_val

            investments_list.append({
                "id": inv.id,
                "assigned_code": inv.assigned_code or f"#{inv.id}",
                "capital": pkg_val,
                "porcentaje_mensual": pct,
                "meses": months,
                "fecha_inicio": inv.start_date.isoformat() if inv.start_date else None,
                "estado": estado,
                "observaciones": inv.observations or ""
            })

        # 6. Consolidate Statement Payload
        bank_accounts_list = [
            {
                "id": acc.id,
                "banco": acc.banco,
                "tipo_cuenta": acc.tipo_cuenta,
                "numero_cuenta": acc.numero_cuenta,
                "is_active": acc.is_active
            }
            for acc in (user.bank_accounts or [])
        ]

        return {
            "statement_date": datetime.now().isoformat(),
            "period": {
                "start_date": start_date_str or "Inicio de Operaciones",
                "end_date": end_date_str or datetime.now().strftime("%Y-%m-%d")
            },
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "document_id": user.document_id or "N/A",
                "phone_number": user.phone_number or "N/A",
                "date_of_birth": user.date_of_birth.isoformat() if hasattr(user.date_of_birth, 'isoformat') and user.date_of_birth else str(user.date_of_birth) if user.date_of_birth else None,
                "roles": [r.name for r in (user.roles or [])]
            },
            "bank_accounts": bank_accounts_list,
            "wallet": {
                "id": wallet.id if wallet else None,
                "balance": float(wallet.balance) if wallet else 0.0,
                "currency": wallet.currency if wallet else "COP",
                "status": wallet.status.value if wallet and hasattr(wallet.status, 'value') else str(wallet.status) if wallet else "active"
            },
            "summary": {
                "opening_balance": opening_balance,
                "total_credits": total_credits,
                "total_debits": total_debits,
                "closing_balance": float(wallet.balance) if wallet else 0.0,
                "total_withdrawn_paid": total_withdrawn_paid,
                "total_withdrawn_pending": total_withdrawn_pending,
                "total_capital_invested": total_capital_invested
            },
            "transactions": wallet_transactions_list,
            "withdrawals": withdrawals_list,
            "investments": investments_list
        }

    @staticmethod
    async def get_global_account_statement(
        db: AsyncSession,
        start_date_str: str = None,
        end_date_str: str = None,
        user_id: int = None,
        tx_type: str = None
    ) -> dict:
        from src.models.wallet import Wallet, WalletTransaction
        from src.models.withdrawal import Withdrawal
        from src.models.investor import Investor
        from src.models.package import Package
        from src.models.period import Period
        from src.models.user import User
        from datetime import datetime, date, time
        from sqlalchemy import desc, asc, and_, func
        from dateutil.relativedelta import relativedelta

        # 1. Parse dates if provided
        start_dt = None
        end_dt = None
        if start_date_str:
            try:
                start_dt = datetime.combine(datetime.strptime(start_date_str, "%Y-%m-%d").date(), time.min)
            except Exception:
                pass
        if end_date_str:
            try:
                end_dt = datetime.combine(datetime.strptime(end_date_str, "%Y-%m-%d").date(), time.max)
            except Exception:
                pass

        # 2. Fetch all wallets total current balance
        total_wallets_balance_res = await db.execute(select(func.sum(Wallet.balance)))
        total_wallets_balance = float(total_wallets_balance_res.scalar_one() or 0.0)

        # 3. Fetch all Wallet Transactions joining Wallet and User
        tx_query = (
            select(WalletTransaction, User)
            .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
            .join(User, Wallet.user_id == User.id)
        )
        if user_id:
            tx_query = tx_query.where(User.id == user_id)
        if start_dt:
            tx_query = tx_query.where(WalletTransaction.created_at >= start_dt)
        if end_dt:
            tx_query = tx_query.where(WalletTransaction.created_at <= end_dt)

        tx_res = await db.execute(tx_query.order_by(desc(WalletTransaction.created_at), desc(WalletTransaction.id)))
        all_tx_records = tx_res.all()

        tx_type_map = {
            "yield_payout": "Pago de Rendimientos",
            "yield payout": "Pago de Rendimientos",
            "bonus_payout": "Pago de Bono",
            "bonus payout": "Pago de Bono",
            "withdrawal_request": "Solicitud de Retiro",
            "withdrawal request": "Solicitud de Retiro",
            "withdrawal_refund": "Reembolso de Retiro",
            "withdrawal refund": "Reembolso de Retiro",
            "withdrawal_rejection": "Rechazo de Retiro",
            "withdrawal rejection": "Rechazo de Retiro",
            "investment_reservation": "Reserva de Inversión",
            "investment reservation": "Reserva de Inversión",
            "investment_payment": "Pago de Inversión",
            "investment payment": "Pago de Inversión",
            "transfer_received": "Transferencia Recibida",
            "transfer received": "Transferencia Recibida",
            "transfer_in": "Transferencia Recibida",
            "transfer in": "Transferencia Recibida",
            "transfer_sent": "Transferencia Enviada",
            "transfer sent": "Transferencia Enviada",
            "transfer_out": "Transferencia Enviada",
            "transfer out": "Transferencia Enviada",
            "yield_payout_reversed": "Rendimiento Revertido",
            "yield payout reversed": "Rendimiento Revertido",
            "yield_payout_reversal": "Reversión de Rendimiento",
            "yield payout reversal": "Reversión de Rendimiento",
            "admin_adjustment": "Ajuste Administrativo",
            "admin adjustment": "Ajuste Administrativo",
            "adjustment": "Ajuste de Saldo",
            "ingreso": "Abono / Rendimiento",
            "egreso": "Débito de Fondos",
            "capital_increase": "Aumento de Capital",
            "capital increase": "Aumento de Capital",
            "capital_withdrawal": "Retiro de Capital",
            "capital withdrawal": "Retiro de Capital",
            "pending_payout": "Pago Pendiente",
            "pending payout": "Pago Pendiente",
        }

        transactions_list = []
        total_credits = 0.0
        total_debits = 0.0

        for t, u in all_tx_records:
            t_amount = float(t.amount or 0)
            if t_amount >= 0:
                total_credits += t_amount
            else:
                total_debits += abs(t_amount)

            raw_type = (t.type or "").strip().lower()
            clean_type = tx_type_map.get(raw_type, (t.type or "Movimiento").replace("_", " ").replace("-", " ").title())

            if tx_type and clean_type != tx_type and raw_type != tx_type.lower():
                continue

            transactions_list.append({
                "id": t.id,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "user_id": u.id,
                "user_name": u.name,
                "user_document": u.document_id or "N/A",
                "type": clean_type,
                "raw_type": t.type,
                "description": t.description or clean_type,
                "amount": t_amount,
                "is_credit": t_amount >= 0,
                "balance_after": float(t.balance_after or 0)
            })

        # 4. Fetch Withdrawals with User and Bank info
        w_query = select(Withdrawal, User).join(User, Withdrawal.user_id == User.id)
        if user_id:
            w_query = w_query.where(User.id == user_id)
        if start_dt:
            w_query = w_query.where(Withdrawal.created_at >= start_dt)
        if end_dt:
            w_query = w_query.where(Withdrawal.created_at <= end_dt)

        w_res = await db.execute(w_query.order_by(desc(Withdrawal.created_at)))
        all_w_records = w_res.all()

        withdrawals_list = []
        total_withdrawn_paid = 0.0
        total_withdrawn_pending = 0.0
        total_gmf_tax = 0.0

        for w, u in all_w_records:
            amount = float(w.amount or 0)
            gmf = float(getattr(w, 'gmf_amount', 0) or 0)
            net = float(getattr(w, 'net_amount', amount - gmf) or (amount - gmf))
            w_status = (w.status or "pendiente").lower()

            if w_status in ["aprobado", "approved", "pagado", "paid", "completado"]:
                total_withdrawn_paid += amount
                total_gmf_tax += gmf
            elif w_status in ["pendiente", "pending", "procesado", "processed"]:
                total_withdrawn_pending += amount

            withdrawals_list.append({
                "id": w.id,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "user_id": u.id,
                "user_name": u.name,
                "user_document": u.document_id or "N/A",
                "bank_name": w.bank_name or "Banco Registrado",
                "account_number": w.account_number or "N/A",
                "account_type": w.account_type or "Ahorros",
                "amount": amount,
                "gmf_tax": gmf,
                "net_amount": net,
                "status": w.status or "pendiente",
                "rejection_reason": w.rejection_reason if hasattr(w, 'rejection_reason') else None
            })

        # 5. Fetch Active & Finished Investments
        inv_query = (
            select(Investor, User)
            .join(User, Investor.user_id == User.id)
            .options(selectinload(Investor.package), selectinload(Investor.period))
        )
        if user_id:
            inv_query = inv_query.where(User.id == user_id)

        inv_res = await db.execute(inv_query.order_by(desc(Investor.created_at)))
        all_inv_records = inv_res.all()

        investments_list = []
        total_capital_active = 0.0
        total_capital_finished = 0.0
        today_date = date.today()
        active_users_set = set()

        for inv, u in all_inv_records:
            pkg_val = float(inv.package.value) if inv.package else 0.0
            pct = float(inv.period.percentage) if inv.period else 0.0
            months = int(inv.period.months) if inv.period else 12

            inv_start = inv.start_date or inv.created_at
            is_active = True
            if inv_start:
                start_d = inv_start.date() if isinstance(inv_start, datetime) else inv_start
                end_d = start_d + relativedelta(months=months)
                if end_d <= today_date:
                    is_active = False

            if is_active:
                total_capital_active += pkg_val
                active_users_set.add(u.id)
            else:
                total_capital_finished += pkg_val

            investments_list.append({
                "id": inv.id,
                "user_id": u.id,
                "user_name": u.name,
                "user_document": u.document_id or "N/A",
                "assigned_code": inv.assigned_code or f"#{inv.id}",
                "capital": pkg_val,
                "porcentaje_mensual": pct,
                "meses": months,
                "fecha_inicio": inv.start_date.isoformat() if inv.start_date else None,
                "estado": "Activo" if is_active else "Finalizado",
                "observaciones": inv.observations or ""
            })

        return {
            "statement_date": datetime.now().isoformat(),
            "period": {
                "start_date": start_date_str or "Inicio de Operaciones",
                "end_date": end_date_str or datetime.now().strftime("%Y-%m-%d")
            },
            "summary": {
                "total_wallets_balance": total_wallets_balance,
                "total_credits": total_credits,
                "total_debits": total_debits,
                "total_withdrawn_paid": total_withdrawn_paid,
                "total_withdrawn_pending": total_withdrawn_pending,
                "total_gmf_tax": total_gmf_tax,
                "total_capital_active": total_capital_active,
                "total_capital_finished": total_capital_finished,
                "active_investors_count": len(active_users_set)
            },
            "transactions": transactions_list,
            "withdrawals": withdrawals_list,
            "investments": investments_list
        }
