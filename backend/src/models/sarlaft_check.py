from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON, Text, BigInteger
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class SarlaftCheck(Base):
    __tablename__ = "sarlaft_checks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    investment_request_id = Column(Integer, ForeignKey("investment_requests.id"), nullable=True, index=True)
    
    tusdatos_job_id = Column(String(255), nullable=True, index=True)
    tusdatos_status = Column(String(255), nullable=True)
    tusdatos_report_id = Column(String(255), nullable=True, index=True)
    
    tusdatos_hallazgos = Column(Text, nullable=True)
    tusdatos_msg = Column(String(255), nullable=True)
    tusdatos_sources = Column(Text, nullable=True)
    tusdatos_justificacion = Column(Text, nullable=True)
    tusdatos_evidencia_paths = Column(JSON, nullable=True)
    
    tusdatos_hallazgos_corregidos = Column(Boolean, default=False, nullable=False)
    tusdatos_fecha_correccion = Column(DateTime, nullable=True)
    tusdatos_corregido_por = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    tusdatos_last_check = Column(DateTime, nullable=True)

    pdf_path = Column(String(500), nullable=True)
    risk_level = Column(String(50), default="CLEAN")
    has_findings = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="sarlaft_checks")
    corregido_por_user = relationship("User", foreign_keys=[tusdatos_corregido_por])
    investment_request = relationship("InvestmentRequest", backref="sarlaft_checks")
