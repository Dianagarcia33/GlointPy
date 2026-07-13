from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class Investor(Base):
    __tablename__ = 'investors'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    assigned_code = Column(String(50), unique=True, index=True, nullable=False)
    referred_by = Column(String(255), nullable=True) # Manual text entered by user
    
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    package_id = Column(Integer, ForeignKey('packages.id'), nullable=False)
    period_id = Column(Integer, ForeignKey('periods.id'), nullable=False)
    
    start_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    observations = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
    package = relationship("Package")
    period = relationship("Period")
    withdrawals = relationship("Withdrawal", back_populates="investor", cascade="all, delete-orphan")
