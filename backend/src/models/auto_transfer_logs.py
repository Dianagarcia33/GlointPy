from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class AutoTransferLog(Base):
    __tablename__ = 'auto_transfer_logs'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    batch_id = Column(String(255), nullable=False)
    investor_id = Column(BigInteger, nullable=True)
    user_id = Column(BigInteger, nullable=True)
    type = Column(String(255), nullable=True)
    amount = Column(Numeric(15,2), nullable=True)
    status = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
