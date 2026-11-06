from datetime import datetime

from sqlalchemy import Column, BigInteger, Integer, String, DateTime, ForeignKey

from src.core.database import Base


class UserSession(Base):
    """
    Sesión de un dispositivo (app móvil) con token de refresco.

    El token de refresco es opaco ("<id>.<secreto>"): aquí solo se guarda el hash SHA-256 del secreto vigente y
    el del anterior (para tolerar un reintento de red tras la rotación). Una sesión deja de valer si se revoca,
    vence (inactividad o límite absoluto) o si el usuario cambió su versión de sesión (users.token_version).
    """
    __tablename__ = "user_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    token_hash = Column(String(64), nullable=False)
    prev_token_hash = Column(String(64), nullable=True)
    rotated_at = Column(DateTime, nullable=True)
    token_version = Column(Integer, nullable=False, default=0)

    device_id = Column(String(100), nullable=False, index=True)
    device_name = Column(String(150), nullable=True)
    platform = Column(String(20), nullable=True)
    app_version = Column(String(30), nullable=True)
    ip_address = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_used_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(40), nullable=True)
