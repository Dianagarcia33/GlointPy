from sqlalchemy import Column, BigInteger, String, Numeric, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from src.core.database import Base

class SharePriceHistory(Base):
    __tablename__ = "share_price_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    previous_price = Column(Numeric(15, 2), nullable=False)
    new_price = Column(Numeric(15, 2), nullable=False)
    change_percentage = Column(Numeric(6, 2), nullable=False, default=0.00)
    justification_notes = Column(Text, nullable=False)  # Obligatorio para cualquier cambio
    admin_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    admin = relationship("User")

class ShareIssuance(Base):
    __tablename__ = "share_issuances"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    total_shares_issued = Column(Integer, nullable=False)
    available_shares = Column(Integer, nullable=False)
    price_per_share = Column(Numeric(15, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("User")

class ShareListing(Base):
    __tablename__ = "share_listings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    seller_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    shares_total = Column(Integer, nullable=False)
    shares_available = Column(Integer, nullable=False)
    shares_locked = Column(Integer, nullable=False, default=0) # Reservadas en compra con excedente
    price_per_share = Column(Numeric(15, 2), nullable=False)
    status = Column(String(50), default="active", nullable=False) # active, sold_out, cancelled
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = relationship("User")
    orders = relationship("ShareTradeOrder", back_populates="listing")

class ShareTradeOrder(Base):
    __tablename__ = "share_trade_orders"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    listing_id = Column(BigInteger, ForeignKey("share_listings.id", ondelete="SET NULL"), nullable=True)
    issuance_id = Column(BigInteger, ForeignKey("share_issuances.id", ondelete="SET NULL"), nullable=True)
    seller_id = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    buyer_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    shares_quantity = Column(Integer, nullable=False)
    price_per_share = Column(Numeric(15, 2), nullable=False)
    total_amount = Column(Numeric(15, 2), nullable=False)
    wallet_amount_used = Column(Numeric(15, 2), nullable=False, default=0.00)
    surplus_amount = Column(Numeric(15, 2), nullable=False, default=0.00)
    
    receipt_url = Column(String(500), nullable=True)
    payment_method = Column(String(50), nullable=False, default="full_wallet") # full_wallet, surplus_bank_transfer
    status = Column(String(50), nullable=False, default="completed") # completed, pending_admin_approval, rejected, cancelled
    
    admin_notes = Column(Text, nullable=True)
    approved_by = Column(BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    listing = relationship("ShareListing", back_populates="orders")
    issuance = relationship("ShareIssuance")
    seller = relationship("User", foreign_keys=[seller_id])
    buyer = relationship("User", foreign_keys=[buyer_id])
    approver = relationship("User", foreign_keys=[approved_by])
