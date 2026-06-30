from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class MarketTransaction(Base):
    __tablename__ = 'market_transactions'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    type = Column(Enum('buy','sell'), nullable=False)
    quantity = Column(Numeric(18,6), nullable=False)
    price_per_share = Column(Numeric(18,2), nullable=False)
    total_amount = Column(Numeric(18,2), nullable=False)
    status = Column(String(255), nullable=False)
    metadata = Column(Text, nullable=True)
    evidence_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
