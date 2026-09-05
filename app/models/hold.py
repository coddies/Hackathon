from __future__ import annotations
import uuid
import enum
from sqlalchemy import Integer, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.flight import SeatClass, FareType

class HoldStatus(enum.Enum):
    HELD = "HELD"
    EXPIRED = "EXPIRED"
    CONFIRMED = "CONFIRMED"
    RELEASED = "RELEASED"

class SeatHold(Base):
    __tablename__ = "seat_holds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id"), nullable=False)
    seat_class: Mapped[SeatClass] = mapped_column(Enum(SeatClass, name='seat_class'), nullable=False)
    fare_type: Mapped[FareType] = mapped_column(Enum(FareType, name='fare_type'), nullable=False)
    passenger_count: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status: Mapped[HoldStatus] = mapped_column(Enum(HoldStatus, name='hold_status'), default=HoldStatus.HELD)
    hold_started_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    hold_expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    itinerary_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("itineraries.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    flight: Mapped["Flight"] = relationship("Flight", back_populates="holds")
    user: Mapped["User"] = relationship("User")
    itinerary: Mapped["Itinerary"] = relationship("Itinerary", back_populates="holds")
    booking: Mapped["Booking"] = relationship("Booking", back_populates="hold")
