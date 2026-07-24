from sqlalchemy import Column, BigInteger, String, Text, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
import enum
from datetime import datetime
from src.core.database import Base

class PotentialReferralStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    CONTACTADO = "contactado"
    REGISTRADO = "registrado"
    RECHAZADO = "rechazado"

class PotentialReferral(Base):
    __tablename__ = "referidos_potenciales"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger, ForeignKey("investors.id", ondelete="CASCADE"), nullable=False)
    
    nombre = Column(String(255), nullable=False)
    telefono = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    codigo_referido = Column(String(255), nullable=False)
    
    estado = Column(
        SQLEnum("pendiente", "contactado", "registrado", "rechazado", name="potential_referral_status_enum"),
        nullable=False,
        default="pendiente"
    )
    notas = Column(Text, nullable=True)
    fecha_contacto = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación con Investor
    investor = relationship("Investor", backref="potential_referrals")
