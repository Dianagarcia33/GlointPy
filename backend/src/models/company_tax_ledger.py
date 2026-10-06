from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class CompanyTaxLedger(Base):
    """
    Libro fiscal corporativo exclusivo para el recaudo y control del 3.2% de retención de retiros.
    Completamente aislado de las billeteras de usuarios para evitar cualquier retiro no autorizado.
    """
    __tablename__ = "company_tax_ledger"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    withdrawal_id = Column(BigInteger, ForeignKey("withdrawals.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    investor_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Desglose financiero del recaudo
    tax_amount = Column(Numeric(15, 2), nullable=False) # El 3.2% recaudado para Gloint
    gross_amount = Column(Numeric(15, 2), nullable=False) # Monto solicitado por el inversionista
    net_amount = Column(Numeric(15, 2), nullable=False) # Monto neto enviado por Yoint
    
    # Estado del recaudo: COLLECTED (recaudado), REFUNDED (revertido por rechazo del retiro), SETTLED (liquidado a DIAN)
    status = Column(String(50), default="COLLECTED", nullable=False, index=True)
    
    description = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones
    withdrawal = relationship("Withdrawal", backref="tax_ledger_entry")
    investor = relationship("User", foreign_keys=[investor_id])
