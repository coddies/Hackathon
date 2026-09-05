import string
import random
from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.flight import Flight, SeatInventory, FlightStatus, GroupBookingPolicy
from app.models.hold import SeatHold, HoldStatus
from app.models.booking import (
    Booking, Passenger, BookingStatus, CancellationPolicy,
    PassengerStatus, FlightCancellationOutcome
)
from app.models.refund import Refund, TravelCredit, RefundType, RefundStatus
from app.models.user import User
from app.schemas.hold import SeatHoldRequest
from app.schemas.booking import BookingConfirmRequest, BookingCancelRequest, PassengerInput
from app.services.inventory_service import (
    lock_inventory_for_hold, atomic_confirm_inventory,
    release_hold_inventory, release_confirmed_inventory,
    check_booking_cutoff, get_seat_inventory
)
from app.services.audit_service import create_audit_log, AuditAction
from app.services.email_service import send_booking_confirmation, send_cancellation_receipt
from app.exceptions.handlers import NotFoundError, ConflictError, InventoryError
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

def _generate_booking_reference() -> str:
    chars = string.ascii_uppercase + string.digits
    return "BK" + "".join(random.choices(chars, k=8))

async def create_hold(
    db: AsyncSession,
    payload: SeatHoldRequest,
    user: Optional[User] = None
) -> SeatHold:
    # Verify flight exists and is not cancelled
    result = await db.execute(
        select(Flight).where(Flight.id == payload.flight_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise NotFoundError(f"Flight {payload.flight_id} not found")
    if flight.status == FlightStatus.CANCELLED:
        raise ConflictError("Cannot hold seats on a cancelled flight")
    
    # Check booking cutoff
    await check_booking_cutoff(db, payload.flight_id, payload.seat_class)
    
    # Get inventory to check group booking policy
    inv = await get_seat_inventory(db, payload.flight_id, payload.seat_class)
    
    # Handle group booking policy
    actual_count = payload.passenger_count
    if payload.passenger_count > 1:
        if inv.group_booking_policy == GroupBookingPolicy.FULL_FAIL:
            # All or nothing — proceed normally, lock_inventory_for_hold will fail if not enough
            pass
        elif inv.group_booking_policy == GroupBookingPolicy.PARTIAL_HOLD:
            actual_count = min(payload.passenger_count, inv.available_seats)
            if actual_count == 0:
                raise InventoryError("No seats available for partial hold")
        elif inv.group_booking_policy == GroupBookingPolicy.WAITLIST:
            if inv.available_seats < payload.passenger_count:
                raise ConflictError(
                    "Group booking policy requires waitlist. "
                    "Please use POST /waitlist endpoint."
                )
    
    # Lock inventory
    await lock_inventory_for_hold(db, payload.flight_id, payload.seat_class, actual_count)
    
    # Handle physical seat selection
    from app.models.physical_seat import FlightSeat
    if payload.seat_number:
        if payload.fare_type.value == "BASIC":
            raise ConflictError("Seat choice is not allowed for BASIC fare")
        if actual_count > 1:
            raise ConflictError("Cannot specify single seat_number for multiple passengers")
            
        seat_result = await db.execute(
            select(FlightSeat).where(
                FlightSeat.flight_id == payload.flight_id,
                FlightSeat.seat_number == payload.seat_number
            ).with_for_update()
        )
        physical_seat = seat_result.scalar_one_or_none()
        if not physical_seat:
            raise NotFoundError(f"Seat {payload.seat_number} not found on this flight")
        if not physical_seat.is_available:
            raise ConflictError(f"Seat {payload.seat_number} is already taken or held")
        if physical_seat.seat_class != payload.seat_class:
            raise ConflictError(f"Seat {payload.seat_number} is not in {payload.seat_class.value} class")
    else:
        physical_seat = None
    
    hold_expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.hold_expiry_minutes)
    hold = SeatHold(
        flight_id=payload.flight_id,
        seat_class=payload.seat_class,
        fare_type=payload.fare_type,
        passenger_count=actual_count,
        user_id=user.id if user else None,
        status=HoldStatus.HELD,
        hold_expires_at=hold_expires_at,
        itinerary_id=payload.itinerary_id
    )
    db.add(hold)
    await db.flush()
    
    if physical_seat:
        physical_seat.is_available = False
        physical_seat.hold_id = hold.id
        await db.flush()
        
    await db.refresh(hold)
    
    await create_audit_log(
        db=db, action=AuditAction.SEAT_HOLD_CREATED, entity_type="hold",
        entity_id=hold.id,
        actor_id=user.id if user else None,
        actor_role=user.role.value if user else "ANONYMOUS",
        new_data={"flight_id": str(payload.flight_id), "seat_class": payload.seat_class.value,
                  "passenger_count": actual_count, "expires_at": str(hold_expires_at)}
    )
    return hold

async def confirm_booking(
    db: AsyncSession,
    payload: BookingConfirmRequest,
    user: Optional[User] = None
) -> Booking:
    # Get hold
    result = await db.execute(
        select(SeatHold).where(SeatHold.id == payload.hold_id)
    )
    hold = result.scalar_one_or_none()
    if not hold:
        raise NotFoundError(f"Hold {payload.hold_id} not found")
    if hold.status != HoldStatus.HELD:
        raise ConflictError(f"Hold is no longer valid. Status: {hold.status.value}")
    if hold.hold_expires_at < datetime.now(timezone.utc):
        hold.status = HoldStatus.EXPIRED
        await release_hold_inventory(db, hold.flight_id, hold.seat_class, hold.passenger_count)
        raise ConflictError("Hold has expired. Please create a new hold.")
    
    # For multi-leg: verify all holds in the itinerary are valid
    if hold.itinerary_id:
        itin_holds_result = await db.execute(
            select(SeatHold).where(
                SeatHold.itinerary_id == hold.itinerary_id,
                SeatHold.status == HoldStatus.HELD
            )
        )
        itin_holds = itin_holds_result.scalars().all()
        expired_legs = [h for h in itin_holds if h.hold_expires_at < datetime.now(timezone.utc)]
        if expired_legs:
            # Release all legs
            for h in itin_holds:
                h.status = HoldStatus.EXPIRED
                await release_hold_inventory(db, h.flight_id, h.seat_class, h.passenger_count)
            raise ConflictError(
                "One or more itinerary legs have expired. Please restart booking."
            )
    
    # Verify passenger count matches
    if len(payload.passengers) != hold.passenger_count:
        raise ConflictError(
            f"Passenger count mismatch: hold has {hold.passenger_count}, "
            f"but {len(payload.passengers)} passengers provided."
        )
    
    # Get flight details for pricing
    flight_result = await db.execute(
        select(Flight).options(selectinload(Flight.seat_inventory))
        .where(Flight.id == hold.flight_id)
    )
    flight = flight_result.scalar_one()
    inv = next((s for s in flight.seat_inventory if s.seat_class == hold.seat_class), None)
    if not inv:
        raise ConflictError("Seat inventory not found")
    
    fare = inv.fare_basic if hold.fare_type.value == "BASIC" else inv.fare_flexible
    total_amount = fare * hold.passenger_count
    
    # Atomically confirm inventory (convert held → confirmed)
    success = await atomic_confirm_inventory(db, hold.flight_id, hold.seat_class, hold.passenger_count)
    if not success:
        raise InventoryError("Inventory confirmation failed. Please try again.")
    
    # Mark hold as confirmed
    hold.status = HoldStatus.CONFIRMED
    
    # Generate unique booking reference
    while True:
        ref = _generate_booking_reference()
        existing_ref = await db.execute(select(Booking).where(Booking.booking_reference == ref))
        if not existing_ref.scalar_one_or_none():
            break
    
    booking = Booking(
        booking_reference=ref,
        user_id=user.id if user else None,
        flight_id=hold.flight_id,
        seat_class=hold.seat_class,
        fare_type=hold.fare_type,
        total_amount=total_amount,
        currency=payload.currency,
        status=BookingStatus.CONFIRMED,
        cancellation_policy=payload.cancellation_policy,
        hold_id=hold.id,
        itinerary_id=hold.itinerary_id
    )
    db.add(booking)
    await db.flush()
    
    # Create passengers
    from app.models.physical_seat import FlightSeat
    passengers = []
    for p in payload.passengers:
        passenger = Passenger(
            booking_id=booking.id,
            name=p.name,
            email=p.email,
            passport_number=p.passport_number,
            date_of_birth=p.date_of_birth,
            status=PassengerStatus.CONFIRMED
        )
        db.add(passenger)
        passengers.append((p, passenger))
    
    await db.flush()
    
    # Assign physical seats if specified
    for p_input, passenger in passengers:
        if p_input.seat_number:
            if hold.fare_type.value == "BASIC":
                raise ConflictError("Seat choice is not allowed for BASIC fare")
                
            seat_result = await db.execute(
                select(FlightSeat).where(
                    FlightSeat.flight_id == hold.flight_id,
                    FlightSeat.seat_number == p_input.seat_number
                ).with_for_update()
            )
            physical_seat = seat_result.scalar_one_or_none()
            if not physical_seat:
                raise NotFoundError(f"Seat {p_input.seat_number} not found on this flight")
            if not physical_seat.is_available and physical_seat.hold_id != hold.id:
                raise ConflictError(f"Seat {p_input.seat_number} is already taken or held by someone else")
            if physical_seat.seat_class != hold.seat_class:
                raise ConflictError(f"Seat {p_input.seat_number} is not in {hold.seat_class.value} class")
                
            physical_seat.is_available = False
            physical_seat.hold_id = None
            physical_seat.passenger_id = passenger.id
            
    await db.flush()
    await db.refresh(booking)
    
    await create_audit_log(
        db=db, action=AuditAction.BOOKING_CONFIRMED, entity_type="booking",
        entity_id=booking.id,
        actor_id=user.id if user else None,
        actor_role=user.role.value if user else "ANONYMOUS",
        new_data={
            "booking_reference": ref,
            "flight_id": str(hold.flight_id),
            "seat_class": hold.seat_class.value,
            "fare_type": hold.fare_type.value,
            "total_amount": str(total_amount),
            "passenger_count": hold.passenger_count
        }
    )
    
    # Send confirmation email to first passenger
    if payload.passengers:
        first_passenger = payload.passengers[0]
        passenger_names = [p.name for p in payload.passengers]
        await send_booking_confirmation(
            to_email=first_passenger.email,
            booking_reference=ref,
            flight_number=flight.flight_number,
            origin=flight.origin,
            destination=flight.destination,
            departure_at=str(flight.departure_at),
            seat_class=hold.seat_class.value,
            fare_type=hold.fare_type.value,
            total_amount=str(total_amount),
            currency=payload.currency,
            passenger_names=passenger_names
        )
    
    return booking

async def cancel_booking(
    db: AsyncSession,
    booking_reference: str,
    payload: BookingCancelRequest,
    actor: Optional[User] = None
) -> dict:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers), selectinload(Booking.flight))
        .where(Booking.booking_reference == booking_reference)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError(f"Booking {booking_reference} not found")
    if booking.status == BookingStatus.CANCELLED:
        raise ConflictError("Booking is already cancelled")
    
    now = datetime.now(timezone.utc)
    
    # Determine which passengers to cancel
    if payload.passenger_ids:
        # Partial cancellation
        passengers_to_cancel = [
            p for p in booking.passengers
            if p.id in payload.passenger_ids and p.status == PassengerStatus.CONFIRMED
        ]
        if not passengers_to_cancel:
            raise NotFoundError("No valid passengers found for cancellation")
        is_partial = len(passengers_to_cancel) < len([
            p for p in booking.passengers if p.status == PassengerStatus.CONFIRMED
        ])
    else:
        # Cancel all
        passengers_to_cancel = [
            p for p in booking.passengers if p.status == PassengerStatus.CONFIRMED
        ]
        is_partial = False
    
    cancelled_count = len(passengers_to_cancel)
    fare = booking.total_amount / len([p for p in booking.passengers if p.status == PassengerStatus.CONFIRMED])
    refund_amount = fare * cancelled_count
    
    # Determine refund type
    refund_type = RefundType.NONE
    credit_expires_at = None
    
    if booking.cancellation_policy == CancellationPolicy.REFUNDABLE:
        refund_type = RefundType.CASH
    elif booking.cancellation_policy == CancellationPolicy.CREDIT_ONLY:
        refund_type = RefundType.TRAVEL_CREDIT
    
    # Cancel passengers
    cancelled_ids = []
    for passenger in passengers_to_cancel:
        passenger.status = PassengerStatus.CANCELLED
        passenger.cancelled_at = now
        passenger.refund_amount = float(fare) if refund_type != RefundType.NONE else 0
        cancelled_ids.append(passenger.id)
    
    # Release inventory
    await release_confirmed_inventory(
        db, booking.flight_id, booking.seat_class, cancelled_count
    )
    
    # Create refund/credit record
    if refund_type == RefundType.CASH:
        refund_record = Refund(
            booking_id=booking.id,
            refund_type=RefundType.CASH,
            amount=refund_amount,
            currency=booking.currency,
            status=RefundStatus.PENDING,
            reason=payload.reason
        )
        db.add(refund_record)
    elif refund_type == RefundType.TRAVEL_CREDIT:
        credit_expires_at = now + timedelta(days=settings.travel_credit_expiry_days)
        credit_record = TravelCredit(
            user_id=booking.user_id,
            booking_id=booking.id,
            amount=refund_amount,
            currency=booking.currency,
            expires_at=credit_expires_at
        )
        db.add(credit_record)
    
    # Update booking status
    if not is_partial:
        booking.status = BookingStatus.CANCELLED
        booking.cancelled_at = now
    
    await db.flush()
    
    await create_audit_log(
        db=db, action=AuditAction.BOOKING_CANCELLED, entity_type="booking",
        entity_id=booking.id,
        actor_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else "SYSTEM",
        new_data={
            "cancelled_passengers": [str(i) for i in cancelled_ids],
            "refund_type": refund_type.value,
            "refund_amount": str(refund_amount),
            "is_partial": is_partial
        },
        reason=payload.reason
    )
    
    # Send cancellation email
    if booking.passengers:
        first_passenger = next(
            (p for p in booking.passengers if p.email), None
        )
        if first_passenger:
            await send_cancellation_receipt(
                to_email=first_passenger.email,
                booking_reference=booking_reference,
                refund_type=refund_type.value,
                refund_amount=str(refund_amount),
                currency=booking.currency,
                credit_expires_at=str(credit_expires_at) if credit_expires_at else None
            )
    
    return {
        "booking_reference": booking_reference,
        "cancelled_passengers": cancelled_ids,
        "refund_type": refund_type,
        "refund_amount": refund_amount,
        "credit_expires_at": credit_expires_at,
        "message": "Cancellation processed successfully"
    }

