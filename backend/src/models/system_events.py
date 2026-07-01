from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String

class SystemEvent(Base):
    __tablename__ = 'system_events'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    type = Column(String(255), nullable=False)
    is_recurring = Column(Integer, nullable=False)
    recurrence_start_day = Column(Integer, nullable=True)
    recurrence_end_day = Column(Integer, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    description = Column(String(255), nullable=True)
    is_active = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
