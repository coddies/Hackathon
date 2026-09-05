from __future__ import annotations
import uuid
import enum
from sqlalchemy import String, Boolean, DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from app.models.flight import FareType

class RebookingRule(enum.Enum):
    AUTO_REBOOK = "AUTO_REBOOK"
    NOTIFY_ONLY = "NOTIFY_ONLY"
    NONE = "NONE"

class ScheduleChange(Base):
    __tablename__ = "schedule_changes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("flights.id", ondelete="CASCADE"), nullable=False)
    changed_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    old_departure_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    new_departure_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    old_arrival_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    new_arrival_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    old_origin: Mapped[str] = mapped_column(String(3), nullable=False)
    new_origin: Mapped[str] = mapped_column(String(3), nullable=False)
    old_destination: Mapped[str] = mapped_column(String(3), nullable=False)
    new_destination: Mapped[str] = mapped_column(String(3), nullable=False)
    
    rebooking_rule: Mapped[RebookingRule] = mapped_column(Enum(RebookingRule, name='rebooking_rule'), default=RebookingRule.NONE)
    fare_policy_override: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    affected_bookings_count: Mapped[int] = mapped_column(Integer, default=0)
    
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    flight: Mapped["Flight"] = relationship("Flight", backref="schedule_changes")
    user: Mapped["User"] = relationship("User")
