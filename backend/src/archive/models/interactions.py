from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String
from sqlalchemy import Text

class Interaction(Base):
    __tablename__ = 'interactions'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    interactable_type = Column(String(255), nullable=False)
    interactable_id = Column(BigInteger, nullable=False)
    tipo = Column(Enum('llamada','correo','reunion','nota','whatsapp','otro'), nullable=False)
    titulo = Column(String(255), nullable=True)
    descripcion = Column(Text, nullable=True)
    fecha_interaccion = Column(DateTime, nullable=True)
    duracion_minutos = Column(Integer, nullable=True)
    resultado = Column(Enum('exitoso','sin_respuesta','pendiente_seguimiento','no_interesado','otro'), nullable=True)
    proximo_seguimiento = Column(DateTime, nullable=True)
    seguimiento_notificado = Column(Integer, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
