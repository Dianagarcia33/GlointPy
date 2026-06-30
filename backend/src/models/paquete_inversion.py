from sqlalchemy import Column, BigInteger, String, DateTime
from sqlalchemy.sql import func
from src.core.database import Base

class PaqueteInversion(Base):
    __tablename__ = "paquetes_inversion"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    paquete_accion_adquirido = Column(String(255), nullable=False)
    acciones_otorgadas = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
