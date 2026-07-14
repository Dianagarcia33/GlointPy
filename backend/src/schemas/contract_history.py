from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import Optional

class ContractHistoryBase(BaseModel):
    investor_id: int
    paquete_inversion_id: Optional[int] = None
    contract_period_id: Optional[int] = None
    fecha_inicio: date
    fecha_fin: date
    dias_contrato: Optional[int] = None
    total_contrato: float
    tasa_interes: str
    acciones_otorgadas: int = 0
    valor_total_acciones: float = 0.00
    porcentaje_participacion_accionista: float = 0.00000
    rendimiento_aprobado_mensual: float = 0.00
    rentabilidad_contrato: float = 0.00
    rendimiento_total_contrato: float = 0.00
    liquidacion_diaria_capital: float = 0.00
    liquidacion_diaria_rendimiento: float = 0.00
    rendimiento_total_generado: float = 0.00
    rendimiento_total_pagado: float = 0.00
    motivo: str
    observaciones: Optional[str] = None

class ContractHistoryCreate(ContractHistoryBase):
    pass

class ContractHistoryUpdate(BaseModel):
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    # Add other updatable fields if needed

class ContractHistoryResponse(ContractHistoryBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
