from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.flight import Flight, SeatInventory, FlightStatus
from app.models.waitlist import WaitlistEntry, WaitlistStatus, LoyaltyTier
from app.models.flight import SeatClass, FareType
from app.models.user import User
from app.schemas.waitlist import WaitlistJoinRequest
from app.services.audit_service import create_audit_log, AuditAction
from app.exceptions.handlers import NotFoundError, ConflictError
import logging

logger = logging.getLogger(__name__)

# Priority ranking maps (lower number = higher priority)
LOYALTY_RANK = {
    LoyaltyTier.PLATINUM: 1,
    LoyaltyTier.GOLD: 2,
    LoyaltyTier.SILVER: 3,
    LoyaltyTier.BRONZE: 4,
    LoyaltyTier.NONE: 5,
}
FARE_TYPE_RANK = {
    FareType.FLEXIBLE: 1,
    FareType.BASIC: 2,
}

def calculate_priority_score(
    loyalty_tier: LoyaltyTier,
    fare_type: FareType,
    position: int
) -> int:
    """
    Priority score = (loyalty_rank * 1000) + (fare_type_rank * 100) + position
    Lower score = higher priority.
    """
    lr = LOYALTY_RANK.get(loyalty_tier, 5)
    fr = FARE_TYPE_RANK.get(fare_type, 2)
    return (lr * 1000) + (fr * 100) + position

async def join_waitlist(
    db: AsyncSession,
    payload: WaitlistJoinRequest,
    user: Optional[User] = None
) -> WaitlistEntry:
    # Verify flight exists
    flight_result = await db.execute(select(Flight).where(Flight.id == payload.flight_id))
    flight = flight_result.scalar_one_or_none()
    if not flight:
        raise NotFoundError(f"Flight {payload.flight_id} not found")
    if flight.status == FlightStatus.CANCELLED:
        raise ConflictError("Cannot join waitlist for a cancelled flight")
    
    # Verify class is actually full (waitlist only valid when full)
    inv_result = await db.execute(
        select(SeatInventory).where(
            SeatInventory.flight_id == payload.flight_id,
            SeatInventory.seat_class == payload.seat_class
        )
    )
    inv = inv_result.scalar_one_or_none()
    if not inv:
        raise NotFoundError("Seat class not found for this flight")
    if inv.available_seats > 0:
        raise ConflictError(
            f"{payload.seat_class.value} class has {inv.available_seats} seats available. "
            "Waitlist can only be joined when the class is full."
        )
    
    # Check for duplicate waitlist entry by email
    existing_result = await db.execute(
        select(WaitlistEntry).where(
            WaitlistEntry.flight_id == payload.flight_id,
            WaitlistEntry.seat_class == payload.seat_class,
            WaitlistEntry.email == payload.email,
            WaitlistEntry.status == WaitlistStatus.WAITING
        )
    )
    if existing_result.scalar_one_or_none():
        raise ConflictError("You are already on the waitlist for this flight and class")
    
    # Get current position (count of WAITING entries for this flight+class)
    count_result = await db.execute(
        select(func.count(WaitlistEntry.id)).where(
            WaitlistEntry.flight_id == payload.flight_id,
            WaitlistEntry.seat_class == payload.seat_class,
            WaitlistEntry.status == WaitlistStatus.WAITING
        )
    )
    position = (count_result.scalar() or 0) + 1
    
    loyalty_rank = LOYALTY_RANK.get(payload.loyalty_tier, 5)
    fare_type_rank = FARE_TYPE_RANK.get(payload.fare_type, 2)
    priority_score = calculate_priority_score(payload.loyalty_tier, payload.fare_type, position)
    
    entry = WaitlistEntry(
        flight_id=payload.flight_id,
        seat_class=payload.seat_class,
        passenger_name=payload.passenger_name,
        email=payload.email,
        user_id=user.id if user else None,
        loyalty_tier=payload.loyalty_tier,
        fare_type=payload.fare_type,
        status=WaitlistStatus.WAITING,
        priority_score=priority_score,
        loyalty_rank=loyalty_rank,
        fare_type_rank=fare_type_rank,
        position=position
    )
    db.add(entry)
    await db.flush()
    await db.refresh(entry)
    
    await create_audit_log(
        db=db, action=AuditAction.WAITLIST_JOINED, entity_type="waitlist_entry",
        entity_id=entry.id,
        actor_id=user.id if user else None,
        actor_role=user.role.value if user else "ANONYMOUS",
        new_data={
            "flight_id": str(payload.flight_id),
            "seat_class": payload.seat_class.value,
            "passenger_name": payload.passenger_name,
            "loyalty_tier": payload.loyalty_tier.value,
            "priority_score": priority_score,
            "position": position
        }
    )
    return entry
