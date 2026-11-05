"""
Cupones de descuento del evento Gloint Power Tech para comprar en Gloint Place.

- El equipo ELIGE a quién se le da un cupón (no es para todos los inscritos): cada seleccionado recibe un código personal.
  Quien no fue seleccionado no tiene cupón, no ve avisos y la tienda rechaza cualquier código inventado.
- El equipo activa los cupones durante la presentación: desde ese momento corre la vigencia (por defecto 48 horas).
- El descuento lo aplica Gloint Place (otro proyecto): consulta aquí si un código es válido y luego lo marca como usado.
  Cada código se puede usar una sola vez.
"""
import io
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

from fastapi import HTTPException
from typing import Iterable, List

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import Event, EventAttendee, EventCoupon, EventLiveSession
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_coupon_rules import aware, coupon_is_live
from src.services.event_question_service import questions_hub
from src.services.event_service import EventService

logger = logging.getLogger(__name__)

CODE_PREFIX = "GPT-"
# Sin letras ni números que se confundan (0/O, 1/I): el código se puede dictar o digitar
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
CODE_LENGTH = 8
DEFAULT_STORE_URL = "https://glointplace.com.co"


def generate_code() -> str:
    return CODE_PREFIX + "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LENGTH))


def normalize_code(raw: str) -> str:
    return (raw or "").strip().upper().replace(" ", "")


def build_store_link(store_url: Optional[str], code: str) -> str:
    """Enlace a la tienda con el cupón en el parámetro `cupon` (conserva lo que ya traiga la URL)."""
    parsed = urlparse((store_url or DEFAULT_STORE_URL).strip())
    query = [(k, v) for k, v in parse_qsl(parsed.query) if k != "cupon"] + [("cupon", code)]
    return urlunparse(parsed._replace(query=urlencode(query)))


def build_qr_png(link: str) -> bytes:
    import segno
    buffer = io.BytesIO()
    segno.make(link, error="m").save(buffer, kind="png", scale=8, border=2)
    return buffer.getvalue()


def coupon_status(event: Event, coupon: EventCoupon, now: Optional[datetime] = None) -> str:
    """valid | redeemed | expired | inactive"""
    now = now or datetime.now(timezone.utc)
    if coupon.redeemed_at:
        return "redeemed"
    if not event.coupon_active:
        return "inactive"
    expires = aware(event.coupon_expires_at)
    if expires is not None and now >= expires:
        return "expired"
    return "valid"


