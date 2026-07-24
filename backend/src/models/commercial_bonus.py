from sqlalchemy import Column, BigInteger, Integer, String, Numeric, DateTime, Date, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from src.core.database import Base

class CommercialBonusType(str, enum.Enum):
    meta_diaria = "meta_diaria"
    piso_cumplido = "piso_cumplido"
    bienestar_trimestral = "bienestar_trimestral"

class CommercialBonusStatus(str, enum.Enum):
    pendiente = "pendiente"
    liquidado = "liquidado"

class CommercialBonus(Base):
    __tablename__ = "commercial_bonuses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    commercial_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    bonus_type = Column(Enum(CommercialBonusType), nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    status = Column(Enum(CommercialBonusStatus), default=CommercialBonusStatus.pendiente, nullable=False)
    settlement_id = Column(BigInteger, ForeignKey("commission_settlements.id", ondelete="SET NULL"), nullable=True)

    details = Column(Text, nullable=True)
    earned_date = Column(Date, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    commercial = relationship("User", foreign_keys=[commercial_id])
    settlement = relationship("CommissionSettlement", back_populates="bonuses")
