"""
Sesiones de dispositivo para la app móvil: token de acceso corto + token de refresco por dispositivo.

- El token de refresco es opaco ("<id_de_sesión>.<secreto>"). En la base solo se guarda el hash SHA-256 del secreto.
- Rota en cada uso. Si alguien presenta un secreto ya rotado fuera de la tolerancia (REFRESH_REUSE_GRACE_SECONDS),
  se asume robo y esa sesión se revoca. Dentro de la tolerancia se trata como un reintento de red.
- Vence por inactividad (REFRESH_IDLE_DAYS) y por un tope absoluto (REFRESH_ABSOLUTE_DAYS).
- Deja de valer si cambia la versión de sesión del usuario (cambio de contraseña, "cerrar todas las sesiones"...).
- Todos los fallos del refresco responden lo mismo (401) para no dar pistas a quien adivina.
"""
from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.core.security import create_access_token
from src.models.security import Role
from src.models.user import User
from src.models.user_session import UserSession

SESSION_ERROR = "Sesión expirada o inválida. Inicia sesión de nuevo."


def invalid_session() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=SESSION_ERROR,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _hash(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def _new_secret() -> str:
    return secrets.token_urlsafe(48)


def build_refresh_token(session_id: int, secret: str) -> str:
    return f"{session_id}.{secret}"


def parse_refresh_token(token: Optional[str]) -> Optional[Tuple[int, str]]:
    """Devuelve (id de sesión, secreto) o None si el formato no es válido."""
    if not token or "." not in token:
        return None
    raw_id, secret = token.split(".", 1)
    try:
        session_id = int(raw_id)
    except ValueError:
        return None
    return (session_id, secret) if session_id > 0 and secret else None


def _matches(presented_hash: str, stored_hash: Optional[str]) -> bool:
    return bool(stored_hash) and hmac.compare_digest(presented_hash, stored_hash)


def mobile_access_ttl() -> timedelta:
    return timedelta(minutes=settings.MOBILE_ACCESS_TOKEN_MINUTES)


class DeviceSessionService:
    @staticmethod
    def access_token_for(user: User, session: UserSession) -> str:
        """Token de acceso corto ligado a la sesión del dispositivo (claim sid) y a la versión de sesión del usuario."""
        return create_access_token(
            subject=user.id,
            expires_delta=mobile_access_ttl(),
            token_version=user.token_version,
            extra_claims={"sid": session.id},
        )

    @staticmethod
    def token_response(user: User, session: UserSession, refresh_token: str) -> dict:
        return {
            "access_token": DeviceSessionService.access_token_for(user, session),
            "token_type": "bearer",
            "refresh_token": refresh_token,
            "expires_in": int(mobile_access_ttl().total_seconds()),
            "session_id": session.id,
            "user": user,
        }

    @staticmethod
    def is_active(session: UserSession, user_token_version: int, now: Optional[datetime] = None) -> bool:
        """Vigente: no revocada, dentro del tope absoluto y de la inactividad, y con la versión de sesión actual."""
        now = now or datetime.utcnow()
        if session.revoked_at is not None:
            return False
        if session.expires_at is not None and session.expires_at <= now:
            return False
        last_used = session.last_used_at or session.created_at
        if last_used and last_used + timedelta(days=settings.REFRESH_IDLE_DAYS) <= now:
            return False
        return int(session.token_version or 0) == int(user_token_version or 0)

    @staticmethod
    def _revoke(session: UserSession, reason: str, now: Optional[datetime] = None) -> None:
        session.revoked_at = now or datetime.utcnow()
        session.revoked_reason = reason

    @staticmethod
    async def create_session(db, user: User, client, ip: Optional[str] = None) -> Tuple[UserSession, str]:
        """Abre una sesión para el dispositivo. Devuelve la sesión y el token de refresco (única vez que se ve)."""
        now = datetime.utcnow()

        # 1) La sesión anterior del mismo dispositivo se reemplaza
        same_device = (await db.execute(
            select(UserSession).where(
                UserSession.user_id == user.id,
                UserSession.device_id == client.device_id,
                UserSession.revoked_at.is_(None),
            )
        )).scalars().all()
        for s in same_device:
            DeviceSessionService._revoke(s, "replaced", now)

        # 2) Tope de sesiones simultáneas: se cierra la que lleva más tiempo sin usarse
        active = [
            s for s in (await db.execute(
                select(UserSession)
                .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
                .order_by(UserSession.last_used_at.asc())
            )).scalars().all()
            if DeviceSessionService.is_active(s, user.token_version, now)
        ]
        excess = len(active) - (settings.MAX_DEVICE_SESSIONS - 1)
        for s in active[:max(0, excess)]:
            DeviceSessionService._revoke(s, "limit", now)

        session = UserSession(
            user_id=user.id,
            token_hash="",
            token_version=user.token_version or 0,
            device_id=client.device_id,
            device_name=client.device_name,
            platform=client.platform,
            app_version=client.app_version,
            ip_address=ip,
            created_at=now,
            last_used_at=now,
            expires_at=now + timedelta(days=settings.REFRESH_ABSOLUTE_DAYS),
        )
        db.add(session)
        await db.flush()  # asigna el id, que va dentro del token

        secret = _new_secret()
        session.token_hash = _hash(secret)
        await db.commit()
        return session, build_refresh_token(session.id, secret)

    @staticmethod
    async def refresh(db, refresh_token: str, ip: Optional[str] = None) -> Tuple[UserSession, str, User]:
        """Valida el refresco y lo rota. Devuelve la sesión, el refresco nuevo y el usuario. Falla siempre con 401 genérico."""
        parsed = parse_refresh_token(refresh_token)
        if not parsed:
            raise invalid_session()
        session_id, secret = parsed

        session = (await db.execute(select(UserSession).where(UserSession.id == session_id))).scalars().first()
        if session is None:
            raise invalid_session()

        presented = _hash(secret)
        is_current = _matches(presented, session.token_hash)
        is_previous = _matches(presented, session.prev_token_hash)
        if not (is_current or is_previous):
            raise invalid_session()  # no coincide: no se toca la sesión (podría ser alguien adivinando)
        if session.revoked_at is not None:
            raise invalid_session()

        now = datetime.utcnow()

        user = (await db.execute(
            select(User).options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.parent),
                selectinload(User.children),
            ).where(User.id == session.user_id)
        )).scalars().first()

        if user is None or not user.is_active:
            DeviceSessionService._revoke(session, "inactive", now)
            await db.commit()
            raise invalid_session()

        if not DeviceSessionService.is_active(session, user.token_version, now):
            reason = "version" if int(session.token_version or 0) != int(user.token_version or 0) else "expired"
            DeviceSessionService._revoke(session, reason, now)
            await db.commit()
            raise invalid_session()

        if is_previous and not is_current:
            rotated_at = session.rotated_at
            within_grace = bool(rotated_at) and (now - rotated_at).total_seconds() <= settings.REFRESH_REUSE_GRACE_SECONDS
            if not within_grace:
                # Un refresco ya rotado se presenta de nuevo fuera de la tolerancia: posible robo, se cierra la sesión
                DeviceSessionService._revoke(session, "reuse_detected", now)
                await db.commit()
                raise invalid_session()

        new_secret = _new_secret()
        session.prev_token_hash = session.token_hash
        session.token_hash = _hash(new_secret)
        session.rotated_at = now
        session.last_used_at = now
        if ip:
            session.ip_address = ip
        await db.commit()
        return session, build_refresh_token(session.id, new_secret), user

    @staticmethod
    async def revoke_by_refresh_token(db, refresh_token: str) -> None:
        """Cierra la sesión del dispositivo con su refresco. Idempotente y sin pistas si no coincide."""
        parsed = parse_refresh_token(refresh_token)
        if not parsed:
            return
        session_id, secret = parsed
        session = (await db.execute(select(UserSession).where(UserSession.id == session_id))).scalars().first()
        if session is None or session.revoked_at is not None:
            return
        presented = _hash(secret)
        if _matches(presented, session.token_hash) or _matches(presented, session.prev_token_hash):
            DeviceSessionService._revoke(session, "logout")
            await db.commit()

    @staticmethod
    async def list_sessions(db, user: User) -> List[UserSession]:
        """Sesiones de dispositivo vigentes del usuario, la más reciente primero."""
        now = datetime.utcnow()
        rows = (await db.execute(
            select(UserSession)
            .where(UserSession.user_id == user.id, UserSession.revoked_at.is_(None))
            .order_by(UserSession.last_used_at.desc())
        )).scalars().all()
        return [s for s in rows if DeviceSessionService.is_active(s, user.token_version, now)]

    @staticmethod
    async def revoke_user_session(db, user: User, session_id: int) -> bool:
        """El usuario cierra una de sus propias sesiones. False si no existe o no es suya."""
        session = (await db.execute(
            select(UserSession).where(UserSession.id == session_id, UserSession.user_id == user.id)
        )).scalars().first()
        if session is None:
            return False
        if session.revoked_at is None:
            DeviceSessionService._revoke(session, "user")
            await db.commit()
        return True

    @staticmethod
    async def keep_session_alive(db, session_id: Optional[int], user_id: int, new_version: int) -> None:
        """
        Tras cambiar la contraseña (que sube la versión de sesión), la sesión del dispositivo que hizo el cambio
        sigue viva con la versión nueva; las de los demás dispositivos quedan inválidas.
        """
        if not session_id:
            return
        session = (await db.execute(
            select(UserSession).where(UserSession.id == session_id, UserSession.user_id == user_id)
        )).scalars().first()
        if session is not None and session.revoked_at is None:
            session.token_version = new_version
            await db.commit()
