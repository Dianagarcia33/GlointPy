from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from src.core.database import Base

class MeetingRoom(Base):
    __tablename__ = "meeting_rooms"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    capacity = Column(Integer, nullable=False, default=4)
    location = Column(String(150), nullable=True)
    equipment = Column(String(255), nullable=True)
    color = Column(String(20), nullable=False, default="#10b981")
    is_active = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    reservations = relationship("RoomReservation", back_populates="room", cascade="all, delete-orphan")


class RoomReservation(Base):
    __tablename__ = "room_reservations"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    room_id = Column(BigInteger, ForeignKey("meeting_rooms.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False, index=True)
    attendees_count = Column(Integer, nullable=False, default=1)
    status = Column(String(20), nullable=False, default="confirmed")  # 'confirmed' | 'cancelled' | 'completed'
    cancelled_reason = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    room = relationship("MeetingRoom", back_populates="reservations")
    user = relationship("User")