async def get_booking(
    db: AsyncSession, booking_reference: str, user: Optional[User] = None
) -> Booking:
    result = await db.execute(
        select(Booking)
        .options(selectinload(Booking.passengers))
        .where(Booking.booking_reference == booking_reference)
    )
    booking = result.scalar_one_or_none()
    if not booking:
        raise NotFoundError(f"Booking {booking_reference} not found")
    # Non-admin users can only see their own bookings
    if user and user.role.value == "PASSENGER" and booking.user_id != user.id:
        raise NotFoundError(f"Booking {booking_reference} not found")
    return booking

async def release_hold(
    db: AsyncSession,
    hold_id: UUID,
    actor: Optional[User] = None
) -> dict:
    from app.models.physical_seat import FlightSeat
    
    result = await db.execute(
        select(SeatHold).where(SeatHold.id == hold_id).with_for_update()
    )
    hold = result.scalar_one_or_none()
    
    if not hold:
        raise NotFoundError(f"Hold {hold_id} not found")
        
    if hold.status != HoldStatus.HELD:
        raise ConflictError(f"Cannot release hold. Current status: {hold.status.value}")
        
    # Mark hold as released
    hold.status = HoldStatus.RELEASED
    
    # Safely restore inventory
    await release_hold_inventory(db, hold.flight_id, hold.seat_class, hold.passenger_count)
    
    # Release any physical seats assigned
    seats_result = await db.execute(
        select(FlightSeat).where(FlightSeat.hold_id == hold_id).with_for_update()
    )
    for seat in seats_result.scalars().all():
        seat.hold_id = None
        seat.is_available = True
        
    await db.flush()
    
    await create_audit_log(
        db=db, action=AuditAction.SEAT_HOLD_RELEASED, entity_type="hold",
        entity_id=hold.id,
        actor_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else "SYSTEM",
        new_data={"status": "RELEASED", "flight_id": str(hold.flight_id)}
    )
    
    return {"message": "Hold released successfully"}
