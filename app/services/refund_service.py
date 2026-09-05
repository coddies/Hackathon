from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.refund import Refund, TravelCredit, RefundStatus
from app.models.booking import Booking
from app.exceptions.handlers import NotFoundError
import logging

logger = logging.getLogger(__name__)

async def get_refunds_for_booking(
    db: AsyncSession, booking_reference: str
) -> list[Refund]:
    # First get booking
    booking_result = await db.execute(
        select(Booking).where(Booking.booking_reference == booking_reference)
    )
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise NotFoundError(f"Booking {booking_reference} not found")
    
    result = await db.execute(
        select(Refund).where(Refund.booking_id == booking.id)
    )
    return result.scalars().all()

async def get_travel_credits_for_booking(
    db: AsyncSession, booking_reference: str
) -> list[TravelCredit]:
    booking_result = await db.execute(
        select(Booking).where(Booking.booking_reference == booking_reference)
    )
    booking = booking_result.scalar_one_or_none()
    if not booking:
        raise NotFoundError(f"Booking {booking_reference} not found")
    
    result = await db.execute(
        select(TravelCredit).where(TravelCredit.booking_id == booking.id)
    )
    return result.scalars().all()
