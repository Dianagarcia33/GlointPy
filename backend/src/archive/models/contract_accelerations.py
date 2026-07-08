from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String

class ContractAcceleration(Base):
    __tablename__ = 'contract_accelerations'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    investor_id = Column(BigInteger, nullable=False)
    investment_request_id = Column(BigInteger, nullable=False)
    contract_period_id = Column(BigInteger, nullable=True)
    original_days = Column(Integer, nullable=False)
    acceleration_percentage = Column(Numeric(5,2), nullable=False)
    days_to_reduce = Column(Numeric(20,6), nullable=False)
    capital_released = Column(Numeric(15,2), nullable=True)
    new_duration = Column(Numeric(20,6), nullable=False)
    applied = Column(Integer, nullable=False)
    bonus_amount = Column(Numeric(20,6), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
