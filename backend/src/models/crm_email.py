from sqlalchemy import Column, BigInteger, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from src.core.database import Base

class CRMEmailDirection(str, enum.Enum):
    OUTBOUND = "outbound"
    INBOUND = "inbound"

class CRMEmailStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    DELIVERED = "delivered font"
    FAILED = "failed"
    RECEIVED = "received"

class CRMEmail(Base):
    __tablename__ = "crm_emails"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    lead_id = Column(BigInteger, ForeignKey("crm_leads.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(BigInteger, ForeignKey("crm_projects.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    direction = Column(
        SQLEnum("outbound", "inbound", name="crm_email_direction_enum"),
        nullable=False,
        default="outbound"
    )
    sender_email = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False)
    
    subject = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text, nullable=True)
    
    status = Column(
        SQLEnum("draft", "sent", "delivered", "failed", "received", name="crm_email_status_enum"),
        nullable=False,
        default="sent"
    )
    is_read = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    lead = relationship("CRMLead", foreign_keys=[lead_id])
    project = relationship("CRMProject", foreign_keys=[project_id])
    user = relationship("User", foreign_keys=[user_id])
