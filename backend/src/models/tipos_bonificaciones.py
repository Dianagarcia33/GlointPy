from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class TiposBonificacione(Base):
    __tablename__ = 'tipos_bonificaciones'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=True)
    tipo_calculo = Column(Enum('fijo','porcentaje'), nullable=False)
    valor_default = Column(Numeric(15,2), nullable=True)
    condiciones = Column(Text, nullable=True)
    estado = Column(Enum('activa','inactiva'), nullable=False)
    modulo_origen = Column(String(255), nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
