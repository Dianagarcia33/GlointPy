from sqlalchemy import Column, BigInteger, String, Integer, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base
from src.models.security import user_roles

class User(Base):
    __tablename__ = 'users'

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    
    # Identificación
    document_id = Column(String(50), nullable=True, index=True)
    phone_number = Column(String(50), nullable=True)
    
    # Directivo de Inversión Asignado
    commercial_id = Column(BigInteger, ForeignKey('users.id'), nullable=True)
    
    # Campo JSON para dar permisos granulares a un usuario específico
    # sin necesidad de crear un rol. Ej: {"wallets:delete": true, "users:create": false}
    permissions_override = Column(JSON, nullable=True, default={})
    
    # Campos Adicionales
    date_of_birth = Column(DateTime, nullable=True)
    must_change_password = Column(Boolean, default=False)
    
    # Seguridad y Bloqueos
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relación a la tabla roles usando la tabla pivote user_roles
    roles = relationship('Role', secondary=user_roles, back_populates='users')
    investments = relationship("Investor", back_populates="user", cascade="all, delete-orphan")
    bank_accounts = relationship("UserBankAccount", back_populates="user", cascade="all, delete-orphan")
    withdrawals = relationship("Withdrawal", foreign_keys="Withdrawal.user_id", back_populates="user", cascade="all, delete-orphan")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Rango de Inversionista asignado / calculado
    rank_id = Column(Integer, ForeignKey('investment_ranks.id', ondelete='SET NULL'), nullable=True)
    rank = relationship("InvestmentRank", back_populates="users")

    @property
    def permissions(self):
        perms = set()
        if self.roles:
            for r in self.roles:
                if hasattr(r, 'permissions') and r.permissions:
                    for p in r.permissions:
                        perms.add(p.name)
        return list(perms)
