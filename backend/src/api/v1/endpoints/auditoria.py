from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
from pydantic import BaseModel
from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user

router = APIRouter()

class MigrateBatchRequest(BaseModel):
    user_ids: List[int]

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
                "investor_id": row.investor_id,
                "user_id": row.user_id,
                "origen": row.origen,
                "tipo": row.tipo,
                "monto": row.monto,
                "impuesto": row.impuesto,
                "monto_neto": row.monto_neto,
                "fecha_solicitud": row.fecha_solicitud,
                "fecha_retiro": row.fecha_retiro,
                "estado": row.estado,
                "metodo_pago": row.metodo_pago,
                "banco": row.banco,
                "tipo_cuenta": row.tipo_cuenta,
                "numero_cuenta": row.numero_cuenta,
                "observaciones": row.observaciones,
                "motivo_rechazo": row.motivo_rechazo,
                "aprobado_por": row.aprobado_por,
                "fecha_aprobacion": row.fecha_aprobacion,
                "procesado_por": row.procesado_por,
                "fecha_procesamiento": row.fecha_procesamiento,
                "comprobante_pago": row.comprobante_pago
            })
            
        for row in res_req.fetchall():
            uid = row.user_id or f"temp_req_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["requests"].append({
                "id": row.id,
                "user_id": row.user_id,
                "investor_id": row.investor_id,
                "paquete_inversion_id": row.paquete_inversion_id,
                "prospecto_id": row.prospecto_id,
                "monto": row.monto,
                "comprobante_path": row.comprobante_path,
                "status": row.status,
                "rejection_reason": row.rejection_reason,
                "reviewed_at": row.reviewed_at,
                "reviewed_by": row.reviewed_by,
                "extra_data": row.extra_data,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
                "deleted_at": row.deleted_at
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

