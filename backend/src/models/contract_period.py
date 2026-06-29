from sqlalchemy import Column, BigInteger, String, Integer, Double, DateTime
from sqlalchemy.sql import func
from src.core.database import Base

class ContractPeriod(Base):
    __tablename__ = "contract_periods"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(255), nullable=False)
    months = Column(Integer, nullable=False)
    days = Column(Integer, nullable=False)
    percentage = Column(Double, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)
