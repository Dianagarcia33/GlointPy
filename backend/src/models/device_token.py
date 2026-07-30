from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class UserDeviceToken(Base):
    __tablename__ = 'user_device_tokens'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token = Column(String(500), nullable=False, unique=True, index=True)
    device_type = Column(String(50), default='web', nullable=False) # 'web', 'android', 'ios'
    is_active = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación
    user = relationship("User", backref="device_tokens")
