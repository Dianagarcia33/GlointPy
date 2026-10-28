from src.core.errors import public_error_detail
from src.core.search import like_contains, LIKE_ESCAPE
import csv
import io
import re
import logging
from typing import List, Optional, Sequence
from datetime import datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

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
        has_history: Optional[bool] = None,
        current_user: Optional[User] = None
    ) -> dict:
        from sqlalchemy import or_, func, case, Integer
        
        query = select(Investor).join(Investor.user)
        
        if search:
            search_term = like_contains(search)
            query = query.where(
                or_(
                    Investor.assigned_code.ilike(search_term, escape=LIKE_ESCAPE),
                    Investor.referred_by.ilike(search_term, escape=LIKE_ESCAPE),
                    User.name.ilike(search_term, escape=LIKE_ESCAPE),
                    User.email.ilike(search_term, escape=LIKE_ESCAPE),
                    User.document_id.ilike(search_term, escape=LIKE_ESCAPE)
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
            selectinload(Investor.user).selectinload(User.parent),
            selectinload(Investor.package),
            selectinload(Investor.period),
            selectinload(Investor.contract_histories),
            selectinload(Investor.accelerations),
            selectinload(Investor.withdrawals)
        )
        query = query.order_by(
            case(
                (Investor.assigned_code.like("IG%"), func.cast(func.substring(Investor.assigned_code, 3), Integer)),
                else_=0
            ).desc(),
            Investor.id.desc()
        ).offset(offset).limit(limit)
        
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
    async def generate_next_assigned_code(db: AsyncSession) -> str:
        """
        Genera de forma segura el siguiente código consecutivo único para un inversionista (ej. IG1000, IG1001, etc.).
        Garantiza que el número sea estrictamente superior al mayor número existente y que no colisione con ningún registro.
        """
        result = await db.execute(
            select(Investor.assigned_code)
            .where(Investor.assigned_code.like("IG%"))
        )
        codes = result.scalars().all()
        
        max_num = 999  # Base para iniciar mínimo en IG1000 si no existen o son menores
        for c in codes:
            if not c:
                continue
            match = re.search(r'\d+', c)
            if match:
                try:
                    num = int(match.group())
                    if num > max_num:
                        max_num = num
                except ValueError:
                    continue
                    
        next_num = max_num + 1
        candidate_code = f"IG{next_num}"
        
        # Salvaguarda anti-colisión en caso de códigos dispersos o concurrencia
        while True:
            existing = await db.execute(
                select(Investor.id).where(Investor.assigned_code == candidate_code)
            )
            if not existing.scalar_one_or_none():
                break
            next_num += 1
            candidate_code = f"IG{next_num}"
            
        return candidate_code

    @staticmethod
    def _ensure_start_date_not_future(start_date: Optional[datetime]) -> None:
        """La fecha de ingreso no puede ser futura: movería la fecha de fin y los rendimientos (H-142)."""
        from src.core.timezone import get_colombia_today
        # El formulario envía la fecha elegida a medianoche UTC: se compara el día tal cual, sin convertir
        if start_date and start_date.date() > get_colombia_today():
            raise HTTPException(status_code=422, detail="La fecha de ingreso no puede ser posterior a hoy.")

    @staticmethod
    async def create_investor(db: AsyncSession, investor: InvestorCreate) -> Investor:
        # Validate foreign keys
        user_result = await db.execute(select(User).where(User.id == investor.user_id))
        if not user_result.scalars().first():
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
        package_result = await db.execute(select(Package).where(Package.id == investor.package_id))
        if not package_result.scalars().first():
            raise HTTPException(status_code=404, detail="Paquete no encontrado")

        period_result = await db.execute(select(Period).where(Period.id == investor.period_id))
        if not period_result.scalars().first():
            raise HTTPException(status_code=404, detail="Periodo no encontrado")
            
        InvestorService._ensure_start_date_not_future(investor.start_date)
        start_date = investor.start_date or datetime.utcnow()

        if investor.assigned_code:
            assigned_code = investor.assigned_code.strip().upper()
            chk_code = await db.execute(select(Investor.id).where(Investor.assigned_code == assigned_code))
            if chk_code.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El código asignado '{assigned_code}' ya se encuentra registrado."
                )
        else:
            assigned_code = await InvestorService.generate_next_assigned_code(db)

        # H-70: Validar código de referido si se suministró
        clean_referred_by = None
        if investor.referred_by:
            clean_referred_by = investor.referred_by.strip().upper()
            ref_check = await db.execute(select(Investor.id).where(Investor.assigned_code == clean_referred_by))
            if not ref_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El código de referido '{clean_referred_by}' no corresponde a ninguna inversión registrada en la plataforma."
                )
            if assigned_code and clean_referred_by == assigned_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Un inversionista no puede referirse a sí mismo."
                )

        db_investor = Investor(
            assigned_code=assigned_code,
            referred_by=clean_referred_by,
            user_id=investor.user_id,
            package_id=investor.package_id,
            period_id=investor.period_id,
            start_date=start_date,
            observations=investor.observations
        )
        
        try:
            db.add(db_investor)
            await db.flush()

            # Otorgar acciones del paquete si aplica
            pkg_res = await db.execute(select(Package).where(Package.id == db_investor.package_id))
            pkg = pkg_res.scalar_one_or_none()
            if pkg and pkg.granted_shares and pkg.granted_shares > 0:
                from src.services.share_market_service import ShareMarketService
                pkg_val = f"${pkg.value:,.0f} COP" if pkg.value else ""
                desc = f"Otorgamiento de {pkg.granted_shares} acciones por adquisición de Paquete ({pkg_val}) - Contrato #{assigned_code}"
                await ShareMarketService.record_share_movement(
                    db=db,
                    user_id=db_investor.user_id,
                    movement_type="package_grant",
                    quantity=pkg.granted_shares,
                    description=desc,
                    investor_id=db_investor.id,
                    package_id=pkg.id,
                    created_at=db_investor.start_date or db_investor.created_at or datetime.utcnow()
                )

            await db.commit()
            await db.refresh(db_investor)
            # Re-fetch with relationships
            return await InvestorService.get_investor(db, db_investor.id)
        except IntegrityError as e:
            await db.rollback()
            logger.error(f"Error de integridad al registrar inversionista: {e}")
            orig_msg = str(getattr(e, 'orig', e))
            if "assigned_code" in orig_msg.lower():
                detail = f"El código de inversión '{assigned_code}' ya existe en el sistema."
            else:
                detail = f"Error de integridad en los datos: {orig_msg}"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=detail
            )

    @staticmethod
    async def update_investor(db: AsyncSession, investor_id: int, investor: InvestorUpdate) -> Investor:
        db_investor = await InvestorService.get_investor(db, investor_id)
        if not db_investor:
            raise HTTPException(status_code=404, detail="Inversionista no encontrado")

        old_referred_by = (db_investor.referred_by or "").strip()
        update_data = investor.model_dump(exclude_unset=True)
        if update_data.get("start_date"):
            InvestorService._ensure_start_date_not_future(update_data["start_date"])

        # Los bonos por referido (aceleraciones) ya no se aplican: el código de referido queda solo para
        # consultar los bonos antiguos. Cambiarlo crearía o borraría aceleraciones, así que se rechaza (H-140).
        if "referred_by" in update_data:
            requested_ref = (update_data.get("referred_by") or "").strip().upper()
            if requested_ref != old_referred_by.upper():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="El código de referido ya no se puede modificar: los bonos por referido están desactivados y los existentes se conservan solo para consulta."
                )
            update_data.pop("referred_by")

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

        old_package_id = db_investor.package_id
        new_package_id = update_data.get("package_id")

        for field, value in update_data.items():
            setattr(db_investor, field, value)

        if new_package_id and new_package_id != old_package_id:
            from src.models.package import Package
            from src.services.share_market_service import ShareMarketService
            old_pkg_res = await db.execute(select(Package).where(Package.id == old_package_id))
            old_pkg = old_pkg_res.scalar_one_or_none()
            prev_pkg_shares = old_pkg.granted_shares if old_pkg and old_pkg.granted_shares else 0

            new_pkg_res = await db.execute(select(Package).where(Package.id == new_package_id))
            new_pkg = new_pkg_res.scalar_one_or_none()
            new_pkg_shares = new_pkg.granted_shares if new_pkg and new_pkg.granted_shares else 0

            shares_diff = new_pkg_shares - prev_pkg_shares
            if shares_diff > 0:
                pkg_val = f"${new_pkg.value:,.0f} COP" if new_pkg and new_pkg.value else ""
                desc = f"Otorgamiento de {shares_diff} acciones adicionales por aumento de capital a Paquete ({pkg_val}) - Contrato #{db_investor.assigned_code}"
                await ShareMarketService.record_share_movement(
                    db=db,
                    user_id=db_investor.user_id,
                    movement_type="package_grant",
                    quantity=shares_diff,
                    description=desc,
                    investor_id=db_investor.id,
                    package_id=new_pkg.id if new_pkg else None,
                    created_at=datetime.utcnow()
                )

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
        
        # Sincronizar y actualizar las solicitudes asociadas para evitar estados huérfanos 'Aprobado'
        from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
        req_stmt = select(InvestmentRequest).where(InvestmentRequest.investor_id == investor_id)
        req_result = await db.execute(req_stmt)
        associated_requests = req_result.scalars().all()
        for req in associated_requests:
            req.status = InvestmentRequestStatus.rejected
            req.rejection_reason = "Contrato de inversión eliminado o anulado por la administración."
            req.investor_id = None
            
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
                raise HTTPException(status_code=400, detail=public_error_detail("Error al guardar en base de datos", e))

        return {
            "success": success_count,
            "errors": errors
        }
