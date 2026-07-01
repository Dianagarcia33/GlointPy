from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import Numeric
from sqlalchemy import String

class Accione(Base):
    __tablename__ = 'acciones'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    valor_accion_actual = Column(Numeric(15,2), nullable=False)
    total_acciones_emitidas = Column(Integer, nullable=False)
    total_acciones_asignadas = Column(Integer, nullable=False)
    total_acciones_disponibles = Column(Integer, nullable=False)
    historial_cambios = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
