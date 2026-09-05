from __future__ import annotations
import uuid
import enum
from typing import List
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.flight import SeatClass, FareType

class ItineraryStatus(enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"

class Itinerary(Base):
    __tablename__ = "itineraries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status: Mapped[ItineraryStatus] = mapped_column(Enum(ItineraryStatus), default=ItineraryStatus.PENDING)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    locale: Mapped[str] = mapped_column(String(10), default="en-US")
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    legs: Mapped[List["ItineraryLeg"]] = relationship("ItineraryLeg", back_populates="itinerary")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="itinerary")
    holds: Mapped[List["SeatHold"]] = relationship("SeatHold", back_populates="itinerary")

class ItineraryLeg(Base):
    __tablename__ = "itinerary_legs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    itinerary_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("itineraries.id"), nullable=False)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id"), nullable=False)
    leg_order: Mapped[int] = mapped_column(Integer, nullable=False)
    seat_class: Mapped[SeatClass] = mapped_column(Enum(SeatClass), nullable=False)
    fare_type: Mapped[FareType] = mapped_column(Enum(FareType), nullable=False)
    passenger_count: Mapped[int] = mapped_column(Integer, nullable=False)

    itinerary: Mapped["Itinerary"] = relationship("Itinerary", back_populates="legs")
    flight: Mapped["Flight"] = relationship("Flight", back_populates="itinerary_legs")
