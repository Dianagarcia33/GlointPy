from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import JSON
from sqlalchemy import String

class SalesParameterHistory(Base):
    __tablename__ = 'sales_parameter_history'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    changed_by = Column(BigInteger, nullable=False)
    parametros_anteriores = Column(JSON, nullable=False)
    parametros_nuevos = Column(JSON, nullable=False)
    aplica_desde_mes = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=True)
