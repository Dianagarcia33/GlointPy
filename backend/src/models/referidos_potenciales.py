from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import String
from sqlalchemy import Text

class ReferidosPotenciale(Base):
    __tablename__ = 'referidos_potenciales'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    investor_id = Column(BigInteger, nullable=False)
    nombre = Column(String(255), nullable=False)
    telefono = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    codigo_referido = Column(String(255), nullable=False)
    estado = Column(Enum('pendiente','contactado','registrado','rechazado'), nullable=False)
    notas = Column(Text, nullable=True)
    fecha_contacto = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
