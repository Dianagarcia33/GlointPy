from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class HistorialAccione(Base):
    __tablename__ = 'historial_acciones'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    tipo_cambio = Column(Enum('precio','emision','asignacion'), nullable=False)
    descripcion = Column(String(255), nullable=False)
    valor_anterior = Column(Numeric(15,2), nullable=True)
    valor_nuevo = Column(Numeric(15,2), nullable=True)
    cantidad_anterior = Column(Integer, nullable=True)
    cantidad_nueva = Column(Integer, nullable=True)
    razon = Column(Text, nullable=True)
    usuario_id = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
