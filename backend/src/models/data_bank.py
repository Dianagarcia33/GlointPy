from sqlalchemy import Column, BigInteger, String, DateTime
from datetime import datetime
from src.core.database import Base

class DataBank(Base):
    __tablename__ = "data_bancks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    banck = Column(String(255), nullable=False)
    code_banck = Column(String(50), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
