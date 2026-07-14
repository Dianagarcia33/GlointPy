from datetime import datetime
from sqlalchemy import BigInteger, Integer, Numeric, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

class Acceleration(Base):
    __tablename__ = "contract_accelerations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    investor_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("investors.id", ondelete="CASCADE"))
    investment_request_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("investment_requests.id", ondelete="CASCADE"))
    contract_period_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("periods.id", ondelete="SET NULL"), nullable=True)
    original_days: Mapped[int] = mapped_column(Integer)
    acceleration_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=5.00)
    days_to_reduce: Mapped[float] = mapped_column(Numeric(20, 6), default=0)
    capital_released: Mapped[float | None] = mapped_column(Numeric(15, 2), default=0.00)
    new_duration: Mapped[float] = mapped_column(Numeric(20, 6), default=0)
    applied: Mapped[bool] = mapped_column(Boolean, default=False)
    bonus_amount: Mapped[float | None] = mapped_column(Numeric(20, 6), default=0)
    created_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    investor = relationship("Investor", backref="accelerations")
    investment_request = relationship("InvestmentRequest", backref="accelerations")
    period = relationship("Period", backref="accelerations")
