from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user_bank_account import UserBankAccount
from datetime import datetime, date

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

class SimpleUserMigrationRequest(BaseModel):
    user_ids: List[int]

@router.get("/simple-users", response_model=List[Dict[str, Any]])
async def get_simple_users(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Obtiene los usuarios 'sencillos' (exactamente 1 inversión) y calcula su saldo real 
    desde el Día 1 hasta el 29 de junio de 2026, usando EXCLUSIVAMENTE los paquetes predefinidos.
    """
    # Verify admin
    is_admin = current_user.email == "superadmin@gloint.com"
    if hasattr(current_user, 'roles') and current_user.roles:
        for r in current_user.roles:
            if getattr(r, 'name', '') in ["admin", "superadmin"]:
                is_admin = True
                break
                
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    try:
        # Get users with exactly 1 investment and join paquetes
        query_base = text("""
            SELECT 
                ir.user_id,
                ir.id as investment_id,
                u.name as user_name,
                u.email as user_email,
                ir.documento as user_document,
                ir.fecha_ingreso,
                ir.fecha_finalizacion as original_fecha_finalizacion,
                ir.liquidacion_diaria_rendimiento,
                p.paquete_accion_adquirido as paquete_nombre,
                COALESCE(wr.balance, 0) as old_wallet_balance
            FROM investor_respaldo ir
            JOIN users u ON ir.user_id = u.id
            LEFT JOIN paquetes_inversion p ON ir.paquete_inversion_adquirido = p.id
            LEFT JOIN wallet_respaldo wr ON ir.user_id = wr.user_id
            WHERE ir.user_id IN (
                SELECT user_id 
                FROM investor_respaldo 
                GROUP BY user_id 
                HAVING COUNT(id) = 1
            )
        """)
        res_base = await db.execute(query_base)
        base_users = res_base.fetchall()
        
        if not base_users:
            return []
            
        user_ids = [str(row.user_id) for row in base_users]
        user_ids_str = ",".join(user_ids)
        
        # Get Bonuses (created <= 2026-06-29)
        query_bonos = text(f"""
            SELECT 
                ir.user_id, 
                SUM(car.bonus_amount) as sum_bonus, 
                SUM(car.days_to_reduce) as sum_days 
            FROM contract_accelerations_respaldo car
            JOIN investor_respaldo ir ON car.investor_id = ir.id
            WHERE car.created_at <= '2026-06-29 23:59:59' 
              AND ir.user_id IN ({user_ids_str})
            GROUP BY ir.user_id
        """)
        res_bonos = await db.execute(query_bonos)
        bonos_dict = {row.user_id: {"sum_bonus": float(row.sum_bonus or 0), "sum_days": float(row.sum_days or 0)} for row in res_bonos.fetchall()}
        
        # Get Retiros (approved)
        query_retiros = text(f"""
            SELECT 
                user_id, 
                SUM(monto) as sum_retiros 
            FROM retiros_respaldo 
            WHERE estado IN ('aprobado', 'procesado', 'completado')
              AND user_id IN ({user_ids_str})
            GROUP BY user_id
        """)
        res_retiros = await db.execute(query_retiros)
        retiros_dict = {row.user_id: float(row.sum_retiros or 0) for row in res_retiros.fetchall()}
        
        cutoff_date = date(2026, 6, 29)
        results = []
        
        from datetime import timedelta
        
        for row in base_users:
            uid = row.user_id
            bonos_data = bonos_dict.get(uid, {"sum_bonus": 0.0, "sum_days": 0.0})
            retiros = retiros_dict.get(uid, 0.0)
            
            # Obtener el Capital Inicial EXCLUSIVAMENTE del paquete
            capital = 0.0
            paquete_nombre = str(row.paquete_nombre) if row.paquete_nombre else ""
            if paquete_nombre and paquete_nombre != "N/A" and paquete_nombre != "0":
                try:
                    capital = float(paquete_nombre)
                except ValueError:
                    pass
                
            # Fechas y Reducción
            fecha_ingreso = row.fecha_ingreso
            original_fin = row.original_fecha_finalizacion
            sum_days = int(bonos_data["sum_days"])
            
            real_fin = (original_fin - timedelta(days=sum_days)) if original_fin else None
                
            # Cálculo de Rendimientos
            calculated_yields = 0.0
            capital_liberado = 0.0
            
            if fecha_ingreso and real_fin:
                end_yield_date = min(cutoff_date, real_fin)
                if end_yield_date >= fecha_ingreso:
                    days_passed = (end_yield_date - fecha_ingreso).days
                    calculated_yields = days_passed * float(row.liquidacion_diaria_rendimiento or 0)
                    
                if real_fin <= cutoff_date:
                    capital_liberado = capital
            
            sum_bonus = bonos_data["sum_bonus"]
            calculated_real_balance = calculated_yields + capital_liberado + sum_bonus - retiros
            
            results.append({
                "user_id": uid,
                "investment_id": row.investment_id,
                "user_name": row.user_name,
                "user_email": row.user_email,
                "user_document": row.user_document,
                "fecha_ingreso": fecha_ingreso,
                "original_fecha_finalizacion": original_fin,
                "real_fecha_finalizacion": real_fin,
                "capital_inicial": capital,
                "liquidacion_diaria_rendimiento": float(row.liquidacion_diaria_rendimiento or 0),
                "calculated_yields": calculated_yields,
                "calculated_bonuses": sum_bonus,
                "calculated_capital_release": capital_liberado,
                "calculated_withdrawals": retiros,
                "calculated_real_balance": calculated_real_balance,
                "old_wallet_balance": float(row.old_wallet_balance),
                "discrepancy": calculated_real_balance - float(row.old_wallet_balance)
            })
            
        return results

    except Exception as e:
        print(f"Error fetching simple users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/migrate-simple")
async def migrate_simple_users(
    req: SimpleUserMigrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Ejecuta la migración matemática para los usuarios simples.
    Crea las wallets con el saldo calculado e inserta las transacciones de trazabilidad.
    Luego los mueve a las tablas reales.
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
        
        query_base = text(f"""
            SELECT 
                ir.user_id,
                ir.fecha_ingreso,
                ir.fecha_finalizacion as original_fecha_finalizacion,
                ir.liquidacion_diaria_rendimiento,
                p.paquete_accion_adquirido as paquete_nombre
            FROM investor_respaldo ir
            LEFT JOIN paquetes_inversion p ON ir.paquete_inversion_adquirido = p.id
            WHERE ir.user_id IN ({user_ids_str})
        """)
        res_base = await db.execute(query_base)
        base_users = res_base.fetchall()
        
        query_bonos = text(f"""
            SELECT 
                ir.user_id, 
                SUM(car.bonus_amount) as sum_bonus, 
                SUM(car.days_to_reduce) as sum_days 
            FROM contract_accelerations_respaldo car
            JOIN investor_respaldo ir ON car.investor_id = ir.id
            WHERE car.created_at <= '2026-06-29 23:59:59' 
              AND ir.user_id IN ({user_ids_str})
            GROUP BY ir.user_id
        """)
        res_bonos = await db.execute(query_bonos)
        bonos_dict = {row.user_id: {"sum_bonus": float(row.sum_bonus or 0), "sum_days": float(row.sum_days or 0)} for row in res_bonos.fetchall()}
        
        query_retiros = text(f"""
            SELECT 
                user_id, 
                SUM(monto) as sum_retiros 
            FROM retiros_respaldo 
            WHERE estado IN ('aprobado', 'procesado', 'completado')
              AND user_id IN ({user_ids_str})
            GROUP BY user_id
        """)
        res_retiros = await db.execute(query_retiros)
        retiros_dict = {row.user_id: float(row.sum_retiros or 0) for row in res_retiros.fetchall()}
        
        query_bonos_june = text(f"""
            SELECT 
                ir.user_id, 
                SUM(car.bonus_amount) as sum_bonus_june 
            FROM contract_accelerations_respaldo car
            JOIN investor_respaldo ir ON car.investor_id = ir.id
            WHERE car.created_at > '2026-05-29 23:59:59' AND car.created_at <= '2026-06-29 23:59:59' 
              AND ir.user_id IN ({user_ids_str})
            GROUP BY ir.user_id
        """)
        res_bonos_june = await db.execute(query_bonos_june)
        bonos_june_dict = {row.user_id: float(row.sum_bonus_june or 0) for row in res_bonos_june.fetchall()}

        
        cutoff_date = date(2026, 6, 29)
        from datetime import timedelta
        
        wallets_to_insert = []
        transactions_to_insert = []
        
        for row in base_users:
            uid = row.user_id
            bonos_data = bonos_dict.get(uid, {"sum_bonus": 0.0, "sum_days": 0.0})
            retiros = retiros_dict.get(uid, 0.0)
            
            capital = 0.0
            paquete_nombre = str(row.paquete_nombre) if row.paquete_nombre else ""
            if paquete_nombre and paquete_nombre != "N/A" and paquete_nombre != "0":
                try:
                    capital = float(paquete_nombre)
                except ValueError:
                    pass
                
            fecha_ingreso = row.fecha_ingreso
            original_fin = row.original_fecha_finalizacion
            sum_days = int(bonos_data["sum_days"])
            
            real_fin = (original_fin - timedelta(days=sum_days)) if original_fin else None
            
            calculated_yields = 0.0
            capital_liberado = 0.0
            
            june_yield = 0.0
            
            if fecha_ingreso and real_fin:
                end_yield_date = min(cutoff_date, real_fin)
                if end_yield_date >= fecha_ingreso:
                    calculated_yields = (end_yield_date - fecha_ingreso).days * float(row.liquidacion_diaria_rendimiento or 0)
                    
                if real_fin <= cutoff_date:
                    capital_liberado = capital
                    
                # Calculate specific June yield
                cycle_start = date(2026, 5, 29)
                cycle_end = date(2026, 6, 29)
                june_start = max(fecha_ingreso, cycle_start)
                june_end = min(real_fin, cycle_end)
                if june_end > june_start:
                    june_days = (june_end - june_start).days
                    june_yield = june_days * float(row.liquidacion_diaria_rendimiento or 0)
            
            sum_bonus = bonos_data["sum_bonus"]
            june_bonus = bonos_june_dict.get(uid, 0.0)
            
            historical_yield = calculated_yields - june_yield
            if historical_yield < 0: historical_yield = 0.0
            
            historical_bonus = sum_bonus - june_bonus
            if historical_bonus < 0: historical_bonus = 0.0
            
            calculated_real_balance = calculated_yields + capital_liberado + sum_bonus - retiros
            
            wallets_to_insert.append(f"DELETE FROM wallets WHERE user_id = {uid};")
            wallets_to_insert.append(f"INSERT INTO wallets (user_id, balance, status, currency, created_at, updated_at) VALUES ({uid}, {calculated_real_balance}, 'active', 'COP', NOW(), NOW());")
            
            if historical_yield > 0:
                transactions_to_insert.append(f"INSERT INTO wallet_transactions (wallet_id, amount, type, reference_type, description, balance_after, created_at, updated_at) VALUES ((SELECT id FROM wallets WHERE user_id = {uid}), {historical_yield}, 'CREDIT', 'RENDIMIENTOS_HISTORICOS', 'Migración de rendimientos generados hasta 29 de mayo', {calculated_real_balance}, NOW(), NOW());")
            
            if capital_liberado > 0:
                transactions_to_insert.append(f"INSERT INTO wallet_transactions (wallet_id, amount, type, reference_type, description, balance_after, created_at, updated_at) VALUES ((SELECT id FROM wallets WHERE user_id = {uid}), {capital_liberado}, 'CREDIT', 'CAPITAL_LIBERADO_HISTORICO', 'Migración de liberación de capital por finalización de contrato', {calculated_real_balance}, NOW(), NOW());")
            
            if historical_bonus > 0:
                transactions_to_insert.append(f"INSERT INTO wallet_transactions (wallet_id, amount, type, reference_type, description, balance_after, created_at, updated_at) VALUES ((SELECT id FROM wallets WHERE user_id = {uid}), {historical_bonus}, 'CREDIT', 'BONO_ACELERACION_HISTORICO', 'Migración de bonos de aceleración históricos', {calculated_real_balance}, NOW(), NOW());")
                
            if retiros > 0:
                transactions_to_insert.append(f"INSERT INTO wallet_transactions (wallet_id, amount, type, reference_type, description, balance_after, created_at, updated_at) VALUES ((SELECT id FROM wallets WHERE user_id = {uid}), {retiros}, 'DEBIT', 'RETIROS_HISTORICOS', 'Migración de suma de retiros acumulados', {calculated_real_balance}, NOW(), NOW());")

            if june_yield > 0:
                transactions_to_insert.append(f"INSERT INTO retiros (user_id, investor_id, origen, tipo, monto, impuesto, monto_neto, fecha_solicitud, estado, metodo_pago, observaciones, created_at, updated_at) VALUES ({uid}, (SELECT id FROM investor_respaldo WHERE user_id = {uid} LIMIT 1), 'auto_yield_transfer', 'rendimiento', {june_yield}, 0, {june_yield}, '2026-06-29', 'procesado', 'wallet', 'Rendimientos de ciclo (Mayo 29 - Junio 29)', '2026-06-29 23:59:59', '2026-06-29 23:59:59');")
                transactions_to_insert.append(f"INSERT INTO wallet_transactions (wallet_id, amount, type, reference_type, reference_id, description, balance_after, created_at, updated_at) VALUES ((SELECT id FROM wallets WHERE user_id = {uid}), {june_yield}, 'yield_payout', 'retiros', (SELECT max(id) FROM retiros WHERE user_id = {uid} AND origen = 'auto_yield_transfer'), 'Rendimientos de ciclo (Mayo 29 - Junio 29)', {calculated_real_balance}, '2026-06-29 23:59:59', '2026-06-29 23:59:59');")

            if june_bonus > 0:
                transactions_to_insert.append(f"INSERT INTO retiros (user_id, investor_id, origen, tipo, monto, impuesto, monto_neto, fecha_solicitud, estado, metodo_pago, observaciones, created_at, updated_at) VALUES ({uid}, (SELECT id FROM investor_respaldo WHERE user_id = {uid} LIMIT 1), 'auto_bonus_transfer', 'bono', {june_bonus}, 0, {june_bonus}, '2026-06-29', 'procesado', 'wallet', 'Bono de aceleración ciclo (Mayo 29 - Junio 29)', '2026-06-29 23:59:59', '2026-06-29 23:59:59');")
                transactions_to_insert.append(f"INSERT INTO wallet_transactions (wallet_id, amount, type, reference_type, reference_id, description, balance_after, created_at, updated_at) VALUES ((SELECT id FROM wallets WHERE user_id = {uid}), {june_bonus}, 'bonus_payout', 'retiros', (SELECT max(id) FROM retiros WHERE user_id = {uid} AND origen = 'auto_bonus_transfer'), 'Bono de aceleración ciclo (Mayo 29 - Junio 29)', {calculated_real_balance}, '2026-06-29 23:59:59', '2026-06-29 23:59:59');")

        
        async def get_intersecting_columns(src_table: str, dest_table: str) -> str:
            src_res = await db.execute(text(f"SHOW COLUMNS FROM {src_table}"))
            src_cols = {r[0] for r in src_res.fetchall()}
            dest_res = await db.execute(text(f"SHOW COLUMNS FROM {dest_table}"))
            dest_cols = {r[0] for r in dest_res.fetchall()}
            intersect = src_cols.intersection(dest_cols)
            return ", ".join(f"`{c}`" for c in intersect)
            
        cols_inv = await get_intersecting_columns("investor_respaldo", "investors")
        cols_ret = await get_intersecting_columns("retiros_respaldo", "retiros")
        cols_req = await get_intersecting_columns("investment_requests_respaldo", "investment_requests")
        cols_acc = await get_intersecting_columns("contract_accelerations_respaldo", "contract_accelerations")
        cols_hist = await get_intersecting_columns("contract_histories_respaldo", "contract_histories")
        
        queries = [
            f"SET FOREIGN_KEY_CHECKS=0",
            f"INSERT INTO investors ({cols_inv}) SELECT {cols_inv} FROM investor_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO retiros ({cols_ret}) SELECT {cols_ret} FROM retiros_respaldo WHERE user_id IN ({user_ids_str}) AND investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"INSERT INTO investment_requests ({cols_req}) SELECT {cols_req} FROM investment_requests_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO contract_accelerations ({cols_acc}) SELECT {cols_acc} FROM contract_accelerations_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"INSERT INTO contract_histories ({cols_hist}) SELECT {cols_hist} FROM contract_histories_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"SET FOREIGN_KEY_CHECKS=1",
            
            f"DELETE FROM contract_accelerations_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"DELETE FROM contract_histories_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"DELETE FROM investment_requests_respaldo WHERE user_id IN ({user_ids_str})",
            f"DELETE FROM retiros_respaldo WHERE user_id IN ({user_ids_str})",
            f"DELETE FROM investor_respaldo WHERE user_id IN ({user_ids_str})"
        ]
        
        for wq in wallets_to_insert:
            await db.execute(text(wq))
            
        for tq in transactions_to_insert:
            await db.execute(text(tq))
            
        res_bancos = await db.execute(text(f"SELECT DISTINCT user_id, banco, tipo_cuenta, numero_cuenta FROM investor_respaldo WHERE user_id IN ({user_ids_str}) AND banco IS NOT NULL AND numero_cuenta IS NOT NULL"))
        bancos_a_crear = []
        for row in res_bancos:
            check_exist = await db.execute(text(f"SELECT id FROM user_bank_accounts WHERE user_id = {row.user_id} AND banco = '{row.banco}'"))
            if not check_exist.first():
                bancos_a_crear.append(UserBankAccount(
                    user_id=row.user_id,
                    banco=row.banco,
                    tipo_cuenta=row.tipo_cuenta if row.tipo_cuenta else 'Ahorros',
                    numero_cuenta=row.numero_cuenta,
                    is_primary=True
                ))
        if bancos_a_crear:
            db.add_all(bancos_a_crear)
            
        for q in queries:
            await db.execute(text(q))
            
        await db.commit()
        return {"migrated": len(req.user_ids), "status": "success"}
        
    except Exception as e:
        await db.rollback()
        print(f"Error migrating simple users: {e}")
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
        
        # 6. Bank Accounts (using ORM to automatically decrypt)
        from sqlalchemy.future import select
        res_bank = await db.execute(select(UserBankAccount))
        bank_accounts_data = res_bank.scalars().all()
        
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
                    "histories": [],
                    "bank_accounts": []
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
                "fecha_finalizacion": row.fecha_finalizacion,
                "referido_por": getattr(row, 'referido_por', None),
                "nombre_completo": getattr(row, 'nombre_completo', None),
                "documento": getattr(row, 'documento', None),
                "tipo_documento": getattr(row, 'tipo_documento', None),
                "correo_electronico": getattr(row, 'correo_electronico', None),
                "numero_celular": getattr(row, 'numero_celular', None),
                "ciudad": getattr(row, 'ciudad', None),
                "tusdatos_status": getattr(row, 'tusdatos_status', None),
                "acciones_otorgadas": getattr(row, 'acciones_otorgadas', None),
                "rendimiento_aprobado_mensual": getattr(row, 'rendimiento_aprobado_mensual', None),
                "rentabilidad_contrato": getattr(row, 'rentabilidad_contrato', None),
                "rendimiento_total_contrato": getattr(row, 'rendimiento_total_contrato', None),
                "total_contrato": getattr(row, 'total_contrato', None),
                "liquidacion_diaria_capital": getattr(row, 'liquidacion_diaria_capital', None),
                "liquidacion_diaria_rendimiento": getattr(row, 'liquidacion_diaria_rendimiento', None),
                "valor_total_acciones": getattr(row, 'valor_total_acciones', None),
                "porcentaje_participacion_accionista": getattr(row, 'porcentaje_participacion_accionista', None),
            })
            
        for ba in bank_accounts_data:
            if ba.user_id in grouped_data:
                grouped_data[ba.user_id]["bank_accounts"].append({
                    "id": ba.id,
                    "banco": ba.banco,
                    "tipo_cuenta": ba.tipo_cuenta,
                    "numero_cuenta": ba.numero_cuenta,
                    "is_primary": ba.is_primary
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
            f"SET FOREIGN_KEY_CHECKS=0",
            f"INSERT INTO investors ({cols_inv}) SELECT {cols_inv} FROM investor_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO retiros ({cols_ret}) SELECT {cols_ret} FROM retiros_respaldo WHERE user_id IN ({user_ids_str}) AND investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"INSERT INTO investment_requests ({cols_req}) SELECT {cols_req} FROM investment_requests_respaldo WHERE user_id IN ({user_ids_str})",
            f"INSERT INTO contract_accelerations ({cols_acc}) SELECT {cols_acc} FROM contract_accelerations_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"INSERT INTO contract_histories ({cols_hist}) SELECT {cols_hist} FROM contract_histories_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"SET FOREIGN_KEY_CHECKS=1",
            
            f"DELETE FROM contract_accelerations_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"DELETE FROM contract_histories_respaldo WHERE investor_id IN (SELECT id FROM investor_respaldo WHERE user_id IN ({user_ids_str}))",
            f"DELETE FROM investment_requests_respaldo WHERE user_id IN ({user_ids_str})",
            f"DELETE FROM retiros_respaldo WHERE user_id IN ({user_ids_str})",
            f"DELETE FROM investor_respaldo WHERE user_id IN ({user_ids_str})"
        ]
        
        # Migrar cuentas bancarias antes de borrar de investor_respaldo
        res_bancos = await db.execute(text(f"SELECT DISTINCT user_id, banco, tipo_cuenta, numero_cuenta FROM investor_respaldo WHERE user_id IN ({user_ids_str}) AND banco IS NOT NULL AND numero_cuenta IS NOT NULL"))
        bancos_a_crear = []
        for row in res_bancos:
            # Check if this exact account already exists for the user to avoid duplicates
            check_exist = await db.execute(text(f"SELECT id FROM user_bank_accounts WHERE user_id = {row.user_id} AND banco = '{row.banco}'"))
            if not check_exist.first():
                bancos_a_crear.append(UserBankAccount(
                    user_id=row.user_id,
                    banco=row.banco,
                    tipo_cuenta=row.tipo_cuenta if row.tipo_cuenta else 'Ahorros',
                    numero_cuenta=row.numero_cuenta,
                    is_primary=True
                ))
        if bancos_a_crear:
            db.add_all(bancos_a_crear)
        
        for q in queries:
            await db.execute(text(q))
            
        await db.commit()
        return {"migrated": len(req.user_ids), "status": "success"}
        
    except Exception as e:
        await db.rollback()
        print(f"Error migrating batch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

