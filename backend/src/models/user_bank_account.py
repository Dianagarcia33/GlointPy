from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from src.core.database import Base
from src.core.encryption import EncryptedString

class UserBankAccount(Base):
    __tablename__ = "user_bank_accounts"
    __table_args__ = {'extend_existing': True}

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    banco = Column(String(255), nullable=False)
    tipo_cuenta = Column(String(255), nullable=False)
    numero_cuenta = Column(EncryptedString(255), nullable=False)
    
    # El usuario puede tener varias cuentas, pero marcar una como principal
    is_primary = Column(Boolean, default=False)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=True)

    # Relaciones
    user = relationship("User", back_populates="bank_accounts")
