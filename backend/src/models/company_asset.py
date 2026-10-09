from sqlalchemy import Column, BigInteger, String, Numeric, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class CompanyAsset(Base):
    __tablename__ = "company_assets"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    asset_code = Column(String(50), unique=True, nullable=False, index=True)  # Placa única interna (ej. ACT-001, LAP-042)
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(50), default="TECNOLOGIA", nullable=False, index=True)  # 'TECNOLOGIA', 'MOBILIARIO', 'EQUIPOS_OFICINA', 'VEHICULOS', 'HERRAMIENTAS', 'OTROS'
    
    serial_number = Column(String(100), nullable=True, index=True)
    brand = Column(String(100), nullable=True)
    model = Column(String(100), nullable=True)
    supplier_id = Column(BigInteger, ForeignKey("inventory_suppliers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    purchase_date = Column(DateTime, nullable=True)
    purchase_cost = Column(Numeric(15, 2), default=0.00, nullable=False)
    warranty_expiration = Column(DateTime, nullable=True)
    
    status = Column(String(30), default="AVAILABLE", nullable=False, index=True)  # 'AVAILABLE', 'ASSIGNED', 'IN_MAINTENANCE', 'DAMAGED', 'DECOMMISSIONED'
    current_condition = Column(String(30), default="EXCELLENT", nullable=False)  # 'EXCELLENT', 'GOOD', 'FAIR', 'POOR'
    location = Column(String(150), nullable=True)  # Sede, piso, oficina o 'Remoto'
    
    current_holder_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    photo_url = Column(String(500), nullable=True)
    invoice_reference = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    supplier = relationship("InventorySupplier", back_populates="assets")
    current_holder = relationship("User", foreign_keys=[current_holder_id])
    assignments = relationship("AssetAssignment", back_populates="asset", cascade="all, delete-orphan", order_by="desc(AssetAssignment.assigned_date)")


class AssetAssignment(Base):
    __tablename__ = "asset_assignments"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    asset_id = Column(BigInteger, ForeignKey("company_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_by_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    assigned_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    returned_date = Column(DateTime, nullable=True)
    
    condition_on_assignment = Column(String(30), default="GOOD", nullable=False)
    condition_on_return = Column(String(30), nullable=True)
    assignment_notes = Column(Text, nullable=True)
    return_notes = Column(Text, nullable=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)

    asset = relationship("CompanyAsset", back_populates="assignments")
    user = relationship("User", foreign_keys=[user_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])
