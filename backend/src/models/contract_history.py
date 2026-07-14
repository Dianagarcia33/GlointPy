from datetime import datetime, date
from sqlalchemy import BigInteger, Integer, Numeric, String, Text, Date, ForeignKey, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

class ContractHistory(Base):
    __tablename__ = "contract_histories"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    investor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("investors.id", ondelete="CASCADE"))
    paquete_inversion_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("packages.id", ondelete="SET NULL"), nullable=True)
    contract_period_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("periods.id", ondelete="SET NULL"), nullable=True)
    
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_fin: Mapped[date] = mapped_column(Date, nullable=False)
    dias_contrato: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_contrato: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    tasa_interes: Mapped[str] = mapped_column(String(255), nullable=False)
    acciones_otorgadas: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valor_total_acciones: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    porcentaje_participacion_accionista: Mapped[float] = mapped_column(Numeric(8, 5), default=0.00000, nullable=False)
    rendimiento_aprobado_mensual: Mapped[float] = mapped_column(Numeric(5, 2), default=0.00, nullable=False)
    rentabilidad_contrato: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    rendimiento_total_contrato: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    liquidacion_diaria_capital: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    liquidacion_diaria_rendimiento: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    rendimiento_total_generado: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    rendimiento_total_pagado: Mapped[float] = mapped_column(Numeric(15, 2), default=0.00, nullable=False)
    motivo: Mapped[str] = mapped_column(String(255), nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, default=datetime.utcnow, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relaciones
    investor = relationship("Investor", backref="contract_histories")
    package = relationship("Package", backref="contract_histories")
    period = relationship("Period", backref="contract_histories")
