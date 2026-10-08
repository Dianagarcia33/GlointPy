import io
import csv
import json
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any

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
from src.models.auto_transfer_log import AutoTransferLog
from src.services.daily_yield_service import DailyYieldService

router = APIRouter()

# Permiso requerido: administradores de auditoría o de inversionistas
admin_permission = RequirePermission(["admin.audits.manage", "admin.investors.manage", "wallets:view"])


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
    today_cot = get_colombia_today()
    if target_date:
        try:
            query_date = datetime.strptime(target_date, "%Y-%m-%d").date()
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
        det = b.details or {}
        if isinstance(det, str):
            try:
                det = json.loads(det)
            except Exception:
                det = {}
        if det.get("cycle_end_date") == str(query_date) and det.get("cycle_start_date") == str(yesterday_cot):
            target_batch = b
            break

    # 2. Consultar métricas en auto_transfer_logs para este día / lote
    total_dispersed = Decimal("0.00")
    total_yields = Decimal("0.00")
    total_bonuses = Decimal("0.00")
    total_transfers = 0
    unique_users_set = set()

    # Si encontramos lote de auditoría, extraemos los detalles
    if target_batch:
        det = target_batch.details or {}
        if isinstance(det, str):
            try:
                det = json.loads(det)
            except Exception:
                det = {}
        total_dispersed = Decimal(str(det.get("global_grand_total", 0)))
        total_yields = Decimal(str(det.get("global_yield_total", 0)))
        total_bonuses = Decimal(str(det.get("global_acceleration_bonus_total", 0)))
        total_transfers = int(det.get("total_transfers_count", 0))
        total_users_count = int(det.get("total_users_paid", 0))
    else:
        # Consultar directamente en auto_transfer_logs por fecha de creación
        # Consideramos el rango horario de query_date en COT (00:00:00 a 23:59:59)
        day_start = datetime.combine(query_date, datetime.min.time())
        day_end = datetime.combine(query_date, datetime.max.time())

        logs_query = select(AutoTransferLog).where(
            AutoTransferLog.created_at >= day_start,
            AutoTransferLog.created_at <= day_end,
            AutoTransferLog.status == "COMPLETED"
        )
        logs_res = await db.execute(logs_query)
        day_logs = logs_res.scalars().all()

        if day_logs:
            for log in day_logs:
                amt = log.amount or Decimal("0.00")
                total_dispersed += amt
                total_transfers += 1
                if log.user_id:
                    unique_users_set.add(log.user_id)
                if log.type == "rendimiento_inversion":
                    total_yields += amt
                elif log.type == "bono_aceleracion":
                    total_bonuses += amt
            total_users_count = len(unique_users_set)
        else:
            # Fallback a wallet_transactions si auto_transfer_logs no tuviese datos históricos
            wt_query = select(WalletTransaction).where(
                WalletTransaction.created_at >= day_start,
                WalletTransaction.created_at <= day_end,
                WalletTransaction.reference_type.in_(["rendimiento_inversion", "bono_aceleracion"])
            )
            wt_res = await db.execute(wt_query)
            wt_items = wt_res.scalars().all()
            for wt in wt_items:
                amt = wt.amount or Decimal("0.00")
                total_dispersed += amt
                total_transfers += 1
                if wt.reference_type == "rendimiento_inversion":
                    total_yields += amt
                elif wt.reference_type == "bono_aceleracion":
                    total_bonuses += amt
            total_users_count = total_transfers

    # 3. Datos del último lote registrado (general)
    last_batch_info = None
    if recent_batches:
        first_b = recent_batches[0]
        f_det = first_b.details or {}
        if isinstance(f_det, str):
            try:
                f_det = json.loads(f_det)
            except Exception:
                f_det = {}
        last_batch_info = {
            "batch_id": first_b.entity_id,
            "action": first_b.action,
            "status": first_b.status,
            "is_automatic": f_det.get("is_automatic", True),
            "executed_at_cot": f_det.get("executed_at_cot") or (first_b.created_at.strftime("%Y-%m-%d %H:%M:%S") if first_b.created_at else None),
            "global_grand_total": float(f_det.get("global_grand_total", 0)),
            "total_users_paid": f_det.get("total_users_paid", 0),
            "cycle_start_date": f_det.get("cycle_start_date"),
            "cycle_end_date": f_det.get("cycle_end_date"),
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
            det_b = b.details or {}
            if isinstance(det_b, str):
                try:
                    det_b = json.loads(det_b)
                except Exception:
                    det_b = {}
            if det_b.get("cycle_end_date") == str(d):
                d_batch = b
                break

        if d_batch:
            det_b = d_batch.details or {}
            if isinstance(det_b, str):
                try:
                    det_b = json.loads(det_b)
                except Exception:
                    det_b = {}
            history_7_days.append({
                "date": str(d),
                "total_amount": float(det_b.get("global_grand_total", 0)),
                "users_count": int(det_b.get("total_users_paid", 0)),
                "transfers_count": int(det_b.get("total_transfers_count", 0)),
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

    return {
        "target_date": str(query_date),
        "is_today": is_today,
        "is_executed": target_executed,
        "status": "COMPLETED" if target_executed else ("PENDING" if is_today else "SIN_REGISTRO"),
        "total_dispersed": float(total_dispersed),
        "total_yields": float(total_yields),
        "total_bonuses": float(total_bonuses),
        "total_users": total_users_count,
        "total_movements": total_transfers,
        "target_batch": {
            "batch_id": target_batch.entity_id,
            "status": target_batch.status,
            "executed_at": target_batch.created_at.isoformat() if target_batch.created_at else None,
            "details": target_batch.details
        } if target_batch else None,
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
            s_date = datetime.strptime(start_date, "%Y-%m-%d")
            conditions.append(AuditLog.created_at >= s_date)
        except ValueError:
            pass

    if end_date:
        try:
            e_date = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
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
        det = log.details or {}
        if isinstance(det, str):
            try:
                det = json.loads(det)
            except Exception:
                det = {}

        items.append({
            "id": log.id,
            "batch_id": log.entity_id,
            "action": log.action,
            "action_label": "Dispersión Automática" if log.action == "AUTOMATIC_DAILY_YIELD_DISPERSAL" else (
                "Dispersión Manual" if log.action == "MANUAL_BULK_YIELD_DISPERSAL" else "Reverso de Lote"
            ),
            "is_automatic": det.get("is_automatic", log.action == "AUTOMATIC_DAILY_YIELD_DISPERSAL"),
            "cycle_start_date": det.get("cycle_start_date"),
            "cycle_end_date": det.get("cycle_end_date"),
            "executed_at_cot": det.get("executed_at_cot") or (log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None),
            "executed_at_utc": det.get("executed_at_utc"),
            "total_users_paid": int(det.get("total_users_paid", 0)),
            "total_transfers_count": int(det.get("total_transfers_count", 0)),
            "skipped_count": int(det.get("skipped_count", 0)),
            "global_grand_total": float(det.get("global_grand_total", 0.0)),
            "global_yield_total": float(det.get("global_yield_total", 0.0)),
            "global_acceleration_bonus_total": float(det.get("global_acceleration_bonus_total", 0.0)),
            "status": log.status,
            "description": log.description,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })

    return {
        "items": items,
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_records + page_size - 1) // page_size if page_size > 0 else 1
    }


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
    conditions = []

    if batch_id:
        conditions.append(AutoTransferLog.batch_id == batch_id)

    if date:
        try:
            target_d = datetime.strptime(date, "%Y-%m-%d").date()
            d_start = datetime.combine(target_d, datetime.min.time())
            d_end = datetime.combine(target_d, datetime.max.time())
            conditions.append(AutoTransferLog.created_at >= d_start)
            conditions.append(AutoTransferLog.created_at <= d_end)
        except ValueError:
            pass
    else:
        if start_date:
            try:
                s_d = datetime.strptime(start_date, "%Y-%m-%d")
                conditions.append(AutoTransferLog.created_at >= s_d)
            except ValueError:
                pass
        if end_date:
            try:
                e_d = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                conditions.append(AutoTransferLog.created_at < e_d)
            except ValueError:
                pass

    if type:
        conditions.append(AutoTransferLog.type == type)

    if status:
        conditions.append(AutoTransferLog.status == status)

    # 1. Consulta base sobre auto_transfer_logs
    base_query = (
        select(AutoTransferLog)
        .outerjoin(User, AutoTransferLog.user_id == User.id)
        .outerjoin(Investor, AutoTransferLog.investor_id == Investor.id)
        .options(
            selectinload(AutoTransferLog.user),
            selectinload(AutoTransferLog.investor).selectinload(Investor.package)
        )
    )

    if search:
        search_filter = f"%{search.strip()}%"
        conditions.append(
            or_(
                User.name.ilike(search_filter),
                User.email.ilike(search_filter),
                User.document_id.ilike(search_filter),
                Investor.assigned_code.ilike(search_filter),
                AutoTransferLog.batch_id.ilike(search_filter),
                AutoTransferLog.message.ilike(search_filter)
            )
        )

    if conditions:
        base_query = base_query.where(and_(*conditions))

    # Total y suma total de montos
    count_stmt = select(
        func.count(AutoTransferLog.id),
        func.coalesce(func.sum(AutoTransferLog.amount), 0)
    ).outerjoin(User, AutoTransferLog.user_id == User.id).outerjoin(Investor, AutoTransferLog.investor_id == Investor.id)

    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))

    count_res = await db.execute(count_stmt)
    total_records, total_amount_sum = count_res.first() or (0, Decimal("0.00"))

    # Paginación
    offset = (page - 1) * page_size
    query = base_query.order_by(AutoTransferLog.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()

    items = []
    for log in logs:
        # Extraer metadatos
        meta = {}
        if log.metadata_json:
            try:
                meta = json.loads(log.metadata_json) if isinstance(log.metadata_json, str) else log.metadata_json
            except Exception:
                meta = {}

        # Determinar etiqueta legible del tipo
        type_label = "Rendimiento Ordinario"
        if log.type == "bono_aceleracion":
            type_label = "Bono de Aceleración"
        elif log.type == "reverso_rendimiento":
            type_label = "Reverso de Rendimiento"

        u_name = log.user.name if log.user else (meta.get("user_name") or "Usuario N/A")
        u_email = log.user.email if log.user else (meta.get("user_email") or "")
        u_doc = log.user.document_id if log.user else (meta.get("document_id") or "N/A")

        inv_code = (
            log.investor.assigned_code if log.investor else (
                meta.get("assigned_code") or f"INV-{log.investor_id}" if log.investor_id else "N/A"
            )
        )

        pkg_name = "N/A"
        if log.investor and log.investor.package:
            pkg_name = f"Paquete ${log.investor.package.value:,.0f}" if log.investor.package.value else "Paquete Activo"

        items.append({
            "id": log.id,
            "batch_id": log.batch_id,
            "user_id": log.user_id,
            "user_name": u_name,
            "user_email": u_email,
            "document_id": u_doc,
            "investor_id": log.investor_id,
            "assigned_code": inv_code,
            "package_name": pkg_name,
            "type": log.type,
            "type_label": type_label,
            "amount": float(log.amount or 0.0),
            "balance_before": float(meta.get("balance_before", 0.0)) if meta.get("balance_before") is not None else None,
            "balance_after": float(meta.get("balance_after", 0.0)) if meta.get("balance_after") is not None else None,
            "status": log.status,
            "message": log.message,
            "created_at": log.created_at.isoformat() if log.created_at else None,
            "created_at_cot": log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else None
        })

    # Si auto_transfer_logs estuviera vacío (ej. para pagos históricos antes de este registro),
    # complementamos con wallet_transactions de tipo rendimiento_inversion
    if total_records == 0 and not batch_id:
        wt_conds = [
            WalletTransaction.reference_type.in_(["rendimiento_inversion", "bono_aceleracion"])
        ]
        if date:
            try:
                target_d = datetime.strptime(date, "%Y-%m-%d").date()
                d_start = datetime.combine(target_d, datetime.min.time())
                d_end = datetime.combine(target_d, datetime.max.time())
                wt_conds.append(WalletTransaction.created_at >= d_start)
                wt_conds.append(WalletTransaction.created_at <= d_end)
            except ValueError:
                pass

        wt_count_stmt = select(
            func.count(WalletTransaction.id),
            func.coalesce(func.sum(WalletTransaction.amount), 0)
        ).where(and_(*wt_conds))
        wt_c_res = await db.execute(wt_count_stmt)
        total_records, total_amount_sum = wt_c_res.first() or (0, Decimal("0.00"))

        if total_records > 0:
            wt_query = (
                select(WalletTransaction)
                .options(selectinload(WalletTransaction.wallet).selectinload(Wallet.user))
                .where(and_(*wt_conds))
                .order_by(WalletTransaction.created_at.desc())
                .offset(offset)
                .limit(page_size)
            )
            wt_res = await db.execute(wt_query)
            for wt in wt_res.scalars().all():
                w_user = wt.wallet.user if wt.wallet else None
                items.append({
                    "id": wt.id,
                    "batch_id": "HISTORICO_WALLET",
                    "user_id": w_user.id if w_user else None,
                    "user_name": w_user.name if w_user else "N/A",
                    "user_email": w_user.email if w_user else "N/A",
                    "document_id": w_user.document_id if w_user else "N/A",
                    "investor_id": wt.reference_id,
                    "assigned_code": f"INV-{wt.reference_id}" if wt.reference_id else "N/A",
                    "package_name": "Inversión Activa",
                    "type": wt.reference_type,
                    "type_label": "Rendimiento Ordinario" if wt.reference_type == "rendimiento_inversion" else "Bono de Aceleración",
                    "amount": float(wt.amount or 0.0),
                    "balance_before": None,
                    "balance_after": float(wt.balance_after or 0.0),
                    "status": "COMPLETED",
                    "message": wt.description or "Acreditación de rendimiento",
                    "created_at": wt.created_at.isoformat() if wt.created_at else None,
                    "created_at_cot": wt.created_at.strftime("%Y-%m-%d %H:%M:%S") if wt.created_at else None
                })

    return {
        "items": items,
        "total": total_records,
        "total_amount_sum": float(total_amount_sum),
        "page": page,
        "page_size": page_size,
        "total_pages": (total_records + page_size - 1) // page_size if page_size > 0 else 1
    }


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
    conditions = []
    if batch_id:
        conditions.append(AutoTransferLog.batch_id == batch_id)
    if date:
        try:
            target_d = datetime.strptime(date, "%Y-%m-%d").date()
            d_start = datetime.combine(target_d, datetime.min.time())
            d_end = datetime.combine(target_d, datetime.max.time())
            conditions.append(AutoTransferLog.created_at >= d_start)
            conditions.append(AutoTransferLog.created_at <= d_end)
        except ValueError:
            pass
    else:
        if start_date:
            try:
                s_d = datetime.strptime(start_date, "%Y-%m-%d")
                conditions.append(AutoTransferLog.created_at >= s_d)
            except ValueError:
                pass
        if end_date:
            try:
                e_d = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                conditions.append(AutoTransferLog.created_at < e_d)
            except ValueError:
                pass

    if type:
        conditions.append(AutoTransferLog.type == type)

    query = (
        select(AutoTransferLog)
        .options(
            selectinload(AutoTransferLog.user),
            selectinload(AutoTransferLog.investor).selectinload(Investor.package)
        )
        .order_by(AutoTransferLog.created_at.desc())
        .limit(5000)
    )

    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    logs = result.scalars().all()

    # Generación de CSV
    output = io.StringIO()
    # UTF-8 BOM para Excel
    output.write("\ufeff")
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    # Cabeceras
    writer.writerow([
        "ID",
        "Fecha / Hora (COT)",
        "ID Lote",
        "Nombre Beneficiario",
        "Documento / Cédula",
        "Correo Electrónico",
        "Código Inversión",
        "Tipo de Movimiento",
        "Monto Acreditado (COP)",
        "Saldo Anterior",
        "Saldo Posterior",
        "Estado",
        "Mensaje / Concepto"
    ])

    for log in logs:
        meta = {}
        if log.metadata_json:
            try:
                meta = json.loads(log.metadata_json) if isinstance(log.metadata_json, str) else log.metadata_json
            except Exception:
                meta = {}

        u_name = log.user.name if log.user else (meta.get("user_name") or "N/A")
        u_doc = log.user.document_id if log.user else (meta.get("document_id") or "N/A")
        u_email = log.user.email if log.user else (meta.get("user_email") or "")
        inv_code = log.investor.assigned_code if log.investor else (meta.get("assigned_code") or f"INV-{log.investor_id}")

        type_label = "Rendimiento Ordinario"
        if log.type == "bono_aceleracion":
            type_label = "Bono de Aceleración"
        elif log.type == "reverso_rendimiento":
            type_label = "Reverso"

        writer.writerow([
            log.id,
            log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else "",
            log.batch_id,
            u_name,
            u_doc,
            u_email,
            inv_code,
            type_label,
            float(log.amount or 0.0),
            meta.get("balance_before", ""),
            meta.get("balance_after", ""),
            log.status,
            log.message or ""
        ])

    filename = f"reporte_rendimientos_{date or get_colombia_today()}.csv"
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
