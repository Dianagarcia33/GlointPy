from sqlalchemy import Column, BigInteger, Integer, String, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from src.core.database import Base

class CommissionSettlement(Base):
    __tablename__ = "commission_settlements"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    commercial_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    settled_by_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    total_amount = Column(Numeric(15, 2), nullable=False)
    sales_count = Column(Integer, default=0, nullable=False)

    reference_code = Column(String(100), nullable=True) # Número de comprobante / transferencia
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    commercial = relationship("User", foreign_keys=[commercial_id])
    settled_by = relationship("User", foreign_keys=[settled_by_id])
    sales = relationship("CommercialSale", back_populates="settlement")
