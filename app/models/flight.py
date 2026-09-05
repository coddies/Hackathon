from __future__ import annotations
import uuid
import enum
from typing import List
from sqlalchemy import String, Integer, DateTime, Enum, Numeric, ForeignKey, func, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

class FlightStatus(enum.Enum):
    SCHEDULED = "SCHEDULED"
    DELAYED = "DELAYED"
    DEPARTED = "DEPARTED"
    ARRIVED = "ARRIVED"
    CANCELLED = "CANCELLED"

class SeatClass(enum.Enum):
    FIRST = "FIRST"
    BUSINESS = "BUSINESS"
    ECONOMY = "ECONOMY"

class OverbookingPolicy(enum.Enum):
    HARD_NEVER_OVERSELL = "HARD_NEVER_OVERSELL"
    BUFFER_ALLOWED = "BUFFER_ALLOWED"

class GroupBookingPolicy(enum.Enum):
    FULL_FAIL = "FULL_FAIL"
    PARTIAL_HOLD = "PARTIAL_HOLD"
    WAITLIST = "WAITLIST"

class FareType(enum.Enum):
    BASIC = "BASIC"
    FLEXIBLE = "FLEXIBLE"

class Flight(Base):
    __tablename__ = "flights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_number: Mapped[str] = mapped_column(String(20), nullable=False)
    origin: Mapped[str] = mapped_column(String(3), nullable=False)
    destination: Mapped[str] = mapped_column(String(3), nullable=False)
    departure_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    arrival_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    aircraft_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[FlightStatus] = mapped_column(Enum(FlightStatus, name='flight_status'), default=FlightStatus.SCHEDULED)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    __table_args__ = (
        UniqueConstraint("flight_number", "origin", "destination", name="uq_flight_number_origin_dest"),
    )

    seat_inventory: Mapped[List["SeatInventory"]] = relationship("SeatInventory", back_populates="flight")
    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="flight")
    holds: Mapped[List["SeatHold"]] = relationship("SeatHold", back_populates="flight")
    itinerary_legs: Mapped[List["ItineraryLeg"]] = relationship("ItineraryLeg", back_populates="flight")
    waitlist_entries: Mapped[List["WaitlistEntry"]] = relationship("WaitlistEntry", back_populates="flight")

class SeatInventory(Base):
    __tablename__ = "seat_inventory"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id"), nullable=False)
    seat_class: Mapped[SeatClass] = mapped_column(Enum(SeatClass, name='seat_class'), nullable=False)
    total_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    available_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    held_seats: Mapped[int] = mapped_column(Integer, default=0)
    overbooking_policy: Mapped[OverbookingPolicy] = mapped_column(Enum(OverbookingPolicy, name='overbooking_policy'), default=OverbookingPolicy.HARD_NEVER_OVERSELL)
    overbooking_buffer: Mapped[int] = mapped_column(Integer, default=0)
    fare_basic: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    fare_flexible: Mapped[Numeric] = mapped_column(Numeric(10, 2), nullable=False)
    booking_cutoff_hours: Mapped[int] = mapped_column(Integer, default=3)
    group_booking_policy: Mapped[GroupBookingPolicy] = mapped_column(Enum(GroupBookingPolicy, name='group_booking_policy'), default=GroupBookingPolicy.FULL_FAIL)

    __table_args__ = (
        UniqueConstraint("flight_id", "seat_class", name="uq_seatinv_flight_class"),
        CheckConstraint('available_seats >= 0', name='check_available_seats_positive'),
        CheckConstraint('held_seats >= 0', name='check_held_seats_positive'),
    )

    flight: Mapped["Flight"] = relationship("Flight", back_populates="seat_inventory")
