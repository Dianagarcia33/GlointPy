from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import JSON
from sqlalchemy import String

class ClientePlataforma(Base):
    __tablename__ = 'cliente_plataforma'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    cliente_id = Column(BigInteger, nullable=False)
    plataforma_id = Column(BigInteger, nullable=False)
    activa = Column(Integer, nullable=False)
    numero_cuenta = Column(String(255), nullable=True)
    tipo_cuenta = Column(String(255), nullable=True)
    configuracion_adicional = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
