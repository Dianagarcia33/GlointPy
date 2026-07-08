from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Numeric, Date, Integer, Float, Text, JSON, Boolean, Double
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base

class Investor(Base):
    __tablename__ = "investors"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    id_usuario = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    
    codigo_asignado = Column(String(255), nullable=True)
    referido_por = Column(String(255), nullable=True)
    
    fecha_ingreso = Column(Date, nullable=True)
    fecha_finalizacion = Column(Date, nullable=True)
    
    nombre = Column(String(255), nullable=True)
    apellido = Column(String(255), nullable=True)
    nombre_completo = Column(String(255), nullable=True)
    tipo_documento = Column(String(255), nullable=True)
    documento = Column(String(255), nullable=True)
    
    # TusDatos integration fields
    tusdatos_job_id = Column(String(255), nullable=True)
    tusdatos_status = Column(String(255), nullable=True)
    tusdatos_report_id = Column(String(255), nullable=True)
    tusdatos_hallazgos = Column(Text, nullable=True)
    tusdatos_msg = Column(String(255), nullable=True)
    tusdatos_sources = Column(Text, nullable=True)
    tusdatos_justificacion = Column(Text, nullable=True)
    tusdatos_evidencia_paths = Column(JSON, nullable=True)
    tusdatos_hallazgos_corregidos = Column(Boolean, nullable=True)
    tusdatos_fecha_correccion = Column(DateTime, nullable=True)
    tusdatos_corregido_por = Column(BigInteger, nullable=True)
    tusdatos_last_check = Column(DateTime, nullable=True)
    
    fecha_nacimiento = Column(Date, nullable=True)
    correo_electronico = Column(String(255), nullable=True)
    numero_celular = Column(String(255), nullable=True)
    ciudad = Column(String(255), nullable=True)
    estado = Column(String(255), nullable=True)
    banco = Column(String(255), nullable=True)
    tipo_cuenta = Column(String(255), nullable=True)
    numero_cuenta = Column(String(255), nullable=True)
    
    # Contrato y Paquete
    periodo_contrato = Column(BigInteger, nullable=True) # Old reference, will keep for backwards compatibility initially
    contract_period_id = Column(BigInteger, ForeignKey("contract_periods.id", ondelete="SET NULL"), nullable=True)
    dias_contrato = Column(Integer, nullable=True)
    paquete_inversion_adquirido = Column(BigInteger, ForeignKey("paquetes_inversion.id", ondelete="SET NULL"), nullable=True)
    acciones_otorgadas = Column(Integer, nullable=True)
    
    # Rendimientos y Totales
    rendimiento_aprobado_mensual = Column(Double, nullable=True)
    rentabilidad_contrato = Column(Double, nullable=True)
    rendimiento_total_contrato = Column(Double, nullable=True)
    total_contrato = Column(Double, nullable=True)
    liquidacion_diaria_capital = Column(Double, nullable=True)
    liquidacion_diaria_rendimiento = Column(Double, nullable=True)
    
    valor_total_acciones = Column(Integer, nullable=True)
    porcentaje_participacion_accionista = Column(Double, nullable=True)
    observaciones = Column(Text, nullable=True)
    
    representante_legal_nombre = Column(String(255), nullable=True)
    representante_legal_documento = Column(String(255), nullable=True)
    representante_legal_email = Column(String(255), nullable=True)
    representante_legal_telefono = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relaciones
    user = relationship("User", foreign_keys=[user_id], backref="investor_records")
    old_user = relationship("User", foreign_keys=[id_usuario])
    paquete = relationship("PaqueteInversion", backref="investors_history")
    contract_period = relationship("ContractPeriod", backref="investors")
