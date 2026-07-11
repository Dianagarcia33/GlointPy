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
            selectinload(InvestmentRequest.paquete)
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
            
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total = total_result.scalar_one_or_none() or 0
        
        # Pagination
        query = query.order_by(InvestmentRequest.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)
        
        result = await db.execute(query)
        requests = result.scalars().all()
        
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
        reader = csv.DictReader(io.StringIO(csv_text), delimiter=';')
        
        success_count = 0
        errors = []
        
        for i, row in enumerate(reader, start=1):
            try:
                user_id_str = row.get("user_id", "").strip()
                paquete_id_str = row.get("paquete_inversion_id", "").strip()
                monto_str = row.get("monto", "").strip()
                
                if not user_id_str or not paquete_id_str or not monto_str:
                    errors.append(f"Fila {i}: 'user_id', 'paquete_inversion_id' y 'monto' son obligatorios.")
                    continue
                    
                status_str = row.get("status", "pending").strip()
                if not status_str:
                    status_str = "pending"
                    
                req = InvestmentRequest(
                    user_id=int(user_id_str),
                    paquete_inversion_id=int(paquete_id_str),
                    monto=float(monto_str),
                    status=InvestmentRequestStatus(status_str)
                )
                
                req_id_str = row.get("id", "").strip()
                if req_id_str:
                    req.id = int(req_id_str)
                
                # Campos opcionales numéricos
                inv_id = row.get("investor_id", "").strip()
                if inv_id: req.investor_id = int(inv_id)
                
                prosp_id = row.get("prospecto_id", "").strip()
                if prosp_id: req.prospecto_id = int(prosp_id)
                
                rev_by = row.get("reviewed_by", "").strip()
                if rev_by: req.reviewed_by = int(rev_by)
                
                # Campos opcionales de texto
                req.comprobante_path = row.get("comprobante_path", "").strip() or None
                req.rejection_reason = row.get("rejection_reason", "").strip() or None
                req.extra_data = row.get("extra_data", "").strip() or None
                
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
