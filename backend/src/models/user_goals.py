from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

class UserGoal(Base):
    __tablename__ = 'user_goals'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum('inversionistas','paquetes'), nullable=False)
    target_value = Column(Integer, nullable=False)
    current_value = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    status = Column(Enum('active','completed','expired'), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
