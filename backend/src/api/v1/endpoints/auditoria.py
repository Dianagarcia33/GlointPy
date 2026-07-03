from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user

router = APIRouter()

@router.get("/respaldo", response_model=List[Dict[str, Any]])
async def get_inversiones_respaldo(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Obtiene los registros de la tabla de respaldo de inversiones (investor_respaldo o investment_requests_respaldo)
    """
    # Verificamos que sea admin
    is_admin = current_user.email == "superadmin@gloint.com"
    if hasattr(current_user, 'roles') and current_user.roles:
        for r in current_user.roles:
            if getattr(r, 'name', '') in ["admin", "superadmin"]:
                is_admin = True
                break
                
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    try:
        # Consultamos la tabla investor_respaldo con los JOINs solicitados
        query = text("""
            SELECT 
                ir.*,
                u.name as user_name,
                u.email as user_email,
                p.paquete_accion_adquirido as nombre_paquete,
                cp.name as nombre_periodo,
                cp.months as meses_periodo
            FROM investor_respaldo ir
            LEFT JOIN users u ON ir.user_id = u.id
            LEFT JOIN paquetes_inversion p ON ir.paquete_inversion_adquirido = p.id
            LEFT JOIN contract_periods cp ON ir.periodo_contrato = cp.id
            ORDER BY ir.user_id DESC, ir.id DESC
        """)
        result = await db.execute(query)
        rows = result.fetchall()
        
        # Agrupamos por usuario pero manteniendo las inversiones independientes
        grouped_data = {}
        for row in rows:
            uid = row.user_id or f"temp_{row.id}"
            
            if uid not in grouped_data:
                grouped_data[uid] = {
                    "user_id": uid,
                    "user_name": row.user_name or f"{row.nombre or ''} {row.apellido or ''}".strip(),
                    "user_email": row.user_email or row.correo_electronico,
                    "inversiones": []
                }
                
            inversion_detail = {
                "id": row.id,
                "codigo_asignado": row.codigo_asignado or 'N/A',
                "monto": row.total_contrato or 0,
                "nombre_paquete": row.nombre_paquete or 'N/A',
                "nombre_periodo": row.nombre_periodo or 'N/A',
                "meses_periodo": row.meses_periodo,
                "estado": row.estado,
                "created_at": row.created_at
            }
            grouped_data[uid]["inversiones"].append(inversion_detail)
            
        return list(grouped_data.values())
        
    except Exception as e:
        print(f"Error fetching from respaldo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
