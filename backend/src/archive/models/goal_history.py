from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String

class GoalHistory(Base):
    __tablename__ = 'goal_history'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    goal_id = Column(BigInteger, nullable=False)
    inversionistas_base = Column(Integer, nullable=False)
    inversionistas_meta = Column(Integer, nullable=False)
    inversionistas_alcanzados = Column(Integer, nullable=False)
    porcentaje_crecimiento = Column(Numeric(5,2), nullable=False)
    fecha_inicio = Column(Date, nullable=False)
    fecha_cumplida = Column(Date, nullable=False)
    dias_para_cumplir = Column(Integer, nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
