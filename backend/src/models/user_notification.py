from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class UserNotification(Base):
    __tablename__ = 'user_notifications'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    type = Column(String(50), default='sistema', nullable=False) # 'rendimiento', 'retiro', 'deposito', 'sistema'
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    link = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relación
    user = relationship("User", backref="notifications")
