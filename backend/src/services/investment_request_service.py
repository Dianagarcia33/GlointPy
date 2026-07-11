import csv
import io
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from sqlalchemy.future import select
from sqlalchemy import or_, func
from sqlalchemy.orm import selectinload
from typing import Dict, Any, Optional

from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
from src.models.user import User

logger = logging.getLogger(__name__)

class InvestmentRequestService:
    
    @staticmethod
    async def get_investment_requests(db: AsyncSession, page: int = 1, limit: int = 20, search: Optional[str] = None) -> Dict[str, Any]:
        query = select(InvestmentRequest).options(
            selectinload(InvestmentRequest.user),
            selectinload(InvestmentRequest.package)
        )
        
        if search:
            search_pattern = f"%{search}%"
            query = query.join(User).filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        # Count total (sin usar subquery para evitar problemas en SQLAlchemy)
        count_query = select(func.count(InvestmentRequest.id))
        if search:
            count_query = count_query.join(User).filter(
                or_(
                    User.name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.document_id.ilike(search_pattern)
                )
            )
            
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        
        # Pagination
        query = query.order_by(InvestmentRequest.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        requests = result.scalars().all()
        
        logger.info(f"DEBUG: count_query returned total={total}")
        logger.info(f"DEBUG: query returned {len(requests)} rows")
        if not requests:
            # Check raw count via text query just to be absolutely sure
            from sqlalchemy import text
            raw_count = await db.execute(text("SELECT COUNT(*) FROM investment_requests"))
            raw_total = raw_count.scalar()
            logger.info(f"DEBUG: raw SQL COUNT(*) FROM investment_requests = {raw_total}")
        
        return {
            "data": requests,
            "total": total
        }

    @staticmethod
    def parse_datetime(date_str: str) -> datetime | None:
        if not date_str or date_str.strip() == "":
            return None
        # Intenta parsear con formato estándar de base de datos
        try:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                return None

    @staticmethod
    async def bulk_create_investment_requests(db: AsyncSession, csv_text: str) -> Dict[str, Any]:
        if csv_text.startswith('\ufeff'):
            csv_text = csv_text[1:]
            
        lines = csv_text.splitlines()
        first_line = lines[0] if lines else ""
        
        # Detect delimiter (Tab, Semicolon, or Comma)
        if first_line.count('\t') > first_line.count(';') and first_line.count('\t') > first_line.count(','):
            delim = '\t'
        elif first_line.count(';') >= first_line.count(','):
            delim = ';'
        else:
            delim = ','
        
        # Split line manually to normalize field names (handle BOM and spaces)
        raw_fieldnames = first_line.strip().split(delim)
        fieldnames = [f.replace('\ufeff', '').strip(' "') for f in raw_fieldnames]
        
        reader = csv.DictReader(io.StringIO(csv_text), delimiter=delim, fieldnames=fieldnames)
        
        # Skip the first row since we provided fieldnames manually
        next(reader, None)
        
        # Read all rows into memory to do bulk validation
        rows_data = list(reader)
        
        # Collect all user IDs to check existence
        user_ids_to_check = set()
        for row in rows_data:
            u_id = str(row.get("user_id", "")).strip(' "')
            r_by = str(row.get("reviewed_by", "")).strip(' "')
            if u_id.isdigit(): user_ids_to_check.add(int(u_id))
            if r_by.isdigit(): user_ids_to_check.add(int(r_by))
            
        valid_users = set()
        if user_ids_to_check:
            user_query = select(User.id).where(User.id.in_(user_ids_to_check))
            user_result = await db.execute(user_query)
            valid_users = set(user_result.scalars().all())
        
        success_count = 0
        errors = []
        
        for i, row in enumerate(rows_data, start=1):
            try:
                # Normalizamos las claves del diccionario por si alguna vino con espacios
                # y convertimos 'NULL' o '\N' a strings vacíos
                clean_row = {}
                for k, v in row.items():
                    if k is not None:
                        clean_k = k.strip(' "')
                        clean_v = str(v).strip() if v is not None else ""
                        if clean_v.upper() in ('NULL', '\\N', 'NONE'):
                            clean_v = ""
                        clean_row[clean_k] = clean_v
                row = clean_row
                
                # Si toda la fila está vacía, ignorarla (por si Excel deja filas extra al final)
                if not any(v for v in row.values()):
                    continue
                    
                user_id_str = row.get("user_id", "")
                paquete_id_str = row.get("paquete_inversion_id", "")
                monto_str = row.get("monto", "")
                
                if not user_id_str or not paquete_id_str or not monto_str:
                    errors.append(f"Fila {i}: 'user_id', 'paquete_inversion_id' y 'monto' son obligatorios.")
                    continue
                    
                try:
                    u_id = int(user_id_str)
                    if u_id not in valid_users:
                        errors.append(f"Fila {i}: El usuario con ID {u_id} no existe en el sistema. Fila omitida.")
                        continue
                except ValueError:
                    pass
                    
                status_str = row.get("status", "")
                if not status_str:
                    status_str = "pending"
                    
                req = InvestmentRequest(
                    user_id=int(user_id_str),
                    paquete_inversion_id=int(paquete_id_str),
                    monto=float(monto_str),
                    status=InvestmentRequestStatus(status_str)
                )
                
                req_id_str = row.get("id", "")
                if req_id_str:
                    req.id = int(req_id_str)
                
                # Campos opcionales numéricos
                inv_id = row.get("investor_id", "")
                if inv_id: req.investor_id = int(inv_id)
                
                prosp_id = row.get("prospecto_id", "")
                if prosp_id: req.prospecto_id = int(prosp_id)
                
                rev_by = row.get("reviewed_by", "")
                if rev_by: 
                    try:
                        r_id = int(rev_by)
                        if r_id in valid_users:
                            req.reviewed_by = r_id
                        else:
                            req.reviewed_by = None # Si el revisor no existe, lo dejamos nulo en vez de fallar toda la tabla
                    except ValueError:
                        pass
                
                # Campos opcionales de texto
                req.comprobante_path = row.get("comprobante_path", "") or None
                req.rejection_reason = row.get("rejection_reason", "") or None
                req.extra_data = row.get("extra_data", "") or None
                
                # Fechas
                if "reviewed_at" in row:
                    req.reviewed_at = InvestmentRequestService.parse_datetime(row.get("reviewed_at", ""))
                if "created_at" in row:
                    req.created_at = InvestmentRequestService.parse_datetime(row.get("created_at", ""))
                if "updated_at" in row:
                    req.updated_at = InvestmentRequestService.parse_datetime(row.get("updated_at", ""))
                if "deleted_at" in row:
                    req.deleted_at = InvestmentRequestService.parse_datetime(row.get("deleted_at", ""))
                    
                db.add(req)
                success_count += 1
                
            except Exception as e:
                errors.append(f"Fila {i}: {str(e)}")
                
        try:
            await db.commit()
        except SQLAlchemyError as e:
            await db.rollback()
            logger.error(f"Database error during bulk upload: {e}")
            errors.append("Error fatal al guardar los registros en la base de datos.")
            success_count = 0
            
        return {"success": success_count, "errors": errors}
