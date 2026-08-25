from sqlalchemy import Column, BigInteger, String, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from src.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    user_name = Column(String(255), nullable=True)
    user_email = Column(String(255), nullable=True, index=True)
    
    action = Column(String(100), nullable=False, index=True)      # e.g. 'AUTH_LOGIN', 'WITHDRAWAL_APPROVE', 'USER_UPDATE'
    module = Column(String(50), nullable=False, index=True)       # e.g. 'auth', 'withdrawals', 'investments', 'users', 'commercial', 'audit'
    
    entity_type = Column(String(100), nullable=True)              # e.g. 'Withdrawal', 'User', 'InvestmentRequest'
    entity_id = Column(String(100), nullable=True, index=True)   # ID of target entity
    
    description = Column(String(500), nullable=True)              # Human readable summary
    details = Column(JSON, nullable=True)                         # Before/After diff, amount, reason, etc.
    
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(300), nullable=True)
    status = Column(String(20), nullable=False, default="SUCCESS") # 'SUCCESS', 'FAILED', 'WARNING'
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
