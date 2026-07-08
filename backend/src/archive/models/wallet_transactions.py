from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String

class WalletTransaction(Base):
    __tablename__ = 'wallet_transactions'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    wallet_id = Column(BigInteger, nullable=False)
    amount = Column(Numeric(15,2), nullable=False)
    type = Column(String(255), nullable=False)
    reference_type = Column(String(255), nullable=True)
    reference_id = Column(BigInteger, nullable=True)
    description = Column(String(255), nullable=True)
    balance_after = Column(Numeric(15,2), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
