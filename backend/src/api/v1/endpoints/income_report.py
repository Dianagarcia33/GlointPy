"""
Informe de Ingresos: dinero que entró por paquetes de inversión aprobados, separado por la forma
en que se aprobó cada solicitud.

- Automática: el pago entró por la pasarela Yoint (PSE, Nequi, Botón Bancolombia, Bre-B) y la
  solicitud se aprobó sola al confirmarse el pago (extra_data.auto_approved_by = YOINT_GATEWAY).
- Manual: un administrador validó el comprobante y aprobó la solicitud.

La fecha del informe es la fecha de aprobación (reviewed_at) en hora Colombia.
"""
import csv
import io
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.api.deps import RequirePermission
from src.core.database import get_db
from src.core.timezone import BOGOTA_TZ, get_colombia_today
from src.models.investment_request import InvestmentRequest, InvestmentRequestStatus
from src.models.yoint_payin import YointPayin

router = APIRouter()

view_permission = RequirePermission("admin:income_report:view")
export_permission = RequirePermission("admin:income_report:export")

MAX_RANGE_DAYS = 366

SOURCE_AUTOMATIC = "automatic"
SOURCE_MANUAL = "manual"

YOINT_METHOD_LABELS = {
    "PSE": "PSE",
    "NEQUI": "Nequi",
    "BOTON_BANCOLOMBIA": "Botón Bancolombia",
    "BREB": "Bre-B",
}


def _resolve_range(start_date: Optional[date], end_date: Optional[date]) -> tuple[date, date]:
    """Sin fechas: hoy. Con una sola: ese día. Valida el orden y el tamaño del rango."""
    today = get_colombia_today()
    start = start_date or end_date or today
    end = end_date or start_date or today
    if end < start:
        raise HTTPException(status_code=400, detail="La fecha final no puede ser anterior a la fecha inicial.")
    if (end - start).days > MAX_RANGE_DAYS:
        raise HTTPException(status_code=400, detail="El rango máximo del informe es de un año.")
    return start, end


def _utc_bounds(start: date, end: date) -> tuple[datetime, datetime]:
    """Límites [inicio, fin) del rango de días Colombia, en UTC sin zona (como guarda la base de datos)."""
    lo = datetime.combine(start, time.min, tzinfo=BOGOTA_TZ).astimezone(timezone.utc).replace(tzinfo=None)
    hi = datetime.combine(end + timedelta(days=1), time.min, tzinfo=BOGOTA_TZ).astimezone(timezone.utc).replace(tzinfo=None)
    return lo, hi


