from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class WalletRecharge(Base):
    __tablename__ = "wallet_recharges"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, approved, rejected, cancelled
    payment_method = Column(String(100), default="Transferencia Bancaria", nullable=False)
    reference_number = Column(String(100), nullable=True)
    receipt_url = Column(String(500), nullable=False)
    user_notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    wallet = relationship("Wallet", back_populates="recharges")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
