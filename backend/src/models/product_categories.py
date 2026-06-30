from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text

class ProductCategory(Base):
    __tablename__ = 'product_categories'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String(255), nullable=False)
    is_active = Column(Integer, nullable=False)
    parent_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    image_url = Column(String(500), nullable=True)