def _to_colombia(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(BOGOTA_TZ)


def _num(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _csv_text(value: Any) -> str:
    """Texto seguro para CSV: evita que Excel interprete como fórmula un valor escrito por el usuario."""
    text = str(value or "")
    return f"'{text}" if text[:1] in ("=", "+", "-", "@") else text


def _build_row(req: InvestmentRequest, payin: Optional[YointPayin]) -> Dict[str, Any]:
    extra = req.extra_data if isinstance(req.extra_data, dict) else {}

    is_automatic = extra.get("auto_approved_by") == "YOINT_GATEWAY" or payin is not None
    source = SOURCE_AUTOMATIC if is_automatic else SOURCE_MANUAL

    package_amount = _num(req.monto)
    is_upgrade = bool(extra.get("es_aumento_capital") or extra.get("is_upgrade"))

    # En un aumento de capital el monto de la solicitud es el valor del paquete nuevo: el dinero
    # que entra es la diferencia con el paquete anterior (misma regla de la venta comercial).
    income = package_amount
    if is_upgrade:
        diff = package_amount - _num(extra.get("previous_package_value"))
        if diff > 0:
            income = diff

    wallet_used = min(max(_num(extra.get("monto_billetera_usado")), 0.0), income)

    if is_automatic:
        raw_method = (payin.payment_method if payin else None) or extra.get("yoint_payment_method") or ""
        method = YOINT_METHOD_LABELS.get(str(raw_method).upper(), str(raw_method) or "Pago en línea")
        approved_by = "Yoint (automático)"
        reference = (payin.order_id if payin else None) or extra.get("yoint_order_id")
    else:
        method = "Billetera" if wallet_used >= income and not req.comprobante_path else "Transferencia / consignación"
        approved_by = req.reviewer.name if req.reviewer else None
        reference = None

    approved_cot = _to_colombia(req.reviewed_at or req.created_at)

    return {
        "id": req.id,
        "source": source,
        "approved_at": approved_cot.isoformat() if approved_cot else None,
        "day": approved_cot.date().isoformat() if approved_cot else None,
        "investor_name": req.user.name if req.user else None,
        "investor_email": req.user.email if req.user else None,
        "investor_document": req.user.document_id if req.user else None,
        "contract_id": req.investor_id,
        "is_upgrade": is_upgrade,
        "package_amount": package_amount,
        "income_amount": income,
        "wallet_used": wallet_used,
        "external_amount": income - wallet_used,
        "payment_method": method,
        "reference": reference,
        "approved_by": approved_by,
        "has_receipt": bool(req.comprobante_path),
    }


async def _load_rows(db: AsyncSession, start: date, end: date) -> List[Dict[str, Any]]:
    lo, hi = _utc_bounds(start, end)
    approved_at = func.coalesce(InvestmentRequest.reviewed_at, InvestmentRequest.created_at)

    res = await db.execute(
        select(InvestmentRequest)
        .options(selectinload(InvestmentRequest.user), selectinload(InvestmentRequest.reviewer))
        .where(
            InvestmentRequest.status == InvestmentRequestStatus.approved,
            InvestmentRequest.deleted_at.is_(None),
            approved_at >= lo,
            approved_at < hi,
        )
        .order_by(approved_at.desc(), InvestmentRequest.id.desc())
    )
    requests = res.scalars().all()
    if not requests:
        return []

    payins_res = await db.execute(
        select(YointPayin)
        .where(
            YointPayin.investment_request_id.in_([r.id for r in requests]),
            YointPayin.status == "SUCCESS",
        )
        .order_by(YointPayin.id.asc())
    )
    payin_by_request: Dict[int, YointPayin] = {}
    for p in payins_res.scalars().all():
        payin_by_request[p.investment_request_id] = p

    return [_build_row(r, payin_by_request.get(r.id)) for r in requests]


def _summarize(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    def bucket(items: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "count": len(items),
            "amount": sum(r["income_amount"] for r in items),
            "wallet_used": sum(r["wallet_used"] for r in items),
            "external_amount": sum(r["external_amount"] for r in items),
        }

    return {
        "total": bucket(rows),
        "automatic": bucket([r for r in rows if r["source"] == SOURCE_AUTOMATIC]),
        "manual": bucket([r for r in rows if r["source"] == SOURCE_MANUAL]),
    }


def _by_day(rows: List[Dict[str, Any]], start: date, end: date) -> List[Dict[str, Any]]:
    days: Dict[str, Dict[str, Any]] = defaultdict(
        lambda: {"automatic_amount": 0.0, "automatic_count": 0, "manual_amount": 0.0, "manual_count": 0}
    )
    for r in rows:
        d = days[r["day"]]
        d[f"{r['source']}_amount"] += r["income_amount"]
        d[f"{r['source']}_count"] += 1

    out = []
    current = start
    while current <= end:
        key = current.isoformat()
        d = days[key]
        out.append({"date": key, **d, "total_amount": d["automatic_amount"] + d["manual_amount"]})
        current += timedelta(days=1)
    return out


def _filter_rows(rows: List[Dict[str, Any]], source: Optional[str], search: Optional[str]) -> List[Dict[str, Any]]:
    if source in (SOURCE_AUTOMATIC, SOURCE_MANUAL):
        rows = [r for r in rows if r["source"] == source]
    term = (search or "").strip().lower()
    if term:
        def matches(r: Dict[str, Any]) -> bool:
            haystack = " ".join(str(v) for v in (
                r["id"], r["investor_name"], r["investor_email"], r["investor_document"],
                r["contract_id"], r["reference"], r["approved_by"],
            ) if v)
            return term in haystack.lower()
        rows = [r for r in rows if matches(r)]
    return rows


@router.get("", summary="Informe de ingresos por paquetes aprobados (automáticos vs. manuales)", dependencies=[Depends(view_permission)])
async def get_income_report(
    start_date: Optional[date] = Query(None, description="Día inicial (hora Colombia). Sin fechas se usa hoy."),
    end_date: Optional[date] = Query(None, description="Día final (hora Colombia), incluido."),
    source: Optional[str] = Query(None, pattern="^(automatic|manual)$", description="Filtra el detalle por tipo de aprobación."),
    search: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    start, end = _resolve_range(start_date, end_date)
    rows = await _load_rows(db, start, end)

    # El resumen y la serie diaria siempre muestran las dos fuentes; los filtros aplican al detalle.
    filtered = _filter_rows(rows, source, search)
    total = len(filtered)
    offset = (page - 1) * page_size

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "summary": _summarize(rows),
        "by_day": _by_day(rows, start, end),
        "items": filtered[offset:offset + page_size],
        "filtered_amount": sum(r["income_amount"] for r in filtered),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
    }


@router.get("/export", summary="Exportar el informe de ingresos a CSV", dependencies=[Depends(export_permission)])
async def export_income_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    source: Optional[str] = Query(None, pattern="^(automatic|manual)$"),
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
):
    start, end = _resolve_range(start_date, end_date)
    rows = _filter_rows(await _load_rows(db, start, end), source, search)

    output = io.StringIO()
    output.write("﻿")  # BOM para que Excel abra bien los acentos
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_MINIMAL)
    writer.writerow([
        "Solicitud", "Fecha de aprobación", "Tipo de aprobación", "Inversionista", "Documento", "Correo",
        "Contrato", "Concepto", "Valor del paquete", "Ingreso", "Pagado con billetera", "Ingreso externo",
        "Medio de pago", "Referencia Yoint", "Aprobado por",
    ])
    for r in rows:
        approved = datetime.fromisoformat(r["approved_at"]).strftime("%Y-%m-%d %H:%M:%S") if r["approved_at"] else ""
        writer.writerow([
            r["id"], approved,
            "Automática (Yoint)" if r["source"] == SOURCE_AUTOMATIC else "Manual (administrador)",
            _csv_text(r["investor_name"]), _csv_text(r["investor_document"]), _csv_text(r["investor_email"]),
            r["contract_id"] or "", "Aumento de capital" if r["is_upgrade"] else "Inversión nueva",
            f"{r['package_amount']:.2f}", f"{r['income_amount']:.2f}", f"{r['wallet_used']:.2f}",
            f"{r['external_amount']:.2f}", r["payment_method"], _csv_text(r["reference"]), _csv_text(r["approved_by"]),
        ])

    suffix = start.isoformat() if start == end else f"{start.isoformat()}_a_{end.isoformat()}"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=informe_ingresos_{suffix}.csv"},
    )
