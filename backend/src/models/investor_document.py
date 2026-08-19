from sqlalchemy import Column, BigInteger, String, Text, DateTime
from sqlalchemy.dialects.mysql import BIGINT, LONGTEXT
from datetime import datetime
from src.core.database import Base

class InvestorDocument(Base):
    __tablename__ = "investor_documents"

    id = Column(BigInteger().with_variant(BIGINT(unsigned=True), "mysql"), primary_key=True, autoincrement=True)
    investor_id = Column(BigInteger().with_variant(BIGINT(unsigned=True), "mysql"), nullable=False, index=True)
    user_id = Column(BigInteger().with_variant(BIGINT(unsigned=True), "mysql"), nullable=False, index=True)
    template_id = Column(BigInteger().with_variant(BIGINT(unsigned=True), "mysql"), nullable=True)

    title = Column(String(255), nullable=False)
    document_type = Column(String(100), nullable=True, default="contract")
    html_content = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=False)
    background_image = Column(Text().with_variant(LONGTEXT, "mysql"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
