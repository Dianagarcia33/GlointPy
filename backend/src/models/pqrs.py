from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import String
from sqlalchemy import Text

class Pqr(Base):
    __tablename__ = 'pqrs'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    tipo = Column(Enum('peticion','queja','reclamo','sugerencia'), nullable=False)
    asunto = Column(String(255), nullable=False)
    mensaje = Column(Text, nullable=False)
    adjunto_url = Column(String(255), nullable=False)
    estado = Column(Enum('pendiente','en_revision','resuelto','cerrado'), nullable=False)
    respuesta = Column(Text, nullable=True)
    fecha_respuesta = Column(DateTime, nullable=True)
    respondido_por = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
