import io
import csv
import json
import re
import traceback
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple

from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import text, func, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.timezone import get_colombia_now, get_colombia_today, BOGOTA_TZ
from src.api.deps import RequirePermission, get_current_user
from src.models.user import User
from src.models.investor import Investor
from src.models.wallet import Wallet, WalletTransaction
from src.models.audit_log import AuditLog
from src.services.daily_yield_service import DailyYieldService

router = APIRouter()

# Permiso requerido: administradores de auditoría o de inversionistas
admin_permission = RequirePermission(["admin.audits.manage", "admin.investors.manage", "wallets:view"])


def safe_float(val: Any, default: float = 0.0) -> float:
    """Convierte de forma segura cualquier valor a float evitando excepciones por None o tipos incompatibles."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def safe_int(val: Any, default: int = 0) -> int:
    """Convierte de forma segura cualquier valor a int evitando excepciones por None o tipos incompatibles."""
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def safe_dict(val: Any) -> Dict[str, Any]:
    """Deserializa de forma segura un campo JSON que puede ser dict, string, None o lista."""
    if not val:
        return {}
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def extract_assigned_code_from_desc(desc: Optional[str]) -> Optional[str]:
    """Extrae el código asignado de la tabla investors si está referenciado en la descripción."""
    if not desc:
        return None
    # 1. "(Inv. IG1974)"
    m = re.search(r'\(Inv\.\s*([^)]+)\)', desc, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # 2. "inversión IG1974" o "inversion IG1974"
    m = re.search(r'inversi[oó]n\s+([A-Za-z0-9_-]+)', desc, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # 3. "Inv. IG1974"
    m = re.search(r'Inv\.\s*([A-Za-z0-9_-]+)', desc, re.IGNORECASE)
    if m:
        return m.group(1).strip()
    # 4. Código con prefijo IG o similar seguido de dígitos
    m = re.search(r'\b(IG\d+)\b', desc, re.IGNORECASE)
    if m:
        return m.group(1).strip().upper()
    return None


def resolve_assigned_code_and_package(
    tx: WalletTransaction,
    w_user: Optional[User],
    inv_by_id: Dict[int, Investor],
    inv_by_code: Dict[str, Investor]
) -> Tuple[str, str, Optional[int]]:
    """
    Resuelve el código asignado real (Investor.assigned_code) de la tabla 'investors',
    el nombre del paquete y el ID del contrato.
    """
    desc_code = extract_assigned_code_from_desc(tx.description)
    inv: Optional[Investor] = None

    # 1. Buscar por reference_id en el mapa de IDs
    if tx.reference_id and tx.reference_id in inv_by_id:
        inv = inv_by_id[tx.reference_id]

    # 2. Buscar por código extraído en el mapa de códigos
    if not inv and desc_code and desc_code in inv_by_code:
        inv = inv_by_code[desc_code]
    elif not inv and desc_code and desc_code.upper() in inv_by_code:
        inv = inv_by_code[desc_code.upper()]

    # 3. Buscar en las inversiones activas del usuario (User.investments)
    if not inv and w_user and hasattr(w_user, 'investments') and w_user.investments:
        if tx.reference_id:
            inv = next((i for i in w_user.investments if i.id == tx.reference_id), None)
        if not inv and desc_code:
            inv = next((i for i in w_user.investments if (i.assigned_code or '').strip().upper() == desc_code.upper()), None)
        if not inv and len(w_user.investments) == 1:
            inv = w_user.investments[0]

    # 4. Extraer el assigned_code de la tabla investors
    final_code = "N/A"
    if inv and inv.assigned_code:
        final_code = inv.assigned_code.strip()
    elif desc_code:
        final_code = desc_code.strip()
    elif w_user and hasattr(w_user, 'investments') and w_user.investments and w_user.investments[0].assigned_code:
        final_code = w_user.investments[0].assigned_code.strip()

    # 5. Extraer el paquete de inversión
    pkg_name = "N/A"
    if inv and inv.package and getattr(inv.package, 'value', None):
        pkg_name = f"Paquete ${inv.package.value:,.0f}"
    elif w_user and hasattr(w_user, 'investments') and w_user.investments and w_user.investments[0].package:
        p_val = getattr(w_user.investments[0].package, 'value', None)
        if p_val:
            pkg_name = f"Paquete ${p_val:,.0f}"

    investor_id = inv.id if inv else (tx.reference_id if tx.reference_id else None)
    return final_code, pkg_name, investor_id


@router.get("/summary", summary="Obtener resumen ejecutivo del día de dispersión de rendimientos")
async def get_daily_yield_summary(
    target_date: Optional[str] = Query(None, description="Fecha YYYY-MM-DD. Si no se indica, toma hoy en Colombia."),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_permission)
) -> Dict[str, Any]:
    """
    Retorna el estado de liquidación del día, monto total dispersado,
    beneficiarios, estado del worker automático y últimos 7 días.
    """
    try:
        today_cot = get_colombia_today()
        if target_date:
            try:
                query_date = datetime.strptime(target_date.strip(), "%Y-%m-%d").date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD.")
        else:
            query_date = today_cot

        yesterday_cot = query_date - timedelta(days=1)
        batch_prefix = f"YIELD_BATCH_{yesterday_cot.strftime('%Y%m%d')}_{query_date.strftime('%Y%m%d')}"

        # 1. Buscar si ya se ejecutó un lote para este ciclo en audit_logs
        batch_log_query = select(AuditLog).where(
            AuditLog.module == "audit",
            AuditLog.action.in_(["AUTOMATIC_DAILY_YIELD_DISPERSAL", "MANUAL_BULK_YIELD_DISPERSAL"]),
            AuditLog.status == "SUCCESS"
        ).order_by(AuditLog.created_at.desc()).limit(30)

        result = await db.execute(batch_log_query)
        recent_batches = result.scalars().all()

        target_batch = None
        for b in recent_batches:
            if b.entity_id and b.entity_id.startswith(batch_prefix):
                target_batch = b
                break
            det = safe_dict(b.details)
            if det.get("cycle_end_date") == str(query_date) and det.get("cycle_start_date") == str(yesterday_cot):
                target_batch = b
                break

        # 2. Inicializar métricas del día consultado
        total_dispersed = 0.0
        total_yields = 0.0
        total_bonuses = 0.0
        total_transfers = 0
        total_users_count = 0

        # Si encontramos el lote en audit_logs, extraemos los totales del lote
        if target_batch:
            det = safe_dict(target_batch.details)
            total_dispersed = safe_float(det.get("global_grand_total"))
            total_yields = safe_float(det.get("global_yield_total"))
            total_bonuses = safe_float(det.get("global_acceleration_bonus_total"))
            total_transfers = safe_int(det.get("total_transfers_count"))
            total_users_count = safe_int(det.get("total_users_paid"))
        else:
            # Consultar en wallet_transactions (fuente contable de verdad que siempre existe)
            day_start = datetime.combine(query_date, datetime.min.time())
            day_end = datetime.combine(query_date, datetime.max.time())

            wt_stmt = select(
                WalletTransaction.reference_type,
                func.coalesce(func.sum(WalletTransaction.amount), 0),
                func.count(WalletTransaction.id),
                func.count(func.distinct(WalletTransaction.wallet_id))
            ).where(
                WalletTransaction.created_at >= day_start,
                WalletTransaction.created_at <= day_end,
                WalletTransaction.reference_type.in_(["rendimiento_inversion", "bono_aceleracion"])
            ).group_by(WalletTransaction.reference_type)

            wt_res = await db.execute(wt_stmt)
            for r_type, sum_amt, cnt, u_cnt in wt_res.all():
                s_amt = safe_float(sum_amt)
                s_cnt = safe_int(cnt)
                s_ucnt = safe_int(u_cnt)
                total_dispersed += s_amt
                total_transfers += s_cnt
                if s_ucnt > total_users_count:
                    total_users_count = s_ucnt
                if r_type == "rendimiento_inversion":
                    total_yields += s_amt
                elif r_type == "bono_aceleracion":
                    total_bonuses += s_amt

        # 3. Datos del último lote registrado (general)
        last_batch_info = None
        if recent_batches:
            first_b = recent_batches[0]
            f_det = safe_dict(first_b.details)
            last_batch_info = {
                "batch_id": first_b.entity_id or f"BATCH-{first_b.id}",
                "action": first_b.action,
                "status": first_b.status or "SUCCESS",
                "is_automatic": f_det.get("is_automatic", first_b.action == "AUTOMATIC_DAILY_YIELD_DISPERSAL"),
                "executed_at_cot": f_det.get("executed_at_cot") or (first_b.created_at.strftime("%Y-%m-%d %H:%M:%S") if first_b.created_at else None),
                "global_grand_total": safe_float(f_det.get("global_grand_total") or f_det.get("total_reverted_amount")),
                "total_users_paid": safe_int(f_det.get("total_users_paid")),
                "cycle_start_date": f_det.get("cycle_start_date") or f_det.get("original_cycle_start"),
                "cycle_end_date": f_det.get("cycle_end_date") or f_det.get("original_cycle_end"),
            }

        # 4. Historial de los últimos 7 días calendario para visualización gráfica
        history_7_days = []
        for i in range(6, -1, -1):
            d = today_cot - timedelta(days=i)
            d_yesterday = d - timedelta(days=1)
            d_prefix = f"YIELD_BATCH_{d_yesterday.strftime('%Y%m%d')}_{d.strftime('%Y%m%d')}"

            d_batch = None
            for b in recent_batches:
                if b.entity_id and b.entity_id.startswith(d_prefix):
                    d_batch = b
                    break
                det_b = safe_dict(b.details)
                if det_b.get("cycle_end_date") == str(d):
                    d_batch = b
                    break

            if d_batch:
                det_b = safe_dict(d_batch.details)
                history_7_days.append({
                    "date": str(d),
                    "total_amount": safe_float(det_b.get("global_grand_total")),
                    "users_count": safe_int(det_b.get("total_users_paid")),
                    "transfers_count": safe_int(det_b.get("total_transfers_count")),
                    "status": "COMPLETED"
                })
            else:
                history_7_days.append({
                    "date": str(d),
                    "total_amount": 0.0,
                    "users_count": 0,
                    "transfers_count": 0,
                    "status": "PENDING" if d == today_cot else "SIN_MOVIMIENTOS"
                })

        is_today = (query_date == today_cot)
        target_executed = (target_batch is not None)

        target_batch_info = None
        if target_batch:
            t_det = safe_dict(target_batch.details)
            target_batch_info = {
                "batch_id": target_batch.entity_id,
                "status": target_batch.status or "SUCCESS",
                "executed_at": target_batch.created_at.isoformat() if target_batch.created_at else None,
                "cycle_start_date": t_det.get("cycle_start_date"),
                "cycle_end_date": t_det.get("cycle_end_date"),
                "total_users_paid": safe_int(t_det.get("total_users_paid")),
                "total_transfers_count": safe_int(t_det.get("total_transfers_count")),
                "global_grand_total": safe_float(t_det.get("global_grand_total")),
                "is_automatic": t_det.get("is_automatic", True)
            }

        return {
            "target_date": str(query_date),
            "is_today": is_today,
            "is_executed": target_executed,
            "status": "COMPLETED" if target_executed else ("PENDING" if is_today else "SIN_REGISTRO"),
            "total_dispersed": total_dispersed,
            "total_yields": total_yields,
            "total_bonuses": total_bonuses,
            "total_users": total_users_count,
            "total_movements": total_transfers,
            "target_batch": target_batch_info,
            "last_batch": last_batch_info,
            "worker_status": {
                "is_running": True,
                "timezone": "America/Bogota (UTC-5)",
                "frequency": "Latido continuo cada 60 segundos",
                "schedule_time": "00:00:xx COT diario (Automático)",
                "recovery": "Catch-up instantáneo ante reinicios del servidor",
                "current_colombia_time": get_colombia_now().strftime("%Y-%m-%d %H:%M:%S COT")
            },
            "history_7_days": history_7_days
        }

    except Exception as e:
        print(f"[daily_yields.get_daily_yield_summary] ERROR: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener el resumen diario de rendimientos: {str(e)}"
        )


@router.get("/batches", summary="Listar lotes históricos de dispersión")
async def list_daily_yield_batches(
    start_date: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_permission)
) -> Dict[str, Any]:
    """
    Lista todos los lotes de dispersión (automáticos y manuales) registrados en el sistema.
    """
    try:
        conditions = [
            AuditLog.module == "audit",
            AuditLog.action.in_([
                "AUTOMATIC_DAILY_YIELD_DISPERSAL",
                "MANUAL_BULK_YIELD_DISPERSAL",
                "YIELD_BATCH_ROLLBACK"
            ])
        ]

        if start_date:
            try:
                s_date = datetime.strptime(start_date.strip(), "%Y-%m-%d")
                conditions.append(AuditLog.created_at >= s_date)
            except ValueError:
                pass

        if end_date:
            try:
                e_date = datetime.strptime(end_date.strip(), "%Y-%m-%d") + timedelta(days=1)
                conditions.append(AuditLog.created_at < e_date)
            except ValueError:
                pass

        # Conteo total
        count_stmt = select(func.count(AuditLog.id)).where(and_(*conditions))
        total_count_res = await db.execute(count_stmt)
        total_records = total_count_res.scalar() or 0

        # Paginación
        offset = (page - 1) * page_size
        query = (
            select(AuditLog)
            .where(and_(*conditions))
            .order_by(AuditLog.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await db.execute(query)
        logs = result.scalars().all()

        items = []
        for log in logs:
            det = safe_dict(log.details)
            is_rollback = (log.action == "YIELD_BATCH_ROLLBACK")
            action_label = "Reverso de Lote" if is_rollback else (
                "Dispersión Automática" if log.action == "AUTOMATIC_DAILY_YIELD_DISPERSAL" else "Dispersión Manual"
            )

            grand_total = safe_float(det.get("global_grand_total") or det.get("total_reverted_amount"))
            users_count = safe_int(det.get("total_users_paid"))
            transfers_count = safe_int(det.get("total_transfers_count") or det.get("total_transfers_reverted"))
            skipped = safe_int(det.get("skipped_count"))
            yield_total = safe_float(det.get("global_yield_total"))
            bonus_total = safe_float(det.get("global_acceleration_bonus_total"))

            items.append({
                "id": log.id,
                "batch_id": log.entity_id or f"BATCH-{log.id}",
                "action": log.action,
                "action_label": action_label,
                "is_automatic": det.get("is_automatic", log.action == "AUTOMATIC_DAILY_YIELD_DISPERSAL"),
                "cycle_start_date": det.get("cycle_start_date") or det.get("original_cycle_start"),
                "cycle_end_date": det.get("cycle_end_date") or det.get("original_cycle_end"),
                "executed_at_cot": det.get("executed_at_cot") or (log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None),
                "executed_at_utc": det.get("executed_at_utc"),
                "total_users_paid": users_count,
                "total_transfers_count": transfers_count,
                "skipped_count": skipped,
                "global_grand_total": grand_total,
                "global_yield_total": yield_total,
                "global_acceleration_bonus_total": bonus_total,
                "status": log.status or "SUCCESS",
                "description": log.description or "",
                "created_at": log.created_at.isoformat() if log.created_at else None
            })

        return {
            "items": items,
            "total": total_records,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if page_size > 0 else 1
        }

    except Exception as e:
        print(f"[daily_yields.list_daily_yield_batches] ERROR: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al listar lotes de rendimientos: {str(e)}"
        )


@router.get("/movements", summary="Listar pagos y movimientos individuales a wallets")
async def list_daily_yield_movements(
    date: Optional[str] = Query(None, description="Fecha específica YYYY-MM-DD"),
    start_date: Optional[str] = Query(None, description="Fecha inicio rango YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha fin rango YYYY-MM-DD"),
    batch_id: Optional[str] = Query(None, description="ID exacto del lote"),
    search: Optional[str] = Query(None, description="Buscar por nombre, correo, cédula o código de inversión"),
    type: Optional[str] = Query(None, description="Tipo: rendimiento_inversion, bono_aceleracion, reverso_rendimiento"),
    status: Optional[str] = Query(None, description="Estado: COMPLETED, REVERSED, etc."),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_permission)
) -> Dict[str, Any]:
    """
    Retorna la lista detallada y paginada de todos los pagos de rendimientos acreditados a las wallets,
    con nombres de usuario, número de documento, montos y balances.
    """
    try:
        conditions = []

        if type:
            conditions.append(WalletTransaction.reference_type == type)
        else:
            conditions.append(WalletTransaction.reference_type.in_(["rendimiento_inversion", "bono_aceleracion", "reverso_rendimiento"]))

        if date:
            try:
                target_d = datetime.strptime(date.strip(), "%Y-%m-%d").date()
                d_start = datetime.combine(target_d, datetime.min.time())
                d_end = datetime.combine(target_d, datetime.max.time())
                conditions.append(WalletTransaction.created_at >= d_start)
                conditions.append(WalletTransaction.created_at <= d_end)
            except ValueError:
                pass
        else:
            if start_date:
                try:
                    s_d = datetime.strptime(start_date.strip(), "%Y-%m-%d")
                    conditions.append(WalletTransaction.created_at >= s_d)
                except ValueError:
                    pass
            if end_date:
                try:
                    e_d = datetime.strptime(end_date.strip(), "%Y-%m-%d") + timedelta(days=1)
                    conditions.append(WalletTransaction.created_at < e_d)
                except ValueError:
                    pass

        if batch_id:
            conditions.append(WalletTransaction.description.ilike(f"%{batch_id}%"))

        # Base query uniendo con Wallet y User y cargando inversiones de la tabla investors
        base_query = (
            select(WalletTransaction)
            .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
            .join(User, Wallet.user_id == User.id)
            .options(
                selectinload(WalletTransaction.wallet)
                .selectinload(Wallet.user)
                .selectinload(User.investments)
                .selectinload(Investor.package)
            )
        )

        if search:
            s_term = f"%{search.strip()}%"
            subq_inv = select(Investor.id).where(Investor.assigned_code.ilike(s_term))
            conditions.append(
                or_(
                    User.name.ilike(s_term),
                    User.email.ilike(s_term),
                    User.document_id.ilike(s_term),
                    WalletTransaction.description.ilike(s_term),
                    WalletTransaction.reference_id.in_(subq_inv)
                )
            )

        if conditions:
            base_query = base_query.where(and_(*conditions))

        # Conteo total y suma de montos
        count_stmt = (
            select(
                func.count(WalletTransaction.id),
                func.coalesce(func.sum(WalletTransaction.amount), 0)
            )
            .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
            .join(User, Wallet.user_id == User.id)
        )
        if conditions:
            count_stmt = count_stmt.where(and_(*conditions))

        count_res = await db.execute(count_stmt)
        total_records, total_amount_sum = count_res.first() or (0, Decimal("0.00"))

        # Paginación
        offset = (page - 1) * page_size
        query = base_query.order_by(WalletTransaction.created_at.desc()).offset(offset).limit(page_size)
        result = await db.execute(query)
        txs = result.scalars().all()

        # Pre-cargar inversiones asociadas directamente desde la tabla investors
        investor_ids = list({tx.reference_id for tx in txs if tx.reference_id})
        desc_codes = list({extract_assigned_code_from_desc(tx.description) for tx in txs if extract_assigned_code_from_desc(tx.description)})

        inv_by_id = {}
        inv_by_code = {}

        inv_conds = []
        if investor_ids:
            inv_conds.append(Investor.id.in_(investor_ids))
        if desc_codes:
            inv_conds.append(Investor.assigned_code.in_(desc_codes))

        if inv_conds:
            try:
                inv_res = await db.execute(
                    select(Investor)
                    .options(selectinload(Investor.package))
                    .where(or_(*inv_conds))
                )
                for inv in inv_res.scalars().all():
                    inv_by_id[inv.id] = inv
                    if inv.assigned_code:
                        clean_c = inv.assigned_code.strip()
                        inv_by_code[clean_c] = inv
                        inv_by_code[clean_c.upper()] = inv
            except Exception as e:
                print(f"[daily_yields] Error al cargar contratos de investors: {e}", flush=True)

        items = []
        for tx in txs:
            w_user = tx.wallet.user if tx.wallet else None
            inv_code, pkg_name, inv_id = resolve_assigned_code_and_package(
                tx=tx,
                w_user=w_user,
                inv_by_id=inv_by_id,
                inv_by_code=inv_by_code
            )

            type_label = "Rendimiento Ordinario"
            if tx.reference_type == "bono_aceleracion":
                type_label = "Bono de Aceleración"
            elif tx.reference_type == "reverso_rendimiento" or tx.type == "egreso":
                type_label = "Reverso de Rendimiento"

            amt = safe_float(tx.amount)
            bal_after = safe_float(tx.balance_after)
            bal_before = (bal_after - amt) if tx.type == "ingreso" else (bal_after + amt)

            items.append({
                "id": tx.id,
                "batch_id": "PAGO_WALLET",
                "user_id": w_user.id if w_user else None,
                "user_name": w_user.name if w_user else "Usuario N/A",
                "user_email": w_user.email if w_user else "",
                "document_id": w_user.document_id if w_user else "N/A",
                "investor_id": inv_id,
                "assigned_code": inv_code,
                "package_name": pkg_name,
                "type": tx.reference_type or "rendimiento_inversion",
                "type_label": type_label,
                "amount": amt,
                "balance_before": bal_before,
                "balance_after": bal_after,
                "status": "COMPLETED",
                "message": tx.description or "",
                "created_at": tx.created_at.isoformat() if tx.created_at else None,
                "created_at_cot": tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else None
            })

        return {
            "items": items,
            "total": total_records,
            "total_amount_sum": safe_float(total_amount_sum),
            "page": page,
            "page_size": page_size,
            "total_pages": (total_records + page_size - 1) // page_size if page_size > 0 else 1
        }

    except Exception as e:
        print(f"[daily_yields.list_daily_yield_movements] ERROR: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al listar movimientos de rendimientos: {str(e)}"
        )


@router.post("/trigger-daily", summary="Ejecutar dispersión diaria manualmente")
async def trigger_daily_yield_manually(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_permission)
) -> Dict[str, Any]:
    """
    Permite a un administrador forzar o adelantar la ejecución de la dispersión de rendimientos
    para el ciclo de hoy (ayer -> hoy en Colombia). La ejecución es estrictamente idempotente.
    """
    run_time_cot = get_colombia_now()
    today_cot = run_time_cot.date()
    yesterday_cot = today_cot - timedelta(days=1)

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:300]

    try:
        summary = await DailyYieldService.execute_yield_dispersal(
            db=db,
            start_date=yesterday_cot,
            end_date=today_cot,
            pay_mode="all",
            is_automatic=False,
            triggered_by_user=current_user,
            ip_address=ip_address,
            user_agent=user_agent
        )
        return summary
    except Exception as e:
        print(f"[daily_yields.trigger_daily_yield_manually] ERROR: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al ejecutar la dispersión de rendimientos: {str(e)}"
        )


@router.get("/export", summary="Exportar movimientos a CSV")
async def export_daily_yields_csv(
    date: Optional[str] = Query(None, description="Fecha específica YYYY-MM-DD"),
    start_date: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    batch_id: Optional[str] = Query(None, description="ID del lote"),
    type: Optional[str] = Query(None, description="Tipo de rendimiento"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_permission)
):
    """
    Exporta en formato CSV estructurado los movimientos y pagos de rendimientos,
    con codificación UTF-8 con BOM para visualización perfecta en Microsoft Excel.
    """
    try:
        conditions = []
        if type:
            conditions.append(WalletTransaction.reference_type == type)
        else:
            conditions.append(WalletTransaction.reference_type.in_(["rendimiento_inversion", "bono_aceleracion", "reverso_rendimiento"]))

        if date:
            try:
                target_d = datetime.strptime(date.strip(), "%Y-%m-%d").date()
                d_start = datetime.combine(target_d, datetime.min.time())
                d_end = datetime.combine(target_d, datetime.max.time())
                conditions.append(WalletTransaction.created_at >= d_start)
                conditions.append(WalletTransaction.created_at <= d_end)
            except ValueError:
                pass
        else:
            if start_date:
                try:
                    s_d = datetime.strptime(start_date.strip(), "%Y-%m-%d")
                    conditions.append(WalletTransaction.created_at >= s_d)
                except ValueError:
                    pass
            if end_date:
                try:
                    e_d = datetime.strptime(end_date.strip(), "%Y-%m-%d") + timedelta(days=1)
                    conditions.append(WalletTransaction.created_at < e_d)
                except ValueError:
                    pass

        if batch_id:
            conditions.append(WalletTransaction.description.ilike(f"%{batch_id}%"))

        query = (
            select(WalletTransaction)
            .join(Wallet, WalletTransaction.wallet_id == Wallet.id)
            .join(User, Wallet.user_id == User.id)
            .options(
                selectinload(WalletTransaction.wallet)
                .selectinload(Wallet.user)
                .selectinload(User.investments)
                .selectinload(Investor.package)
            )
            .where(and_(*conditions))
            .order_by(WalletTransaction.created_at.desc())
            .limit(5000)
        )

        result = await db.execute(query)
        txs = result.scalars().all()

        investor_ids = list({tx.reference_id for tx in txs if tx.reference_id})
        desc_codes = list({extract_assigned_code_from_desc(tx.description) for tx in txs if extract_assigned_code_from_desc(tx.description)})

        inv_by_id = {}
        inv_by_code = {}

        inv_conds = []
        if investor_ids:
            inv_conds.append(Investor.id.in_(investor_ids))
        if desc_codes:
            inv_conds.append(Investor.assigned_code.in_(desc_codes))

        if inv_conds:
            try:
                inv_res = await db.execute(
                    select(Investor)
                    .options(selectinload(Investor.package))
                    .where(or_(*inv_conds))
                )
                for inv in inv_res.scalars().all():
                    inv_by_id[inv.id] = inv
                    if inv.assigned_code:
                        clean_c = inv.assigned_code.strip()
                        inv_by_code[clean_c] = inv
                        inv_by_code[clean_c.upper()] = inv
            except Exception as e:
                print(f"[daily_yields] Error al cargar contratos en exportación: {e}", flush=True)

        output = io.StringIO()
        output.write("\ufeff")  # UTF-8 BOM
        writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

        writer.writerow([
            "ID",
            "Fecha / Hora (COT)",
            "Nombre Beneficiario",
            "Documento / Cédula",
            "Correo Electrónico",
            "Código Inversión",
            "Paquete",
            "Tipo de Movimiento",
            "Monto Acreditado (COP)",
            "Saldo Anterior",
            "Saldo Posterior",
            "Estado",
            "Concepto"
        ])

        for tx in txs:
            w_user = tx.wallet.user if tx.wallet else None
            inv_code, pkg_name, _ = resolve_assigned_code_and_package(
                tx=tx,
                w_user=w_user,
                inv_by_id=inv_by_id,
                inv_by_code=inv_by_code
            )

            type_label = "Rendimiento Ordinario"
            if tx.reference_type == "bono_aceleracion":
                type_label = "Bono de Aceleración"
            elif tx.reference_type == "reverso_rendimiento" or tx.type == "egreso":
                type_label = "Reverso"

            amt = safe_float(tx.amount)
            bal_after = safe_float(tx.balance_after)
            bal_before = (bal_after - amt) if tx.type == "ingreso" else (bal_after + amt)

            writer.writerow([
                tx.id,
                tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else "",
                w_user.name if w_user else "N/A",
                w_user.document_id if w_user else "N/A",
                w_user.email if w_user else "",
                inv_code,
                pkg_name,
                type_label,
                amt,
                bal_before,
                bal_after,
                "Acreditado",
                tx.description or ""
            ])

        filename = f"reporte_rendimientos_{date or get_colombia_today()}.csv"
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        print(f"[daily_yields.export_daily_yields_csv] ERROR: {str(e)}", flush=True)
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error al exportar reporte de rendimientos: {str(e)}"
        )
