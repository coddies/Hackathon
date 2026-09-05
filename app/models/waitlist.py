from __future__ import annotations
import uuid
import enum
from sqlalchemy import String, Integer, DateTime, Enum, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.flight import SeatClass, FareType

class WaitlistStatus(enum.Enum):
    WAITING = "WAITING"
    PROMOTED = "PROMOTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class LoyaltyTier(enum.Enum):
    NONE = "NONE"
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"

class WaitlistEntry(Base):
    __tablename__ = "waitlist_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id"), nullable=False)
    seat_class: Mapped[SeatClass] = mapped_column(Enum(SeatClass), nullable=False)
    passenger_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    loyalty_tier: Mapped[LoyaltyTier] = mapped_column(Enum(LoyaltyTier), default=LoyaltyTier.NONE)
    fare_type: Mapped[FareType] = mapped_column(Enum(FareType), nullable=False)
    status: Mapped[WaitlistStatus] = mapped_column(Enum(WaitlistStatus), default=WaitlistStatus.WAITING)
    priority_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    loyalty_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    fare_type_rank: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    promoted_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    flight: Mapped["Flight"] = relationship("Flight", back_populates="waitlist_entries")
    user: Mapped["User"] = relationship("User", back_populates="waitlist_entries")
