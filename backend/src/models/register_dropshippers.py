from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import String

class RegisterDropshipper(Base):
    __tablename__ = 'register_dropshippers'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    telefono = Column(String(255), nullable=False)
    correo = Column(String(255), nullable=False)
    plataforma_principal = Column(String(255), nullable=False)
    plataforma_detalle = Column(String(255), nullable=True)
    envios_mensuales = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
