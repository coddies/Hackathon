from __future__ import annotations
import uuid
import enum
from typing import List
from sqlalchemy import String, Boolean, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base

class UserRole(enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    OPS_AGENT = "OPS_AGENT"
    PASSENGER = "PASSENGER"

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.PASSENGER)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    bookings: Mapped[List["Booking"]] = relationship("Booking", back_populates="user")
    waitlist_entries: Mapped[List["WaitlistEntry"]] = relationship("WaitlistEntry", back_populates="user")
