from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base

# Tabla Pivote: user_roles (ya existe en tu BD)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    extend_existing=True
)

# Tabla Pivote [NUEVA]: role_permissions
# Esta tabla soluciona el problema de permisos sueltos.
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
    extend_existing=True
)

class Permission(Base):
    """Modelo para la tabla permissions existente."""
    __tablename__ = "permissions"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), unique=True, nullable=False) # ej: "view_wallets"
    # Campos comunes de Laravel
    guard_name = Column(String(255), default="web")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Role(Base):
    """Modelo para la tabla roles existente."""
    __tablename__ = "roles"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), unique=True, nullable=False) # ej: "Cliente", "Admin"
    guard_name = Column(String(255), default="web")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relación muchos a muchos con Permission
    permissions = relationship("Permission", secondary=role_permissions)
