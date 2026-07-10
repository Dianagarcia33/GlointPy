import csv
import io
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError

from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus

logger = logging.getLogger(__name__)

class InvestmentRequestService:
    
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
