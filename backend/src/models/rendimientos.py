from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String

class Rendimiento(Base):
    __tablename__ = 'rendimientos'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    monto_invertido = Column(Numeric(15,2), nullable=False)
    rendimiento_aprobado_mensual = Column(Numeric(5,2), nullable=False)
    rendimiento_mensual = Column(Numeric(15,2), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
