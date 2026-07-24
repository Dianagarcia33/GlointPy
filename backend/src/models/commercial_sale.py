from sqlalchemy import Column, BigInteger, Integer, String, Numeric, DateTime, Date, ForeignKey, Boolean, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from src.core.database import Base

class CommercialSaleType(str, enum.Enum):
    contrato_nuevo = "contrato_nuevo"
    reinversion = "reinversion"
    referido = "referido"

class CommercialSale(Base):
    __tablename__ = "commercial_sales"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    commercial_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    client_document = Column(String(50), nullable=False, index=True)
    client_name = Column(String(255), nullable=True)
    
    sale_type = Column(Enum(CommercialSaleType), nullable=False)
    
    # Si es referido, se enlaza al cliente/inversionista que recomendó
    referrer_client_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    referrer_code = Column(String(50), nullable=True)
    
    amount = Column(Numeric(15, 2), nullable=False)
    
    # Comisiones calculadas
    commission_rate = Column(Numeric(5, 4), nullable=False) # e.g. 0.030, 0.035, 0.018
    commission_amount = Column(Numeric(15, 2), nullable=False)
    
    # Desglose de Partición Marginal si cruza el umbral de $36.000.000
    tramo_a_amount = Column(Numeric(15, 2), default=0.00, nullable=True) # Porción al 3.0%
    tramo_b_amount = Column(Numeric(15, 2), default=0.00, nullable=True) # Porción al 3.5%
    
    sale_date = Column(Date, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    commercial = relationship("User", foreign_keys=[commercial_id])
    referrer = relationship("User", foreign_keys=[referrer_client_id])
