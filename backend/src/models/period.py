from sqlalchemy import Column, Integer, Float, Boolean, DateTime
from sqlalchemy.sql import func
from src.core.database import Base

class Period(Base):
    __tablename__ = "periods"

    id = Column(Integer, primary_key=True, index=True)
    percentage = Column(Float, nullable=False)
    months = Column(Integer, nullable=False)
    days = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
