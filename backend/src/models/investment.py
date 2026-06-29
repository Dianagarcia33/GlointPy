from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Numeric, Enum, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from src.core.database import Base

class InvestmentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class PaqueteInversion(Base):
    __tablename__ = "paquetes_inversion"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    paquete_accion_adquirido = Column(String(255), nullable=False)
    acciones_otorgadas = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class InvestmentRequest(Base):
    __tablename__ = "investment_requests"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    investor_id = Column(BigInteger, ForeignKey("investors.id", ondelete="SET NULL"), nullable=True)
    paquete_inversion_id = Column(BigInteger, ForeignKey("paquetes_inversion.id"), nullable=False)
    
    monto = Column(Numeric(15, 2), nullable=False)
    comprobante_path = Column(String(255), nullable=True)
    status = Column(Enum(InvestmentStatus), default=InvestmentStatus.pending, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime, nullable=True)

    # Relaciones
    user = relationship("User", foreign_keys=[user_id], backref="investments")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    paquete = relationship("PaqueteInversion", backref="requests")
    # investor = relationship("Investor") # Lo dejaremos comentado hasta que necesitemos el modelo Investor complejo
