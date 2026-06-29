from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Table, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base

# Tabla Pivote: user_roles (la única que realmente existe para roles)
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    extend_existing=True
)

class Role(Base):
    """Modelo para la tabla roles existente en la base de datos."""
    __tablename__ = "roles"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), unique=True, nullable=False) # ej: "admin"
    display_name = Column(String(255), nullable=False) # ej: "Admin"
    description = Column(Text, nullable=True)
    
    # En esta base de datos, los permisos no son una relación con otra tabla,
    # sino un array JSON almacenado directamente en la tabla de roles.
    permissions = Column(JSON, nullable=False)
    
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
