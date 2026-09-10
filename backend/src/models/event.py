from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.database import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    title = Column(String(255), nullable=False, default="Gloint Power Tech")
    slug = Column(String(100), unique=True, index=True, nullable=False, default="gloint-power-tech")
    description = Column(Text, nullable=True)
    event_date = Column(DateTime(timezone=True), nullable=True)
    location = Column(String(255), nullable=True)
    virtual_url = Column(String(500), nullable=True)
    capacity_in_person = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    banner_active = Column(Boolean, nullable=False, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    attendees = relationship("EventAttendee", back_populates="event", cascade="all, delete-orphan")


class EventAttendee(Base):
    __tablename__ = "event_attendees"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    event_id = Column(BigInteger, ForeignKey("events.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    attendee_type = Column(String(20), nullable=False, default="investor")  # 'investor' | 'external'
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    document_id = Column(String(50), nullable=True)
    city = Column(String(100), nullable=True)
    attendance_mode = Column(String(20), nullable=False, default="in_person")  # 'in_person' | 'virtual'
    has_companion = Column(Boolean, nullable=False, default=False)
    companion_name = Column(String(255), nullable=True)
    seats_reserved = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="confirmed")  # 'confirmed' | 'cancelled'

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    event = relationship("Event", back_populates="attendees")
    user = relationship("User", foreign_keys=[user_id])
