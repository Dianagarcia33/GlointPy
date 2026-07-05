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
    
    # Raw investor fields missing
    referido_por: Optional[str] = None
    numero_celular: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    acciones_otorgadas: Optional[int] = None
    rendimiento_aprobado_mensual: Optional[Decimal] = None
    rentabilidad_contrato: Optional[Decimal] = None
    liquidacion_diaria_capital: Optional[Decimal] = None
    valor_total_acciones: Optional[Decimal] = None
    porcentaje_participacion_accionista: Optional[Decimal] = None
    tusdatos_job_id: Optional[str] = None
    tusdatos_status: Optional[str] = None
    tusdatos_report_id: Optional[str] = None
    tusdatos_hallazgos: Optional[str] = None
    tusdatos_msg: Optional[str] = None
    tusdatos_sources: Optional[str] = None
    tusdatos_justificacion: Optional[str] = None
    tusdatos_evidencia_paths: Optional[str] = None
    tusdatos_hallazgos_corregidos: Optional[bool] = None
    tusdatos_fecha_correccion: Optional[datetime] = None
    tusdatos_corregido_por: Optional[int] = None
    tusdatos_last_check: Optional[datetime] = None
    fecha_nacimiento: Optional[date] = None
    dias_contrato: Optional[int] = None
    paquete_inversion_adquirido: Optional[int] = None
    observaciones: Optional[str] = None
    representante_legal_nombre: Optional[str] = None
    representante_legal_documento: Optional[str] = None
    representante_legal_email: Optional[str] = None
    representante_legal_telefono: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # Nuevos campos calculados
    rendimiento_diario_calculado: Optional[float] = None
    dias_generando: Optional[int] = None
    rendimiento_producido_hasta_ayer: Optional[float] = None
    capital_actual: Optional[float] = None
    total_bonos: Optional[float] = 0.0
    detalles_bonos: List[dict] = []
    total_retiros_rendimiento: Optional[float] = 0.0
    detalles_retiros_rendimiento: List[dict] = []
    saldo_a_migrar: Optional[float] = 0.0
    wallet_balance_actual: Optional[float] = 0.0
    capital_devuelto: Optional[float] = 0.0
    tramos_desglose: List[dict] = []
    
    model_config = ConfigDict(from_attributes=True)
