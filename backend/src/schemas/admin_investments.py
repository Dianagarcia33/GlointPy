from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from decimal import Decimal

class PersonalInfoSchema(BaseModel):
    nombre_completo: Optional[str] = None
    correo_electronico: Optional[str] = None
    tipo_documento: Optional[str] = None
    documento: Optional[str] = None
    numero_celular: Optional[str] = None
    ciudad: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    referido_por: Optional[str] = None
    observaciones: Optional[str] = None

class BankAccountSchema(BaseModel):
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None

class LegalRepresentativeSchema(BaseModel):
    nombre: Optional[str] = None
    documento: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None

class FinancialInfoSchema(BaseModel):
    paquete_nombre: Optional[str] = None
    paquete_inversion_adquirido: Optional[int] = None
    total_contrato: Optional[Decimal] = None
    rendimiento_total_contrato: Optional[Decimal] = None
    liquidacion_diaria_capital: Optional[Decimal] = None
    liquidacion_diaria_rendimiento: Optional[Decimal] = None
    rendimiento_aprobado_mensual: Optional[Decimal] = None
    rentabilidad_contrato: Optional[Decimal] = None
    acciones_otorgadas: Optional[int] = None
    valor_total_acciones: Optional[Decimal] = None
    porcentaje_participacion_accionista: Optional[Decimal] = None
    periodo_porcentaje: Optional[float] = None
    periodo_meses: Optional[int] = None
    periodo_dias: Optional[int] = None
    dias_contrato: Optional[int] = None
    dias_generando: Optional[int] = None
    rendimiento_diario_calculado: Optional[float] = None
    rendimiento_producido_hasta_ayer: Optional[float] = None
    capital_actual: Optional[float] = None
    capital_devuelto: Optional[float] = 0.0
    saldo_a_migrar: Optional[float] = 0.0
    wallet_balance_actual: Optional[float] = 0.0

class KycInfoSchema(BaseModel):
    status: Optional[str] = None
    job_id: Optional[str] = None
    report_id: Optional[str] = None
    hallazgos: Optional[str] = None
    msg: Optional[str] = None
    sources: Optional[str] = None
    justificacion: Optional[str] = None
    evidencia_paths: Optional[str] = None
    hallazgos_corregidos: Optional[bool] = None
    fecha_correccion: Optional[datetime] = None
    corregido_por: Optional[int] = None
    last_check: Optional[datetime] = None

class AdminInvestorResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    codigo_asignado: Optional[str] = None
    estado: Optional[str] = None
    fecha_ingreso: Optional[date] = None
    fecha_finalizacion: Optional[date] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    personal_info: PersonalInfoSchema
    bank_account: BankAccountSchema
    legal_rep: LegalRepresentativeSchema
    financial_info: FinancialInfoSchema
    kyc_info: KycInfoSchema
    
    total_bonos: Optional[float] = 0.0
    detalles_bonos: List[dict] = []
    total_retiros_rendimiento: Optional[float] = 0.0
    detalles_retiros_rendimiento: List[dict] = []
    tramos_desglose: List[dict] = []
    
    model_config = ConfigDict(from_attributes=True)

class AdminInvestmentRequestResponse(BaseModel):
    id: int
    user_id: int
    monto: Decimal
    status: str
    comprobante_path: Optional[str] = None
    created_at: datetime
    
    # User info
    usuario_nombre: Optional[str] = None
    usuario_correo: Optional[str] = None
    
    # Paquete info
    paquete_nombre: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
