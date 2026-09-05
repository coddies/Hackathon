from __future__ import annotations
import uuid
import enum
from typing import List
from sqlalchemy import String, Boolean, DateTime, Date, Enum, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.flight import SeatClass, FareType

class BookingStatus(enum.Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    REBOOKING_PENDING = "REBOOKING_PENDING"

class CancellationPolicy(enum.Enum):
    REFUNDABLE = "REFUNDABLE"
    CREDIT_ONLY = "CREDIT_ONLY"
    NON_REFUNDABLE = "NON_REFUNDABLE"

class FlightCancellationOutcome(enum.Enum):
    REFUND = "REFUND"
    REBOOK = "REBOOK"
    TRAVEL_CREDIT = "TRAVEL_CREDIT"

class PassengerStatus(enum.Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"

class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_reference: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id"), nullable=False)
    seat_class: Mapped[SeatClass] = mapped_column(Enum(SeatClass), nullable=False)
    fare_type: Mapped[FareType] = mapped_column(Enum(FareType), nullable=False)
    total_amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    status: Mapped[BookingStatus] = mapped_column(Enum(BookingStatus), default=BookingStatus.CONFIRMED)
    cancellation_policy: Mapped[CancellationPolicy] = mapped_column(Enum(CancellationPolicy), nullable=False)
    hold_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("seat_holds.id"), nullable=True)
    itinerary_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("itineraries.id"), nullable=True)
    airline_initiated: Mapped[bool] = mapped_column(Boolean, default=False)
    flight_cancellation_outcome: Mapped[FlightCancellationOutcome | None] = mapped_column(Enum(FlightCancellationOutcome), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    cancelled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="bookings")
    flight: Mapped["Flight"] = relationship("Flight", back_populates="bookings")
    hold: Mapped["SeatHold"] = relationship("SeatHold", back_populates="booking")
    itinerary: Mapped["Itinerary"] = relationship("Itinerary", back_populates="bookings")
    passengers: Mapped[List["Passenger"]] = relationship("Passenger", back_populates="booking")
    refunds: Mapped[List["Refund"]] = relationship("Refund", back_populates="booking")

class Passenger(Base):
    __tablename__ = "passengers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    passport_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date_of_birth: Mapped[Date | None] = mapped_column(Date, nullable=True)
    status: Mapped[PassengerStatus] = mapped_column(Enum(PassengerStatus), default=PassengerStatus.CONFIRMED)
    cancelled_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refund_amount: Mapped[Numeric | None] = mapped_column(Numeric(10, 2), nullable=True)

    booking: Mapped["Booking"] = relationship("Booking", back_populates="passengers")
