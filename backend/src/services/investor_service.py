from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from typing import List, Optional, Sequence
from datetime import datetime
from dateutil.relativedelta import relativedelta
import csv
import io
import re

from src.models.investor import Investor
from src.models.period import Period
from src.models.package import Package
from src.models.user import User
from src.models.security import Role
from src.models.user_bank_account import UserBankAccount
from src.models.wallet import Wallet
from src.schemas.investor import InvestorCreate, InvestorUpdate

class InvestorService:

    @staticmethod
    async def get_investors(
        db: AsyncSession, 
        page: int = 1, 
        limit: int = 20, 
        search: Optional[str] = None,
        has_history: Optional[bool] = None
    ) -> dict:
        from sqlalchemy import or_, func
        
        query = select(Investor)
        
        if search:
            search_term = f"%{search}%"
            query = query.join(Investor.user).where(
                or_(
                    Investor.assigned_code.ilike(search_term),
                    Investor.referred_by.ilike(search_term),
                    User.name.ilike(search_term),
                    User.email.ilike(search_term),
                    User.document_id.ilike(search_term)
                )
            )
            
        if has_history is not None:
            if has_history:
                query = query.where(Investor.contract_histories.any())
            else:
                query = query.where(~Investor.contract_histories.any())
            
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one()
        
        # Paginate and fetch data
        offset = (page - 1) * limit
        query = query.options(
            selectinload(Investor.user).selectinload(User.roles).selectinload(Role.permissions),
            selectinload(Investor.user).selectinload(User.bank_accounts),
            selectinload(Investor.user).selectinload(User.wallet),
            selectinload(Investor.package),
            selectinload(Investor.period),
            selectinload(Investor.contract_histories),
            selectinload(Investor.accelerations),
            selectinload(Investor.withdrawals)
        )
        query = query.order_by(Investor.id.desc()).offset(offset).limit(limit)
        
        result = await db.execute(query)
        data = result.scalars().all()
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "data": data
        }

    @staticmethod
    async def get_investor(db: AsyncSession, investor_id: int) -> Optional[Investor]:
        result = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.user).selectinload(User.roles).selectinload(Role.permissions),
                selectinload(Investor.user).selectinload(User.bank_accounts),
                selectinload(Investor.user).selectinload(User.wallet),
                selectinload(Investor.package),
                selectinload(Investor.period),
                selectinload(Investor.contract_histories),
                selectinload(Investor.accelerations),
                selectinload(Investor.withdrawals)
            )
            .where(Investor.id == investor_id)
        )
        investor = result.scalars().first()
        if not investor:
            raise HTTPException(status_code=404, detail="Investor not found")
        return investor

    @staticmethod
    async def create_investor(db: AsyncSession, investor: InvestorCreate) -> Investor:
        # Validate foreign keys
        user_result = await db.execute(select(User).where(User.id == investor.user_id))
        if not user_result.scalars().first():
            raise HTTPException(status_code=404, detail="User not found")
            
        package_result = await db.execute(select(Package).where(Package.id == investor.package_id))
        if not package_result.scalars().first():
            raise HTTPException(status_code=404, detail="Package not found")
            
        start_date = investor.start_date or datetime.utcnow()

        assigned_code = investor.assigned_code
        if not assigned_code:
            # Auto-generate consecutive IG code
            last_code_res = await db.execute(
                select(Investor.assigned_code)
                .where(Investor.assigned_code.like("IG%"))
                .order_by(Investor.id.desc())
                .limit(1)
            )
            last_code = last_code_res.scalar()
            if last_code:
                import re
                match = re.search(r'\d+', last_code)
                if match:
                    next_num = int(match.group()) + 1
                    assigned_code = f"IG{next_num}"
                else:
                    assigned_code = "IG1000"
            else:
                assigned_code = "IG1000"

        db_investor = Investor(
            assigned_code=assigned_code,
            referred_by=investor.referred_by,
            user_id=investor.user_id,
            package_id=investor.package_id,
            period_id=investor.period_id,
            start_date=start_date,
            observations=investor.observations
        )
        
        try:
            db.add(db_investor)
            await db.commit()
            await db.refresh(db_investor)
            # Re-fetch with relationships
            return await InvestorService.get_investor(db, db_investor.id)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned code already exists or invalid data provided"
            )

    @staticmethod
    async def update_investor(db: AsyncSession, investor_id: int, investor: InvestorUpdate) -> Investor:
        from src.models.acceleration import Acceleration
        from src.models.investment_request import InvestmentRequest
        from sqlalchemy import or_

        db_investor = await InvestorService.get_investor(db, investor_id)
        if not db_investor:
            raise HTTPException(status_code=404, detail="Inversionista no encontrado")

        old_referred_by = (db_investor.referred_by or "").strip()
        update_data = investor.model_dump(exclude_unset=True)
        new_referred_by = (update_data.get("referred_by") or "").strip() if "referred_by" in update_data else old_referred_by

        # Si el referido ha cambiado o se ha removido
        if "referred_by" in update_data and new_referred_by != old_referred_by:
            # 1. Si tenía un referido previo, eliminar las aceleraciones asociadas generadas a ese referente
            if old_referred_by:
                old_referrer_res = await db.execute(
                    select(Investor).where(Investor.assigned_code == old_referred_by)
                )
                old_referrer_inv = old_referrer_res.scalars().first()
                if old_referrer_inv:
                    accs_res = await db.execute(
                        select(Acceleration).where(
                            Acceleration.investor_id == old_referrer_inv.id
                        )
                    )
                    old_accs = accs_res.scalars().all()
                    for acc in old_accs:
                        # Si coincide el monto del bono (5%) o fue generado para este usuario
                        pkg_val = float(db_investor.package.value or 0) if db_investor.package else 0.0
                        expected_bonus = pkg_val * 0.05
                        if abs(float(acc.bonus_amount or 0) - expected_bonus) < 1.0 or acc.investment_request_id is not None:
                            await db.delete(acc)

            # 2. Si se ingresó un nuevo código de referido válido, crear la aceleración
            if new_referred_by:
                new_referrer_res = await db.execute(
                    select(Investor)
                    .options(selectinload(Investor.package), selectinload(Investor.period))
                    .where(Investor.assigned_code == new_referred_by)
                )
                new_referrer_inv = new_referrer_res.scalars().first()

                if new_referrer_inv and new_referrer_inv.package and new_referrer_inv.period:
                    pkg_val = float(db_investor.package.value or 0) if db_investor.package else 0.0
                    bonus_amount = pkg_val * 0.05

                    ref_package_val = float(new_referrer_inv.package.value or 0)
                    ref_pct = float(new_referrer_inv.period.percentage or 0) / 100.0
                    ref_months = float(new_referrer_inv.period.months or 0)
                    ref_days = float(new_referrer_inv.period.days or 0)

                    if ref_days > 0 and ref_package_val > 0:
                        rendimiento_mensual = ref_package_val * ref_pct
                        rendimiento_total = rendimiento_mensual * ref_months
                        daily_yield = rendimiento_total / ref_days
                        days_to_reduce = (bonus_amount / daily_yield) if daily_yield > 0 else 0.0
                    else:
                        days_to_reduce = 0.0

                    # Obtain a valid investment_request_id to satisfy MySQL non-null table constraints
                    inv_req_res = await db.execute(
                        select(InvestmentRequest).where(
                            or_(
                                InvestmentRequest.investor_id == db_investor.id,
                                InvestmentRequest.user_id == db_investor.user_id
                            )
                        )
                    )
                    req = inv_req_res.scalars().first()
                    req_id = req.id if req else None
                    if not req_id:
                        any_req = await db.execute(select(InvestmentRequest.id).limit(1))
                        req_id = any_req.scalar()

                    new_acc = Acceleration(
                        investor_id=new_referrer_inv.id,
                        investment_request_id=req_id,
                        contract_period_id=new_referrer_inv.period_id,
                        original_days=new_referrer_inv.period.days,
                        acceleration_percentage=5.00,
                        days_to_reduce=days_to_reduce,
                        bonus_amount=bonus_amount,
                        applied=True
                    )
                    db.add(new_acc)

        if "assigned_code" in update_data and update_data["assigned_code"]:
            code_check = await db.execute(
                select(Investor).where(
                    Investor.assigned_code == update_data["assigned_code"],
                    Investor.id != investor_id
                )
            )
            if code_check.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El código asignado '{update_data['assigned_code']}' ya pertenece a otro inversionista."
                )

        for field, value in update_data.items():
            setattr(db_investor, field, value)

        try:
            await db.commit()
            await db.refresh(db_investor)
            return await InvestorService.get_investor(db, db_investor.id)
        except IntegrityError as e:
            await db.rollback()
            err_msg = str(e.orig) if hasattr(e, 'orig') else str(e)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Error al actualizar inversionista: {err_msg}"
            )

    @staticmethod
    async def delete_investor(db: AsyncSession, investor_id: int):
        db_investor = await InvestorService.get_investor(db, investor_id)
        
        await db.delete(db_investor)
        await db.commit()

    @staticmethod
    async def bulk_create_investors(db: AsyncSession, csv_text: str) -> dict:
        f = io.StringIO(csv_text)
        sniffer = csv.Sniffer()
        try:
            dialect = sniffer.sniff(csv_text[:1024])
        except csv.Error:
            dialect = csv.excel
        
        f.seek(0)
        reader = csv.DictReader(f, dialect=dialect)
        if not reader.fieldnames:
            raise HTTPException(status_code=400, detail="El archivo CSV está vacío o no tiene cabeceras válidas.")
        
        # Normalize headers
        headers = [h.strip().lower() for h in reader.fieldnames]
        reader.fieldnames = headers

        success_count = 0
        errors = []
        row_num = 1

        for row in reader:
            row_num += 1
            try:
                assigned_code = row.get('codigo', '') or row.get('codigo asignado', '') or row.get('assigned_code', '')
                if not assigned_code:
                    errors.append(f"Fila {row_num}: Falta el código asignado.")
                    continue
                
                referred_by = row.get('referido', '') or row.get('referred_by', '')
                
                user_id_str = row.get('usuario_id', '') or row.get('user_id', '')
                if not user_id_str:
                    errors.append(f"Fila {row_num}: Falta el ID del usuario (usuario_id).")
                    continue
                
                try:
                    u_id = int(str(user_id_str).strip())
                except ValueError:
                    errors.append(f"Fila {row_num}: usuario_id inválido '{user_id_str}'.")
                    continue
                    
                # Buscar usuario por ID
                user_res = await db.execute(select(User).where(User.id == u_id))
                user = user_res.scalars().first()
                if not user:
                    errors.append(f"Fila {row_num}: Usuario con ID {u_id} no encontrado.")
                    continue
                
                package_id_str = row.get('paquete_id', '') or row.get('package_id', '')
                if not package_id_str:
                    errors.append(f"Fila {row_num}: Falta el ID del paquete (paquete_id).")
                    continue
                
                try:
                    p_id = int(str(package_id_str).strip())
                except ValueError:
                    errors.append(f"Fila {row_num}: paquete_id inválido '{package_id_str}'.")
                    continue
                
                # Buscar paquete por ID
                package_res = await db.execute(select(Package).where(Package.id == p_id))
                package = package_res.scalars().first()
                if not package:
                    errors.append(f"Fila {row_num}: Paquete con ID {p_id} no encontrado.")
                    continue
                
                period_id_str = row.get('periodo_id', '') or row.get('period_id', '')
                if not period_id_str:
                    errors.append(f"Fila {row_num}: Falta el ID del periodo (periodo_id).")
                    continue
                
                try:
                    per_id = int(str(period_id_str).strip())
                except ValueError:
                    errors.append(f"Fila {row_num}: periodo_id inválido '{period_id_str}'.")
                    continue
                
                # Buscar periodo por ID
                period_res = await db.execute(select(Period).where(Period.id == per_id))
                period = period_res.scalars().first()
                if not period:
                    errors.append(f"Fila {row_num}: Periodo con ID {per_id} no encontrado.")
                    continue

                start_date_str = row.get('fecha_ingreso', '') or row.get('fecha ingreso', '') or row.get('start_date', '')
                try:
                    if start_date_str:
                        # try to parse multiple formats
                        start_date = None
                        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
                            try:
                                start_date = datetime.strptime(start_date_str.strip(), fmt)
                                break
                            except ValueError:
                                pass
                        if not start_date:
                            raise ValueError()
                    else:
                        start_date = datetime.utcnow()
                except ValueError:
                    errors.append(f"Fila {row_num}: Fecha de ingreso inválida '{start_date_str}'. Formatos válidos: YYYY-MM-DD, DD/MM/YYYY")
                    continue
                
                observations = row.get('observaciones', '') or row.get('notas', '') or row.get('observations', '')
                investor_id_str = row.get('id', '')

                # Check if investor with assigned_code already exists
                existing_res = await db.execute(select(Investor).where(Investor.assigned_code == str(assigned_code).strip()))
                existing_investor = existing_res.scalars().first()
                
                if existing_investor:
                    # Update existing record
                    existing_investor.referred_by = str(referred_by).strip() if referred_by else None
                    existing_investor.user_id = user.id
                    existing_investor.package_id = package.id
                    existing_investor.period_id = period.id
                    existing_investor.start_date = start_date
                    existing_investor.observations = str(observations).strip() if observations else None
                    if investor_id_str and str(investor_id_str).strip().isdigit():
                        existing_investor.id = int(str(investor_id_str).strip())
                    success_count += 1
                else:
                    # Insert new record
                    investor_data = Investor(
                        assigned_code=str(assigned_code).strip(),
                        referred_by=str(referred_by).strip() if referred_by else None,
                        user_id=user.id,
                        package_id=package.id,
                        period_id=period.id,
                        start_date=start_date,
                        observations=str(observations).strip() if observations else None
                    )
                    if investor_id_str and str(investor_id_str).strip().isdigit():
                        investor_data.id = int(str(investor_id_str).strip())
                    db.add(investor_data)
                    success_count += 1
                
            except Exception as e:
                errors.append(f"Fila {row_num}: Error inesperado: {str(e)}")

        if success_count > 0:
            try:
                await db.commit()
            except Exception as e:
                await db.rollback()
                raise HTTPException(status_code=400, detail=f"Error al guardar en base de datos: {str(e)}")

        return {
            "success": success_count,
            "errors": errors
        }
