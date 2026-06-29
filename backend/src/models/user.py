from sqlalchemy import Column, BigInteger, String, DateTime, Boolean, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base

# Importar los modelos de seguridad para que SQLAlchemy encuentre a 'Role' y 'user_roles'
import src.models.security

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    email_verified_at = Column(DateTime, nullable=True)
    password = Column(String(255), nullable=False)
    
    # Flags de configuración del usuario
    must_change_password = Column(Boolean, default=False, nullable=False)
    must_update_profile = Column(Boolean, default=True, nullable=False)
    profile_updated_at = Column(DateTime, nullable=True)
    
    # Fotos y documentos
    cedula_photo_url = Column(String(250), nullable=True)
    cedula_photo_posterior_path = Column(String(250), nullable=True)
    cedula_photo_posterior_url = Column(String(250), nullable=True)
    selfie_photo_path = Column(String(255), nullable=True)
    selfie_photo_url = Column(Text, nullable=True)
    cedula_photo_path = Column(String(250), nullable=True)
    
    # Estado y seguridad
    is_active = Column(Boolean, default=True, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    firebase_uid = Column(String(255), unique=True, index=True, nullable=True)
    fcm_token = Column(String(255), nullable=True)
    
    # Permisos individuales (PBAC) que sobrescriben los del rol
    permissions_override = Column(JSON, nullable=True)
    
    # Tokens y fechas de Laravel
    remember_token = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relaciones
    roles = relationship("Role", secondary="user_roles", lazy="joined")
