from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import DateTime
from sqlalchemy import Numeric
from sqlalchemy import String

class SalesParameter(Base):
    __tablename__ = 'sales_parameters'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    piso_comision_porcentaje_base = Column(Numeric(5,2), nullable=False)
    piso_comision_porcentaje_alto = Column(Numeric(5,2), nullable=False)
    umbral_piso_cambio_comision = Column(Numeric(15,2), nullable=False)
    comision_referido_porcentaje = Column(Numeric(5,2), nullable=False)
    bono_diario_meta_mixta_porcentaje = Column(Numeric(5,2), nullable=False)
    bono_diario_meta_exclusiva_porcentaje = Column(Numeric(5,2), nullable=False)
    bono_bienestar_trimestral_base = Column(Numeric(15,2), nullable=False)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
