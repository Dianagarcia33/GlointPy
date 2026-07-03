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
        # 1. Inversiones
        query_inv = text("""
            SELECT 
                ir.*,
                u.name as user_name,
                u.email as user_email,
                p.paquete_accion_adquirido as nombre_paquete,
                cp.name as nombre_periodo,
                cp.months as meses_periodo,
                cp.days as dias_periodo
            FROM investor_respaldo ir
            LEFT JOIN users u ON ir.user_id = u.id
            LEFT JOIN paquetes_inversion p ON ir.paquete_inversion_adquirido = p.id
            LEFT JOIN contract_periods cp ON ir.periodo_contrato = cp.id
            ORDER BY ir.user_id DESC, ir.id DESC
        """)
        res_inv = await db.execute(query_inv)
        
        # 2. Retiros
        query_ret = text("""
            SELECT rr.*, u.name as user_name, u.email as user_email 
            FROM retiros_respaldo rr 
            LEFT JOIN users u ON rr.user_id = u.id 
            ORDER BY rr.user_id DESC, rr.id DESC
        """)
        res_ret = await db.execute(query_ret)
        
        # 3. Requests
        query_req = text("""
            SELECT rq.*, u.name as user_name, u.email as user_email 
            FROM investment_requests_respaldo rq 
            LEFT JOIN users u ON rq.user_id = u.id 
            ORDER BY rq.user_id DESC, rq.id DESC
        """)
        res_req = await db.execute(query_req)
        
        # 4. Accelerations
        query_acc = text("""
            SELECT ca.*, ir.user_id, u.name as user_name, u.email as user_email 
            FROM contract_accelerations_respaldo ca 
            LEFT JOIN investor_respaldo ir ON ca.investor_id = ir.id 
            LEFT JOIN users u ON ir.user_id = u.id 
            ORDER BY ir.user_id DESC, ca.id DESC
        """)
        res_acc = await db.execute(query_acc)
        
        # 5. Histories
        query_hist = text("""
            SELECT ch.*, ir.user_id, u.name as user_name, u.email as user_email 
            FROM contract_histories_respaldo ch 
            LEFT JOIN investor_respaldo ir ON ch.investor_id = ir.id 
            LEFT JOIN users u ON ir.user_id = u.id 
            ORDER BY ir.user_id DESC, ch.id DESC
        """)
        res_hist = await db.execute(query_hist)
        
        grouped_data = {}
        
        def ensure_user(uid, row):
            if uid not in grouped_data:
                u_name = getattr(row, 'user_name', None) or getattr(row, 'nombre', None) or ""
                if getattr(row, 'apellido', None):
                    u_name += f" {row.apellido}"
                
                grouped_data[uid] = {
                    "user_id": uid,
                    "user_name": str(u_name).strip(),
                    "user_email": getattr(row, 'user_email', None) or getattr(row, 'correo_electronico', None) or "",
                    "inversiones": [],
                    "retiros": [],
                    "requests": [],
                    "accelerations": [],
                    "histories": []
                }
                
        for row in res_inv.fetchall():
            uid = row.user_id or f"temp_inv_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["inversiones"].append({
                "id": row.id,
                "codigo_asignado": row.codigo_asignado or 'N/A',
                "monto": row.total_contrato or 0,
                "nombre_paquete": row.nombre_paquete or 'N/A',
                "nombre_periodo": row.nombre_periodo or 'N/A',
                "meses_periodo": row.meses_periodo,
                "dias_periodo": row.dias_periodo,
                "estado": row.estado,
                "created_at": row.created_at,
                "fecha_ingreso": row.fecha_ingreso,
                "fecha_finalizacion": row.fecha_finalizacion
            })
            
        for row in res_ret.fetchall():
            uid = row.user_id or f"temp_ret_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["retiros"].append({
                "id": row.id,
                "monto": row.monto,
                "monto_neto": row.monto_neto,
                "estado": row.estado,
                "fecha_solicitud": row.fecha_solicitud,
                "tipo": row.tipo
            })
            
        for row in res_req.fetchall():
            uid = row.user_id or f"temp_req_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["requests"].append({
                "id": row.id,
                "monto": row.monto,
                "status": row.status,
                "created_at": row.created_at
            })
            
        for row in res_acc.fetchall():
            uid = getattr(row, 'user_id', None) or f"temp_acc_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["accelerations"].append({
                "id": row.id,
                "original_days": row.original_days,
                "acceleration_percentage": row.acceleration_percentage,
                "days_to_reduce": row.days_to_reduce,
                "new_duration": row.new_duration,
                "applied": row.applied,
                "created_at": row.created_at
            })
            
        for row in res_hist.fetchall():
            uid = getattr(row, 'user_id', None) or f"temp_hist_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["histories"].append({
                "id": row.id,
                "fecha_inicio": row.fecha_inicio,
                "fecha_fin": row.fecha_fin,
                "dias_contrato": row.dias_contrato,
                "total_contrato": row.total_contrato,
                "tasa_interes": row.tasa_interes,
                "acciones_otorgadas": row.acciones_otorgadas,
                "rentabilidad_contrato": row.rentabilidad_contrato,
                "rendimiento_total_generado": row.rendimiento_total_generado
            })
            
        return list(grouped_data.values())
        
    except Exception as e:
        print(f"Error fetching from respaldo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
