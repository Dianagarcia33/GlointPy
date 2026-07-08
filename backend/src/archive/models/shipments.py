from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

class Shipment(Base):
    __tablename__ = 'shipments'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    client_id = Column(BigInteger, nullable=False)
    type = Column(Enum('outbound','return','warranty_replacement'), nullable=False)
    is_cross_docking = Column(Integer, nullable=False)
    external_platform_name = Column(String(255), nullable=True)
    external_reference = Column(String(255), nullable=True)
    status = Column(Enum('pending','shipped','delivered','cancelled','returned'), nullable=False)
    proof_of_delivery_url = Column(Text, nullable=True)
    tracking_number = Column(String(255), nullable=True)
    guide_number = Column(String(255), nullable=True)
    carrier_name = Column(String(255), nullable=True)
    carrier_service_level = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    cross_docking_lot_id = Column(BigInteger, nullable=True)
