from sqlalchemy import Column, BigInteger, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class AdminBroadcastLog(Base):
    __tablename__ = 'admin_broadcast_logs'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    sender_id = Column(BigInteger, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default='sistema', nullable=False) # 'sistema', 'anuncio', 'mantenimiento', 'alerta'
    
    target_audience = Column(String(50), default='all', nullable=False) # 'all', 'role', 'specific_users'
    target_role_name = Column(String(100), nullable=True)
    recipients_count = Column(Integer, default=0, nullable=False)
    
    link = Column(String(255), nullable=True)
    sent_push = Column(Boolean, default=True, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relaciones
    sender = relationship("User", foreign_keys=[sender_id])
