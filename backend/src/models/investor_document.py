from sqlalchemy import Column, BigInteger, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.mysql import LONGTEXT
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class InvestorDocument(Base):
    __tablename__ = "investor_documents"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger, ForeignKey("investors.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id = Column(BigInteger, ForeignKey("templates.id", ondelete="SET NULL"), nullable=True)

    title = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=True, default="contract")
    html_content = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=False)
    background_image = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    investor = relationship("Investor", backref="documents")
    user = relationship("User")
    template = relationship("Template")
