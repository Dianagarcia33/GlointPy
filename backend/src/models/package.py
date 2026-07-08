from sqlalchemy import Column, Integer, Boolean, DateTime
from sqlalchemy.sql import func

from src.core.database import Base

class Package(Base):
    __tablename__ = "packages"

    id = Column(Integer, primary_key=True, index=True)
    value = Column(Integer, nullable=False, index=True)
    granted_shares = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
