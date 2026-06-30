from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import String

class WithdrawalVerificationCode(Base):
    __tablename__ = 'withdrawal_verification_codes'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    code = Column(String(255), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(String(255), nullable=True)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
