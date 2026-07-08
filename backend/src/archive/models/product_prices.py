from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String

class ProductPrice(Base):
    __tablename__ = 'product_prices'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    product_id = Column(BigInteger, nullable=False)
    campaign_name = Column(String(255), nullable=True)
    min_quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12,2), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
