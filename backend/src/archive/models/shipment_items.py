from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String

class ShipmentItem(Base):
    __tablename__ = 'shipment_items'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    shipment_id = Column(BigInteger, nullable=False)
    inventory_lot_id = Column(BigInteger, nullable=False)
    product_id = Column(BigInteger, nullable=False)
    quantity = Column(Integer, nullable=False)
    condition = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
