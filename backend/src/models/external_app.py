from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, Enum, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base
import enum

class ExternalPaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    FAILED = "failed"

class ExternalApp(Base):
    __tablename__ = "external_apps"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    client_id = Column(String(100), unique=True, index=True, nullable=False)
    api_key_hash = Column(String(255), nullable=False)
    webhook_url = Column(String(500), nullable=True)
    webhook_secret = Column(String(255), nullable=True)
    redirect_urls = Column(Text, nullable=True)  # Comma or newline separated allowed callback URLs
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    orders = relationship("ExternalPaymentOrder", back_populates="app", cascade="all, delete-orphan")


class ExternalPaymentOrder(Base):
    __tablename__ = "external_payment_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    payment_token = Column(String(120), unique=True, index=True, nullable=False)
    app_id = Column(BigInteger, ForeignKey("external_apps.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    order_reference = Column(String(255), nullable=False)  # Ref from external system
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="COP", nullable=False)
    description = Column(String(500), nullable=True)
    
    status = Column(Enum(ExternalPaymentStatus, values_callable=lambda obj: [e.value for e in obj]), default=ExternalPaymentStatus.PENDING, nullable=False)
    
    redirect_url = Column(String(500), nullable=True)
    metadata_json = Column(Text, nullable=True)
    
    webhook_status = Column(String(50), default="pending", nullable=False)  # pending, sent, failed
    webhook_attempts = Column(BigInteger, default=0, nullable=False)
    webhook_response = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    app = relationship("ExternalApp", back_populates="orders")
    user = relationship("User", foreign_keys=[user_id])
