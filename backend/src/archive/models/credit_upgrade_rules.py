from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String

class CreditUpgradeRule(Base):
    __tablename__ = 'credit_upgrade_rules'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    current_limit = Column(Numeric(15,2), nullable=False)
    required_streak = Column(Integer, nullable=False)
    new_limit = Column(Numeric(15,2), nullable=False)
    new_classification = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
