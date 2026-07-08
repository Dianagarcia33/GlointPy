from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String

class SalesFloor(Base):
    __tablename__ = 'sales_floors'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    monto_minimo = Column(Numeric(15,2), nullable=False)
    bono_nominal = Column(Numeric(15,2), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