@router.get("/reales", response_model=List[Dict[str, Any]])
async def get_inversiones_reales(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Obtiene los registros de la tablas reales de inversiones
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
            FROM investors ir
            LEFT JOIN users u ON ir.user_id = u.id
            LEFT JOIN paquetes_inversion p ON ir.paquete_inversion_adquirido = p.id
            LEFT JOIN contract_periods cp ON ir.periodo_contrato = cp.id
            ORDER BY ir.user_id DESC, ir.id DESC
        """)
        res_inv = await db.execute(query_inv)
        
        # 2. Retiros
        query_ret = text("""
            SELECT rr.*, u.name as user_name, u.email as user_email 
            FROM retiros rr 
            LEFT JOIN users u ON rr.user_id = u.id 
            ORDER BY rr.user_id DESC, rr.id DESC
        """)
        res_ret = await db.execute(query_ret)
        
        # 3. Requests
        query_req = text("""
            SELECT rq.*, u.name as user_name, u.email as user_email 
            FROM investment_requests rq 
            LEFT JOIN users u ON rq.user_id = u.id 
            ORDER BY rq.user_id DESC, rq.id DESC
        """)
        res_req = await db.execute(query_req)
        
        # 4. Accelerations
        query_acc = text("""
            SELECT ca.*, ir.user_id, u.name as user_name, u.email as user_email 
            FROM contract_accelerations ca 
            LEFT JOIN investors ir ON ca.investor_id = ir.id 
            LEFT JOIN users u ON ir.user_id = u.id 
            ORDER BY ir.user_id DESC, ca.id DESC
        """)
        res_acc = await db.execute(query_acc)
        
        # 5. Histories
        query_hist = text("""
            SELECT ch.*, ir.user_id, u.name as user_name, u.email as user_email 
            FROM contract_histories ch 
            LEFT JOIN investors ir ON ch.investor_id = ir.id 
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
                "investor_id": row.investor_id,
                "user_id": row.user_id,
                "origen": row.origen,
                "tipo": row.tipo,
                "monto": row.monto,
                "impuesto": row.impuesto,
                "monto_neto": row.monto_neto,
                "fecha_solicitud": row.fecha_solicitud,
                "fecha_retiro": row.fecha_retiro,
                "estado": row.estado,
                "metodo_pago": row.metodo_pago,
                "banco": row.banco,
                "tipo_cuenta": row.tipo_cuenta,
                "numero_cuenta": row.numero_cuenta,
                "observaciones": row.observaciones,
                "motivo_rechazo": row.motivo_rechazo,
                "aprobado_por": row.aprobado_por,
                "fecha_aprobacion": row.fecha_aprobacion,
                "procesado_por": row.procesado_por,
                "fecha_procesamiento": row.fecha_procesamiento,
                "comprobante_pago": row.comprobante_pago
            })
            
        for row in res_req.fetchall():
            uid = row.user_id or f"temp_req_{row.id}"
            ensure_user(uid, row)
            grouped_data[uid]["requests"].append({
                "id": row.id,
                "user_id": row.user_id,
                "investor_id": row.investor_id,
                "paquete_inversion_id": row.paquete_inversion_id,
                "prospecto_id": row.prospecto_id,
                "monto": row.monto,
                "comprobante_path": row.comprobante_path,
                "status": row.status,
                "rejection_reason": row.rejection_reason,
                "reviewed_at": row.reviewed_at,
                "reviewed_by": row.reviewed_by,
                "extra_data": row.extra_data,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
                "deleted_at": row.deleted_at
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
        print(f"Error fetching from reales: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/migrar-batch")
async def migrar_batch(
    req: MigrateBatchRequest, 
    db: AsyncSession = Depends(get_db), 
    current_user: Any = Depends(get_current_user)
):
    """
    Migra los usuarios seleccionados de las tablas de respaldo a las tablas reales.
    """
    is_admin = current_user.email == "superadmin@gloint.com"
    if hasattr(current_user, 'roles') and current_user.roles:
        for r in current_user.roles:
            if getattr(r, 'name', '') in ["admin", "superadmin"]:
                is_admin = True
                break
                
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    if not req.user_ids:
        return {"migrated": 0, "status": "success"}
        
    try:
        user_ids_str = ",".join(str(uid) for uid in req.user_ids)
        
        async def get_intersecting_columns(src_table: str, dest_table: str) -> str:
            src_res = await db.execute(text(f"SHOW COLUMNS FROM {src_table}"))
            src_cols = {row[0] for row in src_res.fetchall()}
            
            dest_res = await db.execute(text(f"SHOW COLUMNS FROM {dest_table}"))
            dest_cols = {row[0] for row in dest_res.fetchall()}
            
            intersect = src_cols.intersection(dest_cols)
            return ", ".join(f"`{c}`" for c in intersect)
            
        cols_inv = await get_intersecting_columns("investor_respaldo", "investors")
        cols_ret = await get_intersecting_columns("retiros_respaldo", "retiros")
        cols_req = await get_intersecting_columns("investment_requests_respaldo", "investment_requests")
        cols_acc = await get_intersecting_columns("contract_accelerations_respaldo", "contract_accelerations")
        cols_hist = await get_intersecting_columns("contract_histories_respaldo", "contract_histories")
        
        queries = [
            f"INSERT INTO investors ({cols_inv}) SELECT {cols_inv} FROM investor_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO retiros ({cols_ret}) SELECT {cols_ret} FROM retiros_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO investment_requests ({cols_req}) SELECT {cols_req} FROM investment_requests_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO contract_accelerations ({cols_acc}) SELECT {cols_acc} FROM contract_accelerations_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"INSERT INTO contract_histories ({cols_hist}) SELECT {cols_hist} FROM contract_histories_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            
            f"DELETE FROM contract_accelerations_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"DELETE FROM contract_histories_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"DELETE FROM investment_requests_respaldo WHERE user_id IN ({user_ids_str})",
            f"DELETE FROM retiros_respaldo WHERE user_id IN ({user_ids_str})",
            f"DELETE FROM investor_respaldo WHERE user_id IN ({user_ids_str})"
        ]
        
        for q in queries:
            await db.execute(text(q))
            
        await db.commit()
        return {"migrated": len(req.user_ids), "status": "success"}
        
    except Exception as e:
        await db.rollback()
        print(f"Error migrating batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

