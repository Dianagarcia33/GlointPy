from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String

class WeeklyCredit(Base):
    __tablename__ = 'weekly_credits'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    cliente_id = Column(BigInteger, nullable=False)
    credit_limit = Column(Numeric(15,2), nullable=False)
    used_credit = Column(Numeric(15,2), nullable=False)
    payment_streak = Column(Integer, nullable=False)
    classification = Column(String(255), nullable=False)
    status = Column(Enum('active','locked'), nullable=False)
    interest_rate = Column(Numeric(5,2), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
