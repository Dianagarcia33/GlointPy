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
    user_id: int
    monto: Decimal
    status: str
    created_at: datetime
    paquete: Optional[PaqueteInversionBase] = None

    model_config = ConfigDict(from_attributes=True)
