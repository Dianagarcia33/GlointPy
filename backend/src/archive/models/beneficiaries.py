from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String

class Beneficiary(Base):
    __tablename__ = 'beneficiaries'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=True)
    investor_id = Column(BigInteger, nullable=True)
    name = Column(String(255), nullable=False)
    document_number = Column(String(255), nullable=True)
    relationship = Column(String(255), nullable=True)
    percentage = Column(Numeric(5,2), nullable=False)
    phone = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
