"""
Cupones de descuento del evento Gloint Power Tech para comprar en Gloint Place.

- Cada asistente vigente (presencial o virtual) recibe un código personal; el equipo ve a quién se le dio cada uno.
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
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import Event, EventAttendee, EventCoupon
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

    @classmethod
    async def _ensure_coupon(cls, db: AsyncSession, event: Event, attendee: EventAttendee) -> EventCoupon:
        coupon = (await db.execute(select(EventCoupon).where(
            EventCoupon.event_id == event.id, EventCoupon.attendee_id == attendee.id))).scalar_one_or_none()
        if coupon:
            return coupon
        coupon = EventCoupon(event_id=event.id, attendee_id=attendee.id, code=await cls._new_code(db))
        db.add(coupon)
        await db.commit()
        await db.refresh(coupon)
        return coupon

    @classmethod
    async def _ensure_all(cls, db: AsyncSession, event: Event) -> None:
        """Un cupón para cada asistente vigente que aún no tenga (también los que se inscriban después de activar)."""
        have = set((await db.execute(select(EventCoupon.attendee_id).where(EventCoupon.event_id == event.id))).scalars().all())
        attendees = (await db.execute(select(EventAttendee).where(
            EventAttendee.event_id == event.id, EventAttendee.status == "confirmed").order_by(EventAttendee.id))).scalars().all()
        created = False
        for a in attendees:
            if a.id not in have:
                db.add(EventCoupon(event_id=event.id, attendee_id=a.id, code=await cls._new_code(db)))
                await db.flush()
                created = True
        if created:
            await db.commit()

    # ------------------------------------------------------------------ asistente (por token)
    @classmethod
    async def get_for_attendee(cls, db: AsyncSession, token: str) -> dict:
        attendee = await EventAttendanceService._get_by_token(db, token)
        if attendee.status != "confirmed":
            raise HTTPException(status_code=403, detail="Tu inscripción está cancelada.")
        event = await EventService.get_or_create_default_event(db)
        base = {"full_name": attendee.full_name, "percent": event.coupon_percent, "hours": event.coupon_hours}
        if not event.coupon_active:
            return {**base, "active": False, "status": "inactive", "code": None}
        coupon = await cls._ensure_coupon(db, event, attendee)
        status = coupon_status(event, coupon)
        return {
            **base,
            "active": coupon_is_live(event),
            "status": status,
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
        if event.coupon_active:
            await cls._ensure_all(db, event)
        rows = (await db.execute(
            select(EventCoupon, EventAttendee).join(EventAttendee, EventAttendee.id == EventCoupon.attendee_id)
            .where(EventCoupon.event_id == event.id).order_by(EventCoupon.id))).all()
        now = datetime.now(timezone.utc)
        items = [{
            "attendee_id": a.id, "full_name": a.full_name, "email": a.email,
            "attendee_type": a.attendee_type, "attendance_mode": a.attendance_mode,
            "code": c.code, "status": coupon_status(event, c, now),
            "redeemed_at": c.redeemed_at, "redeemed_order_ref": c.redeemed_order_ref,
        } for c, a in rows]
        counts = {s: sum(1 for i in items if i["status"] == s) for s in ("valid", "redeemed", "expired", "inactive")}
        return {
            "active": bool(event.coupon_active),
            "live": coupon_is_live(event, now),
            "percent": event.coupon_percent, "hours": event.coupon_hours,
            "store_url": event.coupon_store_url or DEFAULT_STORE_URL,
            "starts_at": aware(event.coupon_starts_at), "expires_at": aware(event.coupon_expires_at),
            "counts": counts, "total": len(items), "coupons": items,
        }

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
        """Activa (genera los cupones y arranca la vigencia) o desactiva. Los asistentes lo ven al instante."""
        event = await EventService.get_or_create_default_event(db)
        if active:
            now = datetime.now(timezone.utc)
            event.coupon_active = True
            event.coupon_starts_at = now
            event.coupon_expires_at = now + timedelta(hours=event.coupon_hours)
            if not event.coupon_store_url:
                event.coupon_store_url = DEFAULT_STORE_URL
            await db.commit()
            await cls._ensure_all(db, event)
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
