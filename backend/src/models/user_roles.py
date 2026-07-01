from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import String

class UserRole(Base):
    __tablename__ = 'user_roles'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    role_id = Column(BigInteger, nullable=False)
    assigned_at = Column(DateTime, nullable=False)
    assigned_by = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
