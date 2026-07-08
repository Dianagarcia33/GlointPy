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
from src.schemas.investor import InvestorCreate, InvestorUpdate

class InvestorService:
    @staticmethod
    async def _calculate_end_date(db: AsyncSession, period_id: int, start_date: datetime) -> datetime:
        result = await db.execute(select(Period).where(Period.id == period_id))
        period = result.scalars().first()
        if not period:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Period not found"
            )
        
        end_date = start_date + relativedelta(months=period.months, days=period.days)
        return end_date

    @staticmethod
    async def get_investors(db: AsyncSession, skip: int = 0, limit: int = 100) -> Sequence[Investor]:
        result = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.user),
                selectinload(Investor.package),
                selectinload(Investor.period)
            )
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    @staticmethod
    async def get_investor(db: AsyncSession, investor_id: int) -> Optional[Investor]:
        result = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.user),
                selectinload(Investor.package),
                selectinload(Investor.period)
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
        end_date = await InvestorService._calculate_end_date(db, investor.period_id, start_date)

        db_investor = Investor(
            assigned_code=investor.assigned_code,
            referred_by=investor.referred_by,
            user_id=investor.user_id,
            package_id=investor.package_id,
            period_id=investor.period_id,
            start_date=start_date,
            end_date=end_date,
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
        db_investor = await InvestorService.get_investor(db, investor_id)

        update_data = investor.model_dump(exclude_unset=True)
        
        # Check if we need to recalculate end_date
        period_id = update_data.get("period_id", db_investor.period_id)
        start_date = update_data.get("start_date", db_investor.start_date)
        
        if "period_id" in update_data or "start_date" in update_data:
            update_data["end_date"] = await InvestorService._calculate_end_date(db, period_id, start_date)

        for field, value in update_data.items():
            setattr(db_investor, field, value)

        try:
            await db.commit()
            await db.refresh(db_investor)
            return await InvestorService.get_investor(db, db_investor.id)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned code already exists or invalid data provided"
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
                
                user_email = row.get('usuario', '') or row.get('email', '') or row.get('correo', '')
                if not user_email:
                    errors.append(f"Fila {row_num}: Falta el correo del usuario.")
                    continue
                
                # Buscar usuario por email
                user_res = await db.execute(select(User).where(User.email == user_email.strip()))
                user = user_res.scalars().first()
                if not user:
                    errors.append(f"Fila {row_num}: Usuario con email {user_email} no encontrado.")
                    continue
                
                package_value = row.get('paquete', '') or row.get('valor', '') or row.get('package', '')
                if not package_value:
                    errors.append(f"Fila {row_num}: Falta el valor del paquete.")
                    continue
                
                try:
                    p_value = int(float(str(package_value).replace(',', '').replace('$', '').strip()))
                except ValueError:
                    errors.append(f"Fila {row_num}: Valor de paquete inválido '{package_value}'.")
                    continue
                
                # Buscar paquete por valor
                package_res = await db.execute(select(Package).where(Package.value == p_value))
                package = package_res.scalars().first()
                if not package:
                    errors.append(f"Fila {row_num}: Paquete de valor {p_value} no encontrado.")
                    continue
                
                period_str = row.get('periodo', '') or row.get('meses', '') or row.get('period', '')
                if not period_str:
                    errors.append(f"Fila {row_num}: Falta los meses del periodo.")
                    continue
                
                try:
                    p_months = int(float(str(period_str).strip()))
                except ValueError:
                    errors.append(f"Fila {row_num}: Meses de periodo inválido '{period_str}'.")
                    continue
                
                # Buscar periodo por meses
                period_res = await db.execute(select(Period).where(Period.months == p_months))
                period = period_res.scalars().first()
                if not period:
                    errors.append(f"Fila {row_num}: Periodo de {p_months} meses no encontrado.")
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
                
                end_date = await InvestorService._calculate_end_date(db, period.id, start_date)

                investor_data = Investor(
                    assigned_code=str(assigned_code).strip(),
                    referred_by=str(referred_by).strip() if referred_by else None,
                    user_id=user.id,
                    package_id=package.id,
                    period_id=period.id,
                    start_date=start_date,
                    end_date=end_date,
                    observations=str(observations).strip() if observations else None
                )
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
