from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class YointDispersion(Base):
    __tablename__ = "yoint_dispersions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    withdrawal_id = Column(BigInteger, ForeignKey("withdrawals.id", ondelete="CASCADE"), nullable=True, index=True)
    credit_id = Column(BigInteger, ForeignKey("credits.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Yoint Reference Identifiers
    order_id = Column(String(100), nullable=True, index=True)
    idempotency_key = Column(String(100), nullable=True, unique=True, index=True)
    payment_reference = Column(String(100), nullable=True, index=True)
    
    # Status: PENDING, PROCESSING, APPROVED, REJECTED, FAILED, QUEUED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    
    # Financial breakdown
    amount = Column(Numeric(15, 2), nullable=False) # monto neto enviado al banco del cliente
    tax_amount = Column(Numeric(15, 2), default=0.00, nullable=False) # 3.2% retenido para Gloint
    
    # Recipient and Bank Snapshot at dispersion time
    financial_entity_id = Column(String(50), nullable=True) # Codigo oficial ACH (ej. 1007)
    financial_entity_name = Column(String(255), nullable=True) # BANCOLOMBIA
    account_number = Column(String(100), nullable=True)
    account_type = Column(String(50), nullable=True) # SAVINGS, CHECKING, etc.
    recipient_name = Column(String(255), nullable=True)
    recipient_document = Column(String(100), nullable=True)
    recipient_email = Column(String(255), nullable=True)
    recipient_phone = Column(String(50), nullable=True)
    
    # Forensic Audit Payloads
    request_payload = Column(JSON, nullable=True)
    response_payload = Column(JSON, nullable=True)
    webhook_payload = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    withdrawal = relationship("Withdrawal", back_populates="yoint_dispersions")
    credit = relationship("Credit", back_populates="yoint_dispersions")
