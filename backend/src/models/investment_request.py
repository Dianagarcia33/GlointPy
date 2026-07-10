from sqlalchemy import Column, Integer, BigInteger, String, Numeric, Enum, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from src.core.database import Base

class InvestmentRequestStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class InvestmentRequest(Base):
    __tablename__ = "investment_requests"

    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    investor_id = Column(BigInteger, ForeignKey("investors.id", ondelete="SET NULL"), nullable=True)
    
    # En el backup hace referencia a 'paquetes_inversion', pero en el código parece ser 'packages'
    paquete_inversion_id = Column(Integer, ForeignKey("packages.id"), nullable=False)
    
    prospecto_id = Column(BigInteger, nullable=True) # Sin ForeignKey a 'leads' temporalmente si no existe el modelo
    
    monto = Column(Numeric(15, 2), nullable=False)
    comprobante_path = Column(String(255), nullable=True)
    
    status = Column(Enum(InvestmentRequestStatus), nullable=False, default=InvestmentRequestStatus.pending)
    rejection_reason = Column(Text, nullable=True)
    
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    extra_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relaciones
    user = relationship("User", foreign_keys=[user_id])
    investor = relationship("Investor")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    package = relationship("Package")
