from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal

class AdminInvestorResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    nombre_completo: Optional[str] = None
    correo_electronico: Optional[str] = None
    codigo_asignado: Optional[str] = None
    paquete_nombre: Optional[str] = None
    
    fecha_ingreso: Optional[date] = None
    fecha_finalizacion: Optional[date] = None
    
    total_contrato: Optional[Decimal] = None
    rendimiento_total_contrato: Optional[Decimal] = None
    liquidacion_diaria_rendimiento: Optional[Decimal] = None
    
    periodo_porcentaje: Optional[float] = None
    periodo_meses: Optional[int] = None
    periodo_dias: Optional[int] = None
    
    # Nuevos campos calculados
    rendimiento_diario_calculado: Optional[float] = None
    dias_generando: Optional[int] = None
    rendimiento_producido_hasta_ayer: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)
