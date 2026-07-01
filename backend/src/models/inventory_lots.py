from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class InventoryLot(Base):
    __tablename__ = 'inventory_lots'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    client_id = Column(BigInteger, nullable=True)
    product_id = Column(BigInteger, nullable=False)
    lot_number = Column(String(255), nullable=False)
    initial_quantity = Column(Integer, nullable=False)
    current_quantity = Column(Integer, nullable=False)
    quantity_gloint_place = Column(Integer, nullable=False)
    entry_date = Column(Date, nullable=False)
    cost_per_unit = Column(Numeric(12,2), nullable=False)
    purchase_reference = Column(String(255), nullable=True)
    status = Column(Enum('active','depleted','rebalanced','expired'), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
