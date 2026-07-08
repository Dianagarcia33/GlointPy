from sqlalchemy import Column, BigInteger, String, Integer, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base
from src.models.security import user_roles

class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Campo JSON para dar permisos granulares a un usuario específico
    # sin necesidad de crear un rol. Ej: {"wallets:delete": true, "users:create": false}
    permissions_override = Column(JSON, nullable=True, default={})
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación a la tabla roles usando la tabla pivote user_roles
    roles = relationship('Role', secondary=user_roles, back_populates='users')
