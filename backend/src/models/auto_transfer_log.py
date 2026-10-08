from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class AutoTransferLog(Base):
    __tablename__ = 'auto_transfer_logs'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    batch_id = Column(String(255), nullable=False, index=True)
    investor_id = Column(BigInteger, ForeignKey('investors.id', ondelete='SET NULL'), nullable=True, index=True)
    user_id = Column(BigInteger, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    type = Column(String(255), nullable=True)
    amount = Column(Numeric(15, 2), nullable=True)
    status = Column(String(255), nullable=False, default="COMPLETED")
    message = Column(Text, nullable=True)
    # Using 'metadata_json' as attribute name to avoid conflict with Base.metadata
    metadata_json = Column("metadata", Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    investor = relationship("Investor", foreign_keys=[investor_id])
