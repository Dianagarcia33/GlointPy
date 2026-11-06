from sqlalchemy import Column, BigInteger, String, Numeric, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class YointPayin(Base):
    __tablename__ = "yoint_payins"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Tipo de recaudo: 'WALLET_TOPUP' o 'INVESTMENT_REQUEST'
    payin_type = Column(String(50), nullable=False, index=True)
    
    # Relaciones contextuales
    investment_request_id = Column(BigInteger, ForeignKey("investment_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    wallet_recharge_id = Column(BigInteger, ForeignKey("wallet_recharges.id", ondelete="SET NULL"), nullable=True, index=True)
    wallet_id = Column(BigInteger, ForeignKey("wallets.id", ondelete="SET NULL"), nullable=True)

    # Método de pago: 'NEQUI', 'BOTON_BANCOLOMBIA', 'PSE', 'BREB'
    payment_method = Column(String(50), nullable=False, index=True)
    
    # Identificadores devueltos por Yoint
    order_id = Column(String(100), nullable=True, index=True)
    transaction_id = Column(String(100), nullable=True, index=True)
    idempotency_key = Column(String(100), nullable=True, unique=True, index=True)
    payment_reference = Column(String(100), nullable=True, index=True)
    
    # Estado: 'PENDING', 'SUCCESS', 'REJECTED', 'FAILED', 'EXPIRED'
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(10), default="COP", nullable=False)
    description = Column(String(255), nullable=True)
    
    # Redirección y URLs para completar el pago
    redirect_url = Column(Text, nullable=True) # async_payment_url de Botón Bancolombia o URL PSE
    return_url = Column(Text, nullable=True)   # URL de retorno de la pasarela a Gloint
    
    # Datos del pagador
    payer_name = Column(String(255), nullable=True)
    payer_email = Column(String(255), nullable=True)
    payer_document_type = Column(String(20), nullable=True)
    payer_document_number = Column(String(50), nullable=True)
    payer_phone = Column(String(50), nullable=True)
    
    # Banco origen (PSE)
    financial_entity_id = Column(String(50), nullable=True)
    financial_entity_name = Column(String(255), nullable=True)
    
    # Auditoría forense de payloads
    request_payload = Column(JSON, nullable=True)
    response_payload = Column(JSON, nullable=True)
    webhook_payload = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones SQLAlchemy
    user = relationship("User", foreign_keys=[user_id])
    investment_request = relationship("InvestmentRequest", foreign_keys=[investment_request_id])
    wallet_recharge = relationship("WalletRecharge", foreign_keys=[wallet_recharge_id])
