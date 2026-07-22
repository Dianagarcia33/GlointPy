from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class SarlaftCheck(Base):
    __tablename__ = "sarlaft_checks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    investment_request_id = Column(Integer, ForeignKey("investment_requests.id"), nullable=True, index=True)
    
    job_id = Column(String(255), nullable=True, index=True)
    report_id = Column(String(255), nullable=True, index=True)
    
    document_number = Column(String(50), nullable=False)
    document_type = Column(String(20), nullable=False, default="CC")
    
    # Status: pending, processing, completed, failed
    status = Column(String(50), nullable=False, default="pending")
    
    has_findings = Column(Boolean, default=False)
    risk_level = Column(String(50), default="CLEAN") # CLEAN, LOW, MEDIUM, HIGH
    
    pdf_path = Column(String(500), nullable=True)
    details = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="sarlaft_checks")
    investment_request = relationship("InvestmentRequest", backref="sarlaft_checks")
