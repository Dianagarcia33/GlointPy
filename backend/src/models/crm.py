from sqlalchemy import Column, BigInteger, String, Text, DateTime, Boolean, Numeric, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from src.core.database import Base

class CRMProjectStatus(str, enum.Enum):
    ACTIVO = "activo"
    EN_PAUSA = "en_pausa"
    META_ALCANZADA = "meta_alcanzada"
    ARCHIVADO = "archivado"

class CRMLeadStage(str, enum.Enum):
    LEAD_ENTRANTE = "lead_entrante"
    CONTACTADO = "contactado"
    CITA_PRESENTACION = "cita_presentacion"
    NEGOCIACION = "negociacion"
    CIERRE_GANADO = "cierre_ganado"
    PERDIDO = "perdido"

class CRMActivityType(str, enum.Enum):
    NOTA = "nota"
    LLAMADA = "llamada"
    REUNION = "reunion"
    TAREA = "tarea"

class CRMProject(Base):
    __tablename__ = "crm_projects"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    raised_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    status = Column(
        SQLEnum("activo", "en_pausa", "meta_alcanzada", "archivado", name="crm_project_status_enum"),
        nullable=False,
        default="activo"
    )
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    leads = relationship("CRMLead", back_populates="project", cascade="all, delete-orphan")


class CRMLead(Base):
    __tablename__ = "crm_leads"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    project_id = Column(BigInteger, ForeignKey("crm_projects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    document_id = Column(String(50), nullable=True)
    
    estimated_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    stage = Column(
        SQLEnum(
            "lead_entrante", "contactado", "cita_presentacion", "negociacion", "cierre_ganado", "perdido",
            name="crm_lead_stage_enum"
        ),
        nullable=False,
        default="lead_entrante"
    )
    source = Column(String(100), nullable=True, default="Directo")  # 'Web', 'Referido', 'Evento', 'Directo'
    commercial_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    loss_reason = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("CRMProject", back_populates="leads")
    commercial = relationship("User", foreign_keys=[commercial_id])
    activities = relationship("CRMActivity", back_populates="lead", cascade="all, delete-orphan")


class CRMActivity(Base):
    __tablename__ = "crm_activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    type = Column(
        SQLEnum("nota", "llamada", "reunion", "tarea", name="crm_activity_type_enum"),
        nullable=False,
        default="nota"
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    lead = relationship("CRMLead", back_populates="activities")
    user = relationship("User")
