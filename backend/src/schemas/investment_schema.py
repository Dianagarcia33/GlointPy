from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from decimal import Decimal

# Schema para el Paquete
class PaqueteInversionBase(BaseModel):
    id: int
    paquete_accion_adquirido: str
    acciones_otorgadas: int

    model_config = ConfigDict(from_attributes=True)

# Schema para la Inversion (Request)
class InvestmentRequestResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    monto: Decimal
    status: str
    created_at: Optional[datetime] = None
    paquete: Optional[PaqueteInversionBase] = None
    
    # Rendimientos y Totales (para el Dashboard Avanzado)
    total_contrato: Optional[Decimal] = None
    rendimiento_total_contrato: Optional[Decimal] = None
    liquidacion_diaria_rendimiento: Optional[Decimal] = None
    dias_contrato: Optional[int] = None
    codigo_asignado: Optional[str] = None
    fecha_ingreso: Optional[datetime] = None
    fecha_finalizacion: Optional[datetime] = None
    aceleracion_dias: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)
