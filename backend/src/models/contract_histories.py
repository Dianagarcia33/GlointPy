from src.core.database import Base
from sqlalchemy import BigInteger
from sqlalchemy import Column
from sqlalchemy import Date
from sqlalchemy import DateTime
from sqlalchemy import Integer
from sqlalchemy import Numeric
from sqlalchemy import String
from sqlalchemy import Text

class ContractHistory(Base):
    __tablename__ = 'contract_histories'
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, nullable=False)
    investor_id = Column(BigInteger, nullable=False)
    paquete_inversion_id = Column(BigInteger, nullable=True)
    contract_period_id = Column(BigInteger, nullable=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    dias_contrato = Column(Integer, nullable=True)
    total_contrato = Column(Numeric(15,2), nullable=False)
    tasa_interes = Column(String(255), nullable=False)
    acciones_otorgadas = Column(Integer, nullable=False)
    valor_total_acciones = Column(Numeric(15,2), nullable=False)
    porcentaje_participacion_accionista = Column(Numeric(8,5), nullable=False)
    rendimiento_aprobado_mensual = Column(Numeric(5,2), nullable=False)
    rentabilidad_contrato = Column(Numeric(15,2), nullable=False)
    rendimiento_total_contrato = Column(Numeric(15,2), nullable=False)
    liquidacion_diaria_capital = Column(Numeric(15,2), nullable=False)
    liquidacion_diaria_rendimiento = Column(Numeric(15,2), nullable=False)
    rendimiento_total_generado = Column(Numeric(15,2), nullable=False)
    rendimiento_total_pagado = Column(Numeric(15,2), nullable=False)
    motivo = Column(String(255), nullable=False)
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)
