from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class Product(Base):
    __tablename__ = 'products'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    category_id = Column(BigInteger, nullable=False)
    name = Column(String(255), nullable=False)
    sku = Column(String(255), nullable=False)
    qr_code = Column(Text, nullable=True)
    brand = Column(String(255), nullable=False)
    subcategory = Column(String(255), nullable=True)
    weight = Column(Numeric(10,2), nullable=True)
    dimensions = Column(String(255), nullable=True)
    width = Column(Numeric(10,2), nullable=True)
    height = Column(Numeric(10,2), nullable=True)
    length = Column(Numeric(10,2), nullable=True)
    package_unit = Column(Enum('individual','box','master'), nullable=False)
    price_gloint = Column(Numeric(10,2), nullable=True)
    cost = Column(Numeric(10,2), nullable=True)
    images = Column(Text, nullable=True)
    video_url = Column(String(255), nullable=True)
    is_public_ecommerce = Column(Integer, nullable=False)
    is_visible_to_clients = Column(Integer, nullable=False)
    is_campaign_only = Column(Integer, nullable=False)
    is_featured = Column(Integer, nullable=False)
    is_active = Column(Integer, nullable=False)
    min_stock_alert = Column(Integer, nullable=False)
    requires_insurance = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
