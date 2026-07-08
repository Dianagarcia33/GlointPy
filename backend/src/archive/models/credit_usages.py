from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Numeric
from sqlalchemy import String

class CreditUsage(Base):
    __tablename__ = 'credit_usages'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    weekly_credit_id = Column(BigInteger, nullable=False)
    concept = Column(String(255), nullable=True)
    amount = Column(Numeric(15,2), nullable=False)
    due_date = Column(Date, nullable=False)
    paid_at = Column(DateTime, nullable=True)
    status = Column(Enum('requested','active','pending','paid','overdue','cancelled','pending_verification'), nullable=False)
    payment_proof = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
