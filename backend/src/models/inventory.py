from sqlalchemy import Column, BigInteger, String, Integer, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class InventoryCategory(Base):
    __tablename__ = "inventory_categories"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    item_type = Column(String(50), default="GENERAL", nullable=False)  # 'PRODUCT', 'OFFICE_SUPPLY', 'GENERAL'
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    items = relationship("InventoryItem", back_populates="category")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    item_type = Column(String(50), default="PRODUCT", nullable=False, index=True)  # 'PRODUCT' (comercial) | 'OFFICE_SUPPLY' (insumo de oficina)
    category_id = Column(BigInteger, ForeignKey("inventory_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    unit_measure = Column(String(30), default="UNIDAD", nullable=False)  # 'UNIDAD', 'PAQUETE', 'CAJA', 'RESMA', 'LITRO'
    current_stock = Column(Integer, default=0, nullable=False)
    min_stock = Column(Integer, default=5, nullable=False)
    unit_cost = Column(Numeric(15, 2), default=0.00, nullable=False)
    sale_price = Column(Numeric(15, 2), nullable=True)  # Solo aplica para PRODUCT
    
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    category = relationship("InventoryCategory", back_populates="items")
    movements = relationship("InventoryMovement", back_populates="item", cascade="all, delete-orphan", order_by="desc(InventoryMovement.created_at)")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    item_id = Column(BigInteger, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)
    movement_type = Column(String(50), nullable=False, index=True)  # 'ENTRY', 'DISPATCH_OFFICE', 'SALE', 'ADJUSTMENT', 'WASTE'
    
    quantity = Column(Integer, nullable=False)  # Cantidad movida (siempre positiva en valor absoluto)
    previous_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    
    unit_cost = Column(Numeric(15, 2), nullable=False)
    total_cost = Column(Numeric(15, 2), nullable=False)  # quantity * unit_cost
    
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    destination_department = Column(String(100), nullable=True)  # Solo para 'DISPATCH_OFFICE' (ej. Administración, Ventas, Gerencia)
    reference = Column(String(100), nullable=True)  # Factura, recibo, consecutivo interno
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    item = relationship("InventoryItem", back_populates="movements")
    user = relationship("User")
