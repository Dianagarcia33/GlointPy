"""Reglas puras de los cupones del evento (sin dependencias de otros servicios, para poder compartirlas)."""
from datetime import datetime, timezone
from typing import Optional


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
