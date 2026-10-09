from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class InventorySupplier(Base):
    __tablename__ = "inventory_suppliers"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    nit_rut = Column(String(50), nullable=True, unique=True, index=True)
    contact_name = Column(String(150), nullable=True)
    email = Column(String(150), nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    category = Column(String(100), nullable=False, default="GENERAL")  # 'TECNOLOGIA', 'PAPELERIA_INSUMOS', 'MOBILIARIO', 'SERVICIOS', 'CAFETERIA_ASEO', 'GENERAL'
    payment_terms = Column(String(100), nullable=False, default="CONTADO")  # 'CONTADO', 'CREDITO_15', 'CREDITO_30', 'CREDITO_60', 'ANTICIPADO'
    bank_info = Column(Text, nullable=True)  # Datos de transferencia: Banco, Tipo, Cuenta, Titular
    notes = Column(Text, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")
    assets = relationship("CompanyAsset", back_populates="supplier")
