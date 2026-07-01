from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class CreditIncreaseRequest(Base):
    __tablename__ = 'credit_increase_requests'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    weekly_credit_id = Column(BigInteger, nullable=False)
    requested_amount = Column(Numeric(15,2), nullable=False)
    status = Column(Enum('pending','approved','rejected'), nullable=False)
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(BigInteger, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
