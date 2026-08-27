from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class InvestmentRank(Base):
    __tablename__ = "investment_ranks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True, index=True)
    min_investment = Column(Numeric(15, 2), default=0.00, nullable=False)
    max_investment = Column(Numeric(15, 2), nullable=True)
    bonus_percentage = Column(Numeric(5, 2), default=0.00, nullable=False)
    color = Column(String(50), default="#EAB308", nullable=False)
    icon = Column(String(50), default="trophy", nullable=False)
    priority_withdrawal = Column(Boolean, default=False, nullable=False)
    benefits = Column(JSON, nullable=True, default=[])
    order = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    users = relationship("User", back_populates="rank")
