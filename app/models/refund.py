from __future__ import annotations
import uuid
import enum
from sqlalchemy import String, Boolean, DateTime, Text, Enum, Numeric, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

class RefundType(enum.Enum):
    CASH = "CASH"
    TRAVEL_CREDIT = "TRAVEL_CREDIT"
    NONE = "NONE"

class RefundStatus(enum.Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"

class Refund(Base):
    __tablename__ = "refunds"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    passenger_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("passengers.id"), nullable=True)
    refund_type: Mapped[RefundType] = mapped_column(Enum(RefundType), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    status: Mapped[RefundStatus] = mapped_column(Enum(RefundStatus), default=RefundStatus.PENDING)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    processed_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    booking: Mapped["Booking"] = relationship("Booking", back_populates="refunds")
    passenger: Mapped["Passenger"] = relationship("Passenger")

class TravelCredit(Base):
    __tablename__ = "travel_credits"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    amount: Mapped[Numeric] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    expires_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    used_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship("User")
    booking: Mapped["Booking"] = relationship("Booking")
