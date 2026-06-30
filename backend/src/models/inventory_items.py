from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import String

class InventoryItem(Base):
    __tablename__ = 'inventory_items'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    public_id = Column(String(255), nullable=False)
    inventory_lot_id = Column(BigInteger, nullable=False)
    product_id = Column(BigInteger, nullable=False)
    client_id = Column(BigInteger, nullable=True)
    status = Column(Enum('in_stock','reserved','sold','shipped','returned','damaged','lost'), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
