from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Numeric
from sqlalchemy import String

class MarketOffer(Base):
    __tablename__ = 'market_offers'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    quantity = Column(Numeric(20,6), nullable=False)
    price_per_share = Column(Numeric(20,2), nullable=False)
    total_amount = Column(Numeric(20,2), nullable=False)
    status = Column(Enum('active','completed','cancelled','expired','reserved'), nullable=True)
    reserved_by = Column(BigInteger, nullable=True)
    reserved_until = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
