from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class Beneficiary(Base):
    __tablename__ = "beneficiaries"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    investor_id = Column(BigInteger, ForeignKey("investors.id", ondelete="CASCADE"), nullable=True)
    
    name = Column(String(255), nullable=False)
    document_number = Column(String(255), nullable=True)
    relationship_type = Column("relationship", String(255), nullable=True) # Mapea a la columna 'relationship' en DB
    percentage = Column(Numeric(5, 2), nullable=False, default=0.00)
    phone = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones de ORM
    user = relationship("User", backref="beneficiaries")
    investor = relationship("Investor", backref="beneficiaries")
