"""Reglas puras de los cupones del evento (sin dependencias de otros servicios, para poder compartirlas)."""
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.event import EventCoupon


def aware(dt: Optional[datetime]) -> Optional[datetime]:
    """MySQL/SQLite devuelven fechas sin zona: se interpretan como UTC."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def coupon_is_live(event, now: Optional[datetime] = None) -> bool:
    """Los cupones están disponibles: activados por el equipo y dentro de su ventana de vigencia."""
    if not event.coupon_active:
        return False
    expires = aware(event.coupon_expires_at)
    return expires is None or (now or datetime.now(timezone.utc)) < expires


async def attendee_sees_coupon(db: AsyncSession, event, attendee_id: int) -> bool:
    """
    Los cupones están disponibles Y este asistente fue seleccionado por el equipo. Quien no tiene cupón no ve avisos.
    Si los cupones no están disponibles no se consulta la base (esto se llama en cada latido de la sala).
    """
    if not coupon_is_live(event):
        return False
    return (await db.execute(select(EventCoupon.id).where(
        EventCoupon.event_id == event.id, EventCoupon.attendee_id == attendee_id))).first() is not None
