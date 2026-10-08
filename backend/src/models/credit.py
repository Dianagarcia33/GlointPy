from sqlalchemy import Column, BigInteger, String, Numeric, Integer, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base


class CreditConfig(Base):
    """
    Configuración global de la línea de crédito y parámetros regulatorios (Tasa de Usura).
    Permite al Administrador fijar el tope legal colombiano y la tasa por defecto de la plataforma.
    """
    __tablename__ = "credit_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Tasa de usura legal vigente certificada por la Superfinanciera
    max_usury_rate_ea = Column(Numeric(6, 2), default=26.50, nullable=False) # % Efectivo Anual (ej. 26.50%)
    max_usury_rate_monthly = Column(Numeric(6, 2), default=1.98, nullable=False) # % Mensual equivalente (ej. 1.98%)
    
    # Tasa comercial de Gloint por defecto
    default_interest_rate_monthly = Column(Numeric(6, 2), default=1.80, nullable=False) # % Mensual aplicado
    
    # Límites operativos
    min_amount = Column(Numeric(15, 2), default=100000.00, nullable=False)
    max_amount = Column(Numeric(15, 2), default=20000000.00, nullable=False)
    min_term_months = Column(Integer, default=1, nullable=False)
    max_term_months = Column(Integer, default=24, nullable=False)
    
    # Cantidades y plazos autorizados por el Administrador
    allowed_amounts = Column(String(500), default="500000, 1000000, 2000000, 5000000, 10000000", nullable=True)
    allowed_terms = Column(String(255), default="3, 6, 12, 18, 24", nullable=True)
    
    # Auditoría
    updated_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    updater = relationship("User", foreign_keys=[updated_by])


class Credit(Base):
    """
    Entidad principal de Crédito / Préstamo Fintech para usuarios e inversionistas de Gloint.
    """
    __tablename__ = "credits"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Parámetros financieros
    requested_amount = Column(Numeric(15, 2), nullable=False)
    approved_amount = Column(Numeric(15, 2), nullable=True)
    term_months = Column(Integer, nullable=False) # Plazo en meses (ej. 3, 6, 12)
    interest_rate = Column(Numeric(6, 2), nullable=False) # Tasa mensual aplicada (%)
    frequency = Column(String(50), default="monthly", nullable=False) # monthly, biweekly
    
    # Estado del crédito
    # PENDING, IN_REVIEW, APPROVED, ACTIVE, PAID, REJECTED, CANCELLED
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    purpose = Column(Text, nullable=True)

    # Cuenta bancaria de destino (de la misma forma que en retiros)
    user_bank_account_id = Column(BigInteger, ForeignKey("user_bank_accounts.id", ondelete="SET NULL"), nullable=True)
    banco = Column(String(255), nullable=False)
    tipo_cuenta = Column(String(255), nullable=False)
    numero_cuenta = Column(String(255), nullable=False)

    # Auditoría de Aprobación / Rechazo
    approved_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejected_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rejected_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)

    # Desembolso (Dispersión vía Yoint o Transferencia Directa)
    disbursed_at = Column(DateTime, nullable=True)
    disbursement_method = Column(String(100), default="YOINT_DISPERSION", nullable=True)
    disbursement_reference = Column(String(255), nullable=True) # order_id o ref bancaria
    disbursement_receipt_url = Column(String(500), nullable=True)
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones SQLAlchemy
    user = relationship("User", foreign_keys=[user_id], back_populates="credits")
    bank_account = relationship("UserBankAccount", foreign_keys=[user_bank_account_id])
    approver = relationship("User", foreign_keys=[approved_by])
    rejecter = relationship("User", foreign_keys=[rejected_by])
    installments = relationship("CreditInstallment", back_populates="credit", cascade="all, delete-orphan", order_by="CreditInstallment.installment_number")
    yoint_dispersions = relationship("YointDispersion", back_populates="credit", cascade="all, delete-orphan", order_by="desc(YointDispersion.id)")


class CreditInstallment(Base):
    """
    Cuota individual del plan de amortización del crédito.
    Permite pagos flexibles: parcial o total con Wallet + restante por Yoint o Transferencia Bancaria.
    """
    __tablename__ = "credit_installments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    credit_id = Column(BigInteger, ForeignKey("credits.id", ondelete="CASCADE"), nullable=False, index=True)
    
    installment_number = Column(Integer, nullable=False) # 1, 2, 3...
    due_date = Column(Date, nullable=False) # Fecha límite de pago
    
    principal_amount = Column(Numeric(15, 2), nullable=False) # Abono a capital
    interest_amount = Column(Numeric(15, 2), default=0.00, nullable=False) # Interés corriente
    total_amount = Column(Numeric(15, 2), nullable=False) # principal + interest
    
    # Desglose de pagos realizados
    wallet_amount_paid = Column(Numeric(15, 2), default=0.00, nullable=False) # Pagado con Wallet Gloint
    external_amount_paid = Column(Numeric(15, 2), default=0.00, nullable=False) # Pagado con Yoint o transferencia bancaria
    paid_amount = Column(Numeric(15, 2), default=0.00, nullable=False) # Total abonado
    
    # Estados de la cuota:
    # PENDING: Pendiente de pago
    # IN_REVIEW: Comprobante transferido adjunto, pendiente de validación por admin
    # PARTIALLY_PAID: Cubierto parcialmente por wallet, esperando saldo restante
    # PAID: 100% satisfecha
    # OVERDUE: Vencida
    status = Column(String(50), default="PENDING", nullable=False, index=True)
    
    # Metadatos del pago externo
    payment_method = Column(String(100), nullable=True) # WALLET, YOINT_ONLINE, MANUAL_TRANSFER, MIXED
    payment_reference = Column(String(100), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    
    # Validación administrativa de comprobantes manuales
    reviewed_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relaciones SQLAlchemy
    credit = relationship("Credit", back_populates="installments")
    reviewer = relationship("User", foreign_keys=[reviewed_by])
