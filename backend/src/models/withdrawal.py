from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, Date, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base
import enum

class WithdrawalStatus(str, enum.Enum):
    PENDING = "pendiente"
    APPROVED = "aprobado"
    PROCESSED = "procesado"
    REJECTED = "rechazado"
    CANCELLED = "cancelado"

class WithdrawalType(str, enum.Enum):
    RENDIMIENTO = "rendimiento"
    CAPITAL = "capital"
    BONO = "bono"

class Withdrawal(Base):
    __tablename__ = "withdrawals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger, ForeignKey("investors.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    origen = Column(String(255), default="inversion", nullable=False)
    tipo = Column(Enum(WithdrawalType, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    
    monto = Column(Numeric(15, 2), nullable=False)
    impuesto = Column(Numeric(15, 2), nullable=False, default=0.00)
    monto_neto = Column(Numeric(15, 2), nullable=False)
    
    fecha_solicitud = Column(Date, nullable=False)
    fecha_retiro = Column(Date, nullable=True)
    
    estado = Column(Enum(WithdrawalStatus, values_callable=lambda obj: [e.value for e in obj]), default=WithdrawalStatus.PENDING, nullable=False)
    
    # Financial destination details (raw strings as per old database)
    metodo_pago = Column(String(255), nullable=True)
    banco = Column(String(255), nullable=True)
    tipo_cuenta = Column(String(255), nullable=True)
    numero_cuenta = Column(String(255), nullable=True)
    
    observaciones = Column(Text, nullable=True)
    motivo_rechazo = Column(Text, nullable=True)
    
    # Audit and Processing
    aprobado_por = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    fecha_aprobacion = Column(DateTime, nullable=True)
    procesado_por = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    fecha_procesamiento = Column(DateTime, nullable=True)
    
    comprobante_pago = Column(String(255), nullable=True)
    receipt_path = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="withdrawals")
    investor = relationship("Investor", back_populates="withdrawals")
    approver = relationship("User", foreign_keys=[aprobado_por])
    processor = relationship("User", foreign_keys=[procesado_por])
