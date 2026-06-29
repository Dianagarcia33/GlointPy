from sqlalchemy import Column, BigInteger, String, Numeric, Enum, DateTime, ForeignKey
from sqlalchemy.sql import func
from src.core.database import Base
from sqlalchemy.orm import relationship

class Wallet(Base):
    __tablename__ = "wallets"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    balance = Column(Numeric(15, 2), default=0.00, nullable=False)
    currency = Column(String(3), default="COP", nullable=False)
    status = Column(Enum('active', 'frozen'), default='active', nullable=False)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relación opcional con el User (si queremos navegar wallet.user)
    user = relationship("User", backref="wallets", lazy="select")
