from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.flight import Flight, SeatInventory, SeatClass, OverbookingPolicy
from app.models.hold import SeatHold, HoldStatus
from app.exceptions.handlers import InventoryError
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

async def get_seat_inventory(
    db: AsyncSession, flight_id, seat_class: SeatClass
) -> SeatInventory:
    result = await db.execute(
        select(SeatInventory).where(
            SeatInventory.flight_id == flight_id,
            SeatInventory.seat_class == seat_class
        )
    )
    inv = result.scalar_one_or_none()
    if inv is None:
        raise InventoryError(f"No inventory found for flight {flight_id} class {seat_class.value}")
    return inv

async def check_booking_cutoff(
    db: AsyncSession, flight_id, seat_class: SeatClass
) -> None:
    """Raise ConflictError if booking cutoff has passed."""
    from app.exceptions.handlers import ConflictError
    inv = await get_seat_inventory(db, flight_id, seat_class)
    result = await db.execute(select(Flight).where(Flight.id == flight_id))
    flight = result.scalar_one_or_none()
    if flight is None:
        from app.exceptions.handlers import NotFoundError
        raise NotFoundError("Flight not found")
    
    cutoff = flight.departure_at.replace(tzinfo=timezone.utc) - \
             __import__('datetime').timedelta(hours=inv.booking_cutoff_hours)
    if datetime.now(timezone.utc) >= cutoff:
        raise ConflictError(
            f"Booking cutoff has passed for {seat_class.value} class "
            f"({inv.booking_cutoff_hours}h before departure)"
        )

async def lock_inventory_for_hold(
    db: AsyncSession, flight_id, seat_class: SeatClass, passenger_count: int
) -> SeatInventory:
    """
    Lock and decrement available_seats, increment held_seats.
    Uses SELECT FOR UPDATE to prevent race conditions.
    Returns the updated SeatInventory.
    """
    from sqlalchemy import text
    
    # Lock the row
    result = await db.execute(
        select(SeatInventory).where(
            SeatInventory.flight_id == flight_id,
            SeatInventory.seat_class == seat_class
        ).with_for_update()
    )
    inv = result.scalar_one_or_none()
    if inv is None:
        raise InventoryError("Inventory not found")
    
    # Check overbooking policy
    effective_limit = inv.available_seats
    if inv.overbooking_policy == OverbookingPolicy.BUFFER_ALLOWED:
        effective_limit = inv.available_seats + inv.overbooking_buffer
    
    if passenger_count > effective_limit:
        raise InventoryError(
            f"Not enough seats available. Requested: {passenger_count}, "
            f"Available: {inv.available_seats}"
        )
    
    inv.available_seats -= passenger_count
    inv.held_seats += passenger_count
    await db.flush()
    return inv

async def atomic_confirm_inventory(
    db: AsyncSession, flight_id, seat_class: SeatClass, passenger_count: int
) -> bool:
    """
    Atomically decrement held_seats (converting held to confirmed).
    Returns True if successful, False if inventory check fails.
    This is called when confirming a booking from a valid hold.
    held_seats already accounts for the reservation; just decrement held_seats.
    """
    result = await db.execute(
        update(SeatInventory)
        .where(
            SeatInventory.flight_id == flight_id,
            SeatInventory.seat_class == seat_class,
            SeatInventory.held_seats >= passenger_count
        )
        .values(held_seats=SeatInventory.held_seats - passenger_count)
        .returning(SeatInventory.id)
    )
    updated_id = result.scalar_one_or_none()
    return updated_id is not None

async def release_hold_inventory(
    db: AsyncSession, flight_id, seat_class: SeatClass, passenger_count: int
) -> None:
    """Release held inventory back to available (on hold expiry or cancellation before confirm)."""
    result = await db.execute(
        select(SeatInventory).where(
            SeatInventory.flight_id == flight_id,
            SeatInventory.seat_class == seat_class
        ).with_for_update()
    )
    inv = result.scalar_one_or_none()
    if inv:
        inv.held_seats = max(0, inv.held_seats - passenger_count)
        inv.available_seats += passenger_count
        await db.flush()

async def release_confirmed_inventory(
    db: AsyncSession, flight_id, seat_class: SeatClass, passenger_count: int
) -> None:
    """Release confirmed seats back to available (on booking cancellation)."""
    result = await db.execute(
        select(SeatInventory).where(
            SeatInventory.flight_id == flight_id,
            SeatInventory.seat_class == seat_class
        ).with_for_update()
    )
    inv = result.scalar_one_or_none()
    if inv:
        inv.available_seats += passenger_count
        await db.flush()

async def expire_stale_holds(db: AsyncSession) -> int:
    """Release all HELD seats where hold_expires_at < now. Returns count of expired holds."""
    from app.models.physical_seat import FlightSeat
    
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(SeatHold).where(
            SeatHold.status == HoldStatus.HELD,
            SeatHold.hold_expires_at < now
        )
    )
    expired_holds = result.scalars().all()
    count = 0
    for hold in expired_holds:
        hold.status = HoldStatus.EXPIRED
        await release_hold_inventory(db, hold.flight_id, hold.seat_class, hold.passenger_count)
        
        # Release physical seats
        seats_result = await db.execute(
            select(FlightSeat).where(FlightSeat.hold_id == hold.id)
        )
        for seat in seats_result.scalars().all():
            seat.hold_id = None
            seat.is_available = True
            
        count += 1
    if count:
        await db.flush()
        logger.info(f"Expired {count} stale seat holds")
    return count
