from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import JSON
from sqlalchemy import String

class ActivityLog(Base):
    __tablename__ = 'activity_logs'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=True)
    action = Column(String(255), nullable=False)
    module = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    subject_type = Column(String(255), nullable=True)
    subject_id = Column(BigInteger, nullable=True)
    properties = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    url = Column(String(255), nullable=True)
    method = Column(String(10), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