class EventCouponService:
    # ------------------------------------------------------------------ helpers
    @staticmethod
    async def _new_code(db: AsyncSession) -> str:
        for _ in range(10):
            code = generate_code()
            if not (await db.execute(select(EventCoupon.id).where(EventCoupon.code == code))).first():
                return code
        raise HTTPException(status_code=500, detail="No se pudo generar un código único. Inténtalo de nuevo.")

    @staticmethod
    def _clean_ids(attendee_ids: Iterable) -> List[int]:
        ids = []
        for raw in attendee_ids or []:
            if isinstance(raw, bool) or not isinstance(raw, int):
                raise HTTPException(status_code=422, detail="La selección tiene identificadores no válidos.")
            ids.append(raw)
        ids = list(dict.fromkeys(ids))   # sin repetidos, conservando el orden
        if not ids:
            raise HTTPException(status_code=422, detail="Selecciona al menos un asistente.")
        if len(ids) > 2000:
            raise HTTPException(status_code=422, detail="Demasiados asistentes en una sola acción (máximo 2000).")
        return ids

    # ------------------------------------------------------------------ asistente (por token)
    @classmethod
    async def get_for_attendee(cls, db: AsyncSession, token: str) -> dict:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        event = await EventService.get_or_create_default_event(db)
        coupon = (await db.execute(select(EventCoupon).where(
            EventCoupon.event_id == event.id, EventCoupon.attendee_id == attendee.id))).scalar_one_or_none()
        base = {"full_name": attendee.full_name, "percent": event.coupon_percent, "hours": event.coupon_hours,
                "assigned": coupon is not None}
        if not coupon:      # no fue seleccionado
            return {**base, "active": False, "status": "none", "code": None}
        if not event.coupon_active:   # seleccionado, pero el equipo aún no los activa: el código no se muestra todavía
            return {**base, "active": False, "status": "inactive", "code": None}
        return {
            **base,
            "active": coupon_is_live(event),
            "status": coupon_status(event, coupon),
            "code": coupon.code,
            "expires_at": aware(event.coupon_expires_at),
            "store_link": build_store_link(event.coupon_store_url, coupon.code),
            "redeemed_at": coupon.redeemed_at,
        }

    @classmethod
    async def get_qr(cls, db: AsyncSession, token: str) -> bytes:
        data = await cls.get_for_attendee(db, token)
        if not data.get("code") or data["status"] != "valid":
            raise HTTPException(status_code=404, detail="El cupón no está disponible.")
        return build_qr_png(data["store_link"])

    # ------------------------------------------------------------------ admin
    @classmethod
    async def admin_overview(cls, db: AsyncSession) -> dict:
        event = await EventService.get_or_create_default_event(db)
        attendees = (await db.execute(select(EventAttendee).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed").order_by(EventAttendee.id))).scalars().all()
        coupons = {c.attendee_id: c for c in (await db.execute(
            select(EventCoupon).where(EventCoupon.event_id == event.id))).scalars().all()}
        joined_live = set((await db.execute(select(EventLiveSession.attendee_id).where(
            EventLiveSession.event_id == event.id))).scalars().all())
        now = datetime.now(timezone.utc)

        candidates = []
        for a in attendees:
            c = coupons.get(a.id)
            candidates.append({
                "attendee_id": a.id, "full_name": a.full_name, "email": a.email,
                "attendee_type": a.attendee_type, "attendance_mode": a.attendance_mode,
                # asistió: entró por la puerta (presencial) o se conectó a la sala (virtual)
                "attended": bool(a.checked_in_at) or a.id in joined_live,
                "code": c.code if c else None,
                "status": coupon_status(event, c, now) if c else None,
                "redeemed_at": c.redeemed_at if c else None,
                "redeemed_order_ref": c.redeemed_order_ref if c else None,
            })
        given = [i for i in candidates if i["code"]]
        counts = {s: sum(1 for i in given if i["status"] == s) for s in ("valid", "redeemed", "expired", "inactive")}
        return {
            "active": bool(event.coupon_active),
            "live": coupon_is_live(event, now),
            "percent": event.coupon_percent, "hours": event.coupon_hours,
            "store_url": event.coupon_store_url or DEFAULT_STORE_URL,
            "starts_at": aware(event.coupon_starts_at), "expires_at": aware(event.coupon_expires_at),
            "counts": counts, "total": len(given), "eligible": len(candidates),
            "candidates": candidates, "coupons": given,
        }

    @classmethod
    async def assign(cls, db: AsyncSession, attendee_ids: Iterable) -> dict:
        """Da cupón a los asistentes elegidos (solo inscripciones vigentes). Quien ya tiene uno lo conserva."""
        ids = cls._clean_ids(attendee_ids)
        event = await EventService.get_or_create_default_event(db)
        valid = set((await db.execute(select(EventAttendee.id).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed", EventAttendee.id.in_(ids)))).scalars().all())
        have = set((await db.execute(select(EventCoupon.attendee_id).where(
            EventCoupon.event_id == event.id, EventCoupon.attendee_id.in_(valid or [0])))).scalars().all())
        created = 0
        for attendee_id in ids:
            if attendee_id in valid and attendee_id not in have:
                db.add(EventCoupon(event_id=event.id, attendee_id=attendee_id, code=await cls._new_code(db)))
                await db.flush()
                created += 1
        if created:
            await db.commit()
        overview = await cls.admin_overview(db)
        overview["result"] = {"assigned": created, "already_had": len(have), "ignored": len(ids) - len(valid)}
        return overview

    @classmethod
    async def revoke(cls, db: AsyncSession, attendee_ids: Iterable) -> dict:
        """Quita el cupón a los asistentes elegidos. Un cupón ya usado en una compra no se puede quitar."""
        ids = cls._clean_ids(attendee_ids)
        event = await EventService.get_or_create_default_event(db)
        used = set((await db.execute(select(EventCoupon.attendee_id).where(
            EventCoupon.event_id == event.id, EventCoupon.attendee_id.in_(ids), EventCoupon.redeemed_at.isnot(None)))).scalars().all())
        result = await db.execute(delete(EventCoupon).where(
            EventCoupon.event_id == event.id, EventCoupon.attendee_id.in_(ids), EventCoupon.redeemed_at.is_(None)))
        await db.commit()
        overview = await cls.admin_overview(db)
        overview["result"] = {"revoked": result.rowcount or 0, "kept_used": len(used)}
        return overview

    @classmethod
    async def update_config(cls, db: AsyncSession, percent: int, hours: int, store_url: str) -> dict:
        event = await EventService.get_or_create_default_event(db)
        if event.coupon_active:
            raise HTTPException(status_code=400, detail="Desactiva los cupones antes de cambiar el descuento, la vigencia o la tienda.")
        if isinstance(percent, bool) or not isinstance(percent, int) or not (1 <= percent <= 100):
            raise HTTPException(status_code=422, detail="El descuento debe estar entre 1 % y 100 %.")
        if isinstance(hours, bool) or not isinstance(hours, int) or not (1 <= hours <= 720):
            raise HTTPException(status_code=422, detail="La vigencia debe estar entre 1 y 720 horas.")
        url = (store_url or "").strip()
        parsed = urlparse(url)
        if parsed.scheme != "https" or not parsed.netloc or len(url) > 500:
            raise HTTPException(status_code=422, detail="La tienda debe ser un enlace https válido.")
        event.coupon_percent, event.coupon_hours, event.coupon_store_url = percent, hours, url
        await db.commit()
        return await cls.admin_overview(db)

    @classmethod
    async def set_active(cls, db: AsyncSession, active: bool) -> dict:
        """Activa (arranca la vigencia para los seleccionados) o desactiva. Quien tiene cupón lo ve al instante."""
        event = await EventService.get_or_create_default_event(db)
        if active:
            assigned = (await db.execute(select(func.count(EventCoupon.id)).where(EventCoupon.event_id == event.id))).scalar() or 0
            if assigned == 0:
                raise HTTPException(status_code=400, detail="Selecciona al menos un asistente para darle cupón antes de activarlos.")
            now = datetime.now(timezone.utc)
            event.coupon_active = True
            event.coupon_starts_at = now
            event.coupon_expires_at = now + timedelta(hours=event.coupon_hours)
            if not event.coupon_store_url:
                event.coupon_store_url = DEFAULT_STORE_URL
            await db.commit()
        else:
            event.coupon_active = False
            await db.commit()
        # Los asistentes ven el cupón por la sala (latido) o su página (cada 15 s); el aviso solo es para el equipo
        await questions_hub.notify("coupon", attendees=False)
        return await cls.admin_overview(db)

    # ------------------------------------------------------------------ Gloint Place (app externa)
    @classmethod
    async def validate(cls, db: AsyncSession, raw_code: str) -> dict:
        """Dice a la tienda si un código sirve y de cuánto es el descuento. No revela datos de la persona."""
        event = await EventService.get_or_create_default_event(db)
        code = normalize_code(raw_code)
        coupon = (await db.execute(select(EventCoupon).where(
            EventCoupon.code == code, EventCoupon.event_id == event.id))).scalar_one_or_none() if code else None
        if not coupon:
            return {"valid": False, "reason": "not_found"}
        status = coupon_status(event, coupon)
        if status != "valid":
            return {"valid": False, "reason": status, "code": coupon.code}
        return {"valid": True, "code": coupon.code, "percent": event.coupon_percent,
                "expires_at": aware(event.coupon_expires_at)}

    @classmethod
    async def redeem(cls, db: AsyncSession, app_id: int, raw_code: str, order_reference: str) -> dict:
        """Marca el cupón como usado en una compra de la tienda. Un solo uso; repetir la misma compra es idempotente."""
        reference = (order_reference or "").strip()[:255]
        if not reference:
            raise HTTPException(status_code=422, detail="order_reference es obligatorio.")
        event = await EventService.get_or_create_default_event(db)
        code = normalize_code(raw_code)
        coupon = (await db.execute(select(EventCoupon).where(
            EventCoupon.code == code, EventCoupon.event_id == event.id))).scalar_one_or_none() if code else None
        if not coupon:
            raise HTTPException(status_code=404, detail="Cupón no encontrado.")
        if coupon.redeemed_at and coupon.redeemed_order_ref == reference:
            return {"redeemed": True, "already": True, "percent": event.coupon_percent}
        status = coupon_status(event, coupon)
        if status != "valid":
            raise HTTPException(status_code=409, detail={"redeemed": False, "reason": status})

        # Actualización condicionada: si dos compras intentan usarlo a la vez, solo una gana
        result = await db.execute(
            update(EventCoupon).where(EventCoupon.id == coupon.id, EventCoupon.redeemed_at.is_(None))
            .values(redeemed_at=datetime.now(timezone.utc), redeemed_order_ref=reference, redeemed_by_app_id=app_id))
        await db.commit()
        if result.rowcount != 1:
            raise HTTPException(status_code=409, detail={"redeemed": False, "reason": "redeemed"})
        logger.info(f"[EventCoupon] Cupón {coupon.code} canjeado por la app {app_id} (orden {reference}).")
        return {"redeemed": True, "already": False, "percent": event.coupon_percent}
