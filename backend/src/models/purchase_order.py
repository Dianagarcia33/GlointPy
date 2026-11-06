from sqlalchemy import Column, BigInteger, String, Integer, Numeric, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)  # ej. OC-2026-0001
    supplier_id = Column(BigInteger, ForeignKey("inventory_suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(30), default="DRAFT", nullable=False, index=True)  # 'DRAFT', 'REQUESTED', 'APPROVED', 'RECEIVED', 'CANCELLED'
    
    issue_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    expected_delivery_date = Column(DateTime, nullable=True)
    received_date = Column(DateTime, nullable=True)
    
    subtotal = Column(Numeric(15, 2), default=0.00, nullable=False)
    tax_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(15, 2), default=0.00, nullable=False)
    
    payment_method = Column(String(50), default="TRANSFERENCIA", nullable=False)  # 'TRANSFERENCIA', 'EFECTIVO', 'TARJETA_CREDITO', 'CREDITO_PROVEEDOR'
    invoice_number = Column(String(100), nullable=True)
    invoice_url = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_by_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    approved_by_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    received_by_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    supplier = relationship("InventorySupplier", back_populates="purchase_orders")
    items = relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan")
    created_by = relationship("User", foreign_keys=[created_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    received_by = relationship("User", foreign_keys=[received_by_id])


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    purchase_order_id = Column(BigInteger, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(BigInteger, ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True, index=True)
    
    item_name = Column(String(200), nullable=False)
    item_sku = Column(String(100), nullable=True)
    quantity_ordered = Column(Integer, nullable=False)
    quantity_received = Column(Integer, default=0, nullable=False)
    
    unit_cost = Column(Numeric(15, 2), default=0.00, nullable=False)
    total_cost = Column(Numeric(15, 2), default=0.00, nullable=False)

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    inventory_item = relationship("InventoryItem")
