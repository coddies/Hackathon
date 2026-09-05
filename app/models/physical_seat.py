from __future__ import annotations
import uuid
from sqlalchemy import Boolean, String, Enum, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.flight import SeatClass

class FlightSeat(Base):
    __tablename__ = "physical_seats"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id", ondelete="CASCADE"), nullable=False)
    seat_number: Mapped[str] = mapped_column(String(5), nullable=False)
    seat_class: Mapped[SeatClass] = mapped_column(Enum(SeatClass), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Links to hold/booking
    hold_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("seat_holds.id", ondelete="SET NULL"), nullable=True)
    passenger_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("passengers.id", ondelete="SET NULL"), nullable=True)
    
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    flight: Mapped["Flight"] = relationship("Flight", backref="physical_seats")
    hold: Mapped["SeatHold"] = relationship("SeatHold", backref="held_seats")
    passenger: Mapped["Passenger"] = relationship("Passenger", backref="assigned_seat")
