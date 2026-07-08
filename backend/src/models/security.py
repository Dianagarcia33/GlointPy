from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

# Tablas Pivote (Muchos a Muchos)
user_roles = Table(
    'user_roles',
    Base.metadata,
    Column('user_id', BigInteger, ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    Column('role_id', BigInteger, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True)
)

role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', BigInteger, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', BigInteger, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True)
)


class Permission(Base):
    __tablename__ = 'permissions'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False) # ej. "users:read", "wallets:write"
    description = Column(String(255), nullable=True)
    module = Column(String(100), nullable=True) # ej. "users", "investments"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relación inversa (no estrictamente necesaria, pero útil)
    roles = relationship('Role', secondary=role_permissions, back_populates='permissions')


class Role(Base):
    __tablename__ = 'roles'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False) # ej. "SuperAdmin", "Investor"
    display_name = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    is_system_role = Column(String(5), default="0") # "1" si es rol del sistema (no borrable)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    permissions = relationship('Permission', secondary=role_permissions, back_populates='roles')
    users = relationship('User', secondary=user_roles, back_populates='roles')
