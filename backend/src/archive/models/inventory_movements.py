from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

class InventoryMovement(Base):
    __tablename__ = 'inventory_movements'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    inventory_lot_id = Column(BigInteger, nullable=False)
    shipment_id = Column(BigInteger, nullable=True)
    type = Column(Enum('in','out','rebalance_in','rebalance_out','transfer_gp','shipped','returned','warranty','assignment'), nullable=False)
    quantity = Column(Integer, nullable=False)
    previous_qty = Column(Integer, nullable=False)
    new_qty = Column(Integer, nullable=False)
    details = Column(Text, nullable=True)
    reason_code = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    user_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
