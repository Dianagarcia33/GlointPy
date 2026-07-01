from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class Bonificacione(Base):
    __tablename__ = 'bonificaciones'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    tipo_bonificacion_id = Column(BigInteger, nullable=False)
    investor_id = Column(BigInteger, nullable=False)
    monto = Column(Numeric(15,2), nullable=False)
    porcentaje = Column(Numeric(5,2), nullable=True)
    dias_reduccion = Column(Integer, nullable=True)
    estado = Column(Enum('pendiente','acreditado','rechazado'), nullable=False)
    modulo_origen = Column(String(255), nullable=True)
    referencia_id = Column(String(255), nullable=True)
    fecha_acreditacion = Column(Date, nullable=True)
    observaciones = Column(Text, nullable=True)
    created_by = Column(BigInteger, nullable=True)
    acreditado_by = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
