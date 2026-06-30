from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String
from sqlalchemy import Text

class Notification(Base):
    __tablename__ = 'notifications'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    type = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSON, nullable=True)
    read = Column(Integer, nullable=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
