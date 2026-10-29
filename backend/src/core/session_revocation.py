"""
Revocación de sesiones.

Cada usuario tiene una versión de sesión (users.token_version). El token de acceso lleva la versión con la que
se emitió (claim "tv") y toda petición autenticada comprueba que siga siendo la vigente. Subir la versión
invalida de golpe todos los tokens anteriores, en cualquier dispositivo (web, móvil, WebSocket).

Compatibilidad: un token emitido antes de existir esta función no trae "tv" y se trata como versión 0, así que
sigue valiendo hasta que se revoque algo (el despliegue no cierra las sesiones abiertas).

Las sesiones de supervisión (cuenta del menor abierta por su tutor, claim "imp_by") dependen además de la
versión del tutor que las creó ("imp_tv"): si el tutor pierde sus sesiones, la del menor también.
"""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select

from src.models.user import User


def _as_int(value: Any) -> Optional[int]:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return None


def token_version_of(payload: dict) -> Optional[int]:
    """Versión de sesión del token (0 si es anterior a la revocación; None si el claim está mal formado)."""
    return _as_int(payload.get("tv", 0))


async def is_session_current(db, payload: dict, user: User) -> bool:
    """True si el token sigue vigente respecto a la versión de sesión del usuario (y del tutor, si supervisa)."""
    token_tv = token_version_of(payload)
    if token_tv is None or token_tv != (_as_int(getattr(user, "token_version", 0)) or 0):
        return False

    imp_by = payload.get("imp_by")
    if imp_by is None:
        return True

    supervisor_id = _as_int(imp_by)
    imp_tv = _as_int(payload.get("imp_tv", 0))
    if not supervisor_id or imp_tv is None:
        return False
    row = (await db.execute(
        select(User.token_version, User.is_active).where(User.id == supervisor_id)
    )).first()
    if row is None or not row.is_active:
        return False
    return (_as_int(row.token_version) or 0) == imp_tv


async def revoke_user_sessions(db, user: User) -> int:
    """
    Invalida todos los tokens emitidos hasta ahora para el usuario. Quien llama debe hacer commit.
    Devuelve la nueva versión (úsala para emitir el token de la sesión que debe seguir viva, si la hay).
    """
    user.token_version = (_as_int(getattr(user, "token_version", 0)) or 0) + 1
    return user.token_version


async def close_live_connections(user_id: int) -> None:
    """
    Cierra los WebSockets abiertos del usuario (chat y notificaciones): solo validan el token al conectarse, así
    que sin esto una conexión abierta seguiría viva tras revocar. Llamar DESPUÉS del commit. Nunca lanza.
    """
    try:
        from src.services.chat_service import manager
        await manager.close_user_connections(user_id)
    except Exception:
        pass
