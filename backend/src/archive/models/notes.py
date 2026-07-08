from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String
from sqlalchemy import Text

class Note(Base):
    __tablename__ = 'notes'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    notable_type = Column(String(255), nullable=False)
    notable_id = Column(BigInteger, nullable=False)
    titulo = Column(String(255), nullable=True)
    contenido = Column(Text, nullable=False)
    user_id = Column(BigInteger, nullable=False)
    tipo = Column(Enum('general','importante','recordatorio','alerta'), nullable=False)
    es_privada = Column(Integer, nullable=False)
    adjuntos = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
