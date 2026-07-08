from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import String
from sqlalchemy import Text

class Lead(Base):
    __tablename__ = 'leads'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    nombre = Column(String(255), nullable=False)
    apellido = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    telefono = Column(String(255), nullable=True)
    fuente_referencia = Column(String(255), nullable=True)
    notas_iniciales = Column(Text, nullable=True)
    etiqueta_id = Column(BigInteger, nullable=True)
    created_by = Column(BigInteger, nullable=False)
    assigned_to = Column(BigInteger, nullable=True)
    converted_to_investor_id = Column(BigInteger, nullable=True)
    converted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
