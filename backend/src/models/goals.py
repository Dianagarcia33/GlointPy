from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String

class Goal(Base):
    __tablename__ = 'goals'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    inversionistas_base = Column(Integer, nullable=False)
    porcentaje_crecimiento_anual = Column(Numeric(5,2), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
