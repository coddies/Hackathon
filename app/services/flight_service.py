from datetime import datetime, timezone, date
from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from app.models.flight import Flight, SeatInventory, SeatClass, FlightStatus
from app.models.booking import Booking, BookingStatus, FlightCancellationOutcome, CancellationPolicy
from app.models.hold import SeatHold, HoldStatus
from app.models.refund import Refund, TravelCredit, RefundType, RefundStatus
from app.models.user import User
from app.schemas.flight import FlightCreateRequest, FlightUpdateRequest
from app.exceptions.handlers import NotFoundError, ConflictError, ValidationFailedError
from app.services.audit_service import create_audit_log, AuditAction
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

async def create_flight(
    db: AsyncSession,
    payload: FlightCreateRequest,
    actor: User
) -> Flight:
    # Check duplicate flight number for same route and date
    dep_date = payload.departure_at.date() if hasattr(payload.departure_at, 'date') else payload.departure_at
    
    result = await db.execute(
        select(Flight).where(
            Flight.flight_number == payload.flight_number,
            Flight.origin == payload.origin,
            Flight.destination == payload.destination,
            func.date(Flight.departure_at) == dep_date
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise ConflictError(
            f"Flight {payload.flight_number} already exists for route "
            f"{payload.origin}-{payload.destination} on {dep_date}"
        )
    
    # Create flight
    flight = Flight(
        flight_number=payload.flight_number,
        origin=payload.origin.upper(),
        destination=payload.destination.upper(),
        departure_at=payload.departure_at,
        arrival_at=payload.arrival_at,
        aircraft_capacity=payload.aircraft_capacity,
        status=FlightStatus.SCHEDULED,
        created_by=actor.id
    )
    db.add(flight)
    await db.flush()  # get flight.id
    
    # Create seat inventory for each class
    for sc in payload.seat_classes:
        inventory = SeatInventory(
            flight_id=flight.id,
            seat_class=sc.seat_class,
            total_seats=sc.total_seats,
            available_seats=sc.total_seats,
            held_seats=0,
            overbooking_policy=sc.overbooking_policy,
            overbooking_buffer=sc.overbooking_buffer,
            fare_basic=sc.fare_basic,
            fare_flexible=sc.fare_flexible,
            booking_cutoff_hours=sc.booking_cutoff_hours,
            group_booking_policy=sc.group_booking_policy
        )
        db.add(inventory)
    
    await db.flush()
    
    await create_audit_log(
        db=db,
        action=AuditAction.ADMIN_CREATED_FLIGHT,
        entity_type="flight",
        entity_id=flight.id,
        actor_id=actor.id,
        actor_role=actor.role.value,
        new_data={"flight_number": flight.flight_number, "origin": flight.origin,
                  "destination": flight.destination, "departure_at": str(flight.departure_at)}
    )
    
    # Reload with relationships
    result = await db.execute(
        select(Flight).options(selectinload(Flight.seat_inventory)).where(Flight.id == flight.id)
    )
    return result.scalar_one()

async def get_flight(db: AsyncSession, flight_id: UUID) -> Flight:
    result = await db.execute(
        select(Flight).options(selectinload(Flight.seat_inventory)).where(Flight.id == flight_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise NotFoundError(f"Flight {flight_id} not found")
    return flight

async def update_flight(
    db: AsyncSession,
    flight_id: UUID,
    payload: FlightUpdateRequest,
    actor: User
) -> Flight:
    result = await db.execute(
        select(Flight).options(selectinload(Flight.seat_inventory)).where(Flight.id == flight_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise NotFoundError(f"Flight {flight_id} not found")
    if flight.status == FlightStatus.CANCELLED:
        raise ConflictError("Cannot edit a cancelled flight")
    
    old_data = {
        "origin": flight.origin, "destination": flight.destination,
        "departure_at": str(flight.departure_at), "arrival_at": str(flight.arrival_at)
    }
    
    if payload.origin:
        flight.origin = payload.origin.upper()
    if payload.destination:
        flight.destination = payload.destination.upper()
    if payload.departure_at:
        flight.departure_at = payload.departure_at
    if payload.arrival_at:
        flight.arrival_at = payload.arrival_at
    
    # Update seat allocations if provided
    if payload.seat_classes:
        for sc_update in payload.seat_classes:
            inv_result = await db.execute(
                select(SeatInventory).where(
                    SeatInventory.flight_id == flight_id,
                    SeatInventory.seat_class == sc_update.seat_class
                ).with_for_update()
            )
            inv = inv_result.scalar_one_or_none()
            if inv:
                # Count confirmed+held bookings
                booked_result = await db.execute(
                    select(func.count(Booking.id)).where(
                        Booking.flight_id == flight_id,
                        Booking.seat_class == sc_update.seat_class,
                        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.REBOOKING_PENDING])
                    )
                )
                booked_count = booked_result.scalar() or 0
                held_result = await db.execute(
                    select(func.sum(SeatHold.passenger_count)).where(
                        SeatHold.flight_id == flight_id,
                        SeatHold.seat_class == sc_update.seat_class,
                        SeatHold.status == HoldStatus.HELD
                    )
                )
                held_count = held_result.scalar() or 0
                min_required = booked_count + held_count
                if sc_update.total_seats < min_required:
                    raise ConflictError(
                        f"Cannot reduce {sc_update.seat_class.value} capacity to {sc_update.total_seats}. "
                        f"Currently {booked_count} confirmed + {held_count} held = {min_required} minimum."
                    )
                diff = sc_update.total_seats - inv.total_seats
                inv.total_seats = sc_update.total_seats
                inv.available_seats = max(0, inv.available_seats + diff)
                inv.fare_basic = sc_update.fare_basic
                inv.fare_flexible = sc_update.fare_flexible
    
    await db.flush()
    new_data = {
        "origin": flight.origin, "destination": flight.destination,
        "departure_at": str(flight.departure_at), "arrival_at": str(flight.arrival_at)
    }
    await create_audit_log(
        db=db, action=AuditAction.ADMIN_EDITED_FLIGHT, entity_type="flight",
        entity_id=flight.id, actor_id=actor.id, actor_role=actor.role.value,
        old_data=old_data, new_data=new_data
    )
    return flight

async def cancel_flight(
    db: AsyncSession, flight_id: UUID, actor: User, reason: Optional[str] = None
) -> Flight:
    result = await db.execute(
        select(Flight).options(selectinload(Flight.seat_inventory)).where(Flight.id == flight_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise NotFoundError(f"Flight {flight_id} not found")
    if flight.status == FlightStatus.CANCELLED:
        raise ConflictError("Flight is already cancelled")
    
    flight.status = FlightStatus.CANCELLED
    
    # Process all confirmed bookings
    bookings_result = await db.execute(
        select(Booking).where(
            Booking.flight_id == flight_id,
            Booking.status == BookingStatus.CONFIRMED
        )
    )
    bookings = bookings_result.scalars().all()
    
    for booking in bookings:
        # Determine outcome based on cancellation policy
        if booking.cancellation_policy == CancellationPolicy.REFUNDABLE:
            outcome = FlightCancellationOutcome.REFUND
            refund = Refund(
                booking_id=booking.id,
                refund_type=RefundType.CASH,
                amount=booking.total_amount,
                currency=booking.currency,
                status=RefundStatus.PENDING,
                reason=f"Flight {flight.flight_number} cancelled by airline"
            )
            db.add(refund)
        elif booking.cancellation_policy == CancellationPolicy.CREDIT_ONLY:
            outcome = FlightCancellationOutcome.TRAVEL_CREDIT
            from datetime import timedelta
            credit = TravelCredit(
                user_id=booking.user_id,
                booking_id=booking.id,
                amount=booking.total_amount,
                currency=booking.currency,
                expires_at=datetime.now(timezone.utc) + timedelta(days=settings.travel_credit_expiry_days)
            )
            db.add(credit)
        else:
            # NON_REFUNDABLE but airline-initiated — still issue credit as policy override
            outcome = FlightCancellationOutcome.TRAVEL_CREDIT
            from datetime import timedelta
            credit = TravelCredit(
                user_id=booking.user_id,
                booking_id=booking.id,
                amount=booking.total_amount,
                currency=booking.currency,
                expires_at=datetime.now(timezone.utc) + timedelta(days=settings.travel_credit_expiry_days)
            )
            db.add(credit)
        
        booking.status = BookingStatus.CANCELLED
        booking.airline_initiated = True
        booking.flight_cancellation_outcome = outcome
        booking.cancelled_at = datetime.now(timezone.utc)
        
        await create_audit_log(
            db=db, action=AuditAction.FLIGHT_CANCELLATION_OUTCOME_STORED,
            entity_type="booking", entity_id=booking.id,
            actor_id=actor.id, actor_role=actor.role.value,
            new_data={"outcome": outcome.value, "flight_id": str(flight_id)},
            reason=reason
        )
    
    # Expire all HELD holds for this flight
    holds_result = await db.execute(
        select(SeatHold).where(
            SeatHold.flight_id == flight_id,
            SeatHold.status == HoldStatus.HELD
        )
    )
    for hold in holds_result.scalars().all():
        hold.status = HoldStatus.RELEASED
    
    await db.flush()
    
    await create_audit_log(
        db=db, action=AuditAction.ADMIN_CANCELLED_FLIGHT, entity_type="flight",
        entity_id=flight.id, actor_id=actor.id, actor_role=actor.role.value,
        new_data={"status": "CANCELLED", "affected_bookings": len(bookings)},
        reason=reason
    )
    return flight

async def search_flights(
    db: AsyncSession,
    origin: str,
    destination: str,
    departure_date: date,
    passengers: int = 1,
    currency: str = "USD",
    locale: str = "en-US"
) -> list[Flight]:
    result = await db.execute(
        select(Flight)
        .options(selectinload(Flight.seat_inventory))
        .where(
            Flight.origin == origin.upper(),
            Flight.destination == destination.upper(),
            func.date(Flight.departure_at) == departure_date,
            Flight.status != FlightStatus.CANCELLED
        )
    )
    flights = result.scalars().all()
    return flights

async def update_flight_schedule(
    db: AsyncSession, flight_id: UUID, payload: FlightUpdateRequest, actor: User
) -> Flight:
    from app.models.schedule_change import ScheduleChange, RebookingRule
    
    result = await db.execute(
        select(Flight).options(selectinload(Flight.seat_inventory)).where(Flight.id == flight_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        raise NotFoundError(f"Flight {flight_id} not found")
        
    old_dep = flight.departure_at
    old_arr = flight.arrival_at
    old_orig = flight.origin
    old_dest = flight.destination
    
    # Update flight
    if payload.departure_at:
        flight.departure_at = payload.departure_at
    if payload.arrival_at:
        flight.arrival_at = payload.arrival_at
    if payload.origin:
        flight.origin = payload.origin
    if payload.destination:
        flight.destination = payload.destination
        
    # Find affected bookings
    bookings_result = await db.execute(
        select(Booking).where(
            Booking.flight_id == flight_id,
            Booking.status == BookingStatus.CONFIRMED
        )
    )
    bookings = bookings_result.scalars().all()
    
    schedule_change = ScheduleChange(
        flight_id=flight_id,
        changed_by=actor.id,
        old_departure_at=old_dep,
        new_departure_at=flight.departure_at,
        old_arrival_at=old_arr,
        new_arrival_at=flight.arrival_at,
        old_origin=old_orig,
        new_origin=flight.origin,
        old_destination=old_dest,
        new_destination=flight.destination,
        rebooking_rule=RebookingRule(payload.rebooking_rule) if hasattr(RebookingRule, payload.rebooking_rule) else RebookingRule.NONE,
        fare_policy_override=payload.fare_policy_override,
        override_reason=payload.override_reason,
        affected_bookings_count=len(bookings)
    )
    db.add(schedule_change)
    await db.flush()
    
    # Process bookings
    from app.models.refund import RefundStatus
    for booking in bookings:
        outcome = FlightCancellationOutcome.REBOOK
        
        # If origin/dest changed, or significant time change, maybe refund
        if payload.fare_policy_override:
            outcome = FlightCancellationOutcome.REFUND
            refund = Refund(
                booking_id=booking.id,
                refund_type=RefundType.CASH,
                amount=booking.total_amount,
                currency=booking.currency,
                status=RefundStatus.PENDING,
                reason=f"Schedule change on {flight.flight_number}: {payload.override_reason}"
            )
            db.add(refund)
            booking.status = BookingStatus.CANCELLED
            booking.cancelled_at = datetime.now(timezone.utc)
            
        booking.airline_initiated = True
        booking.flight_cancellation_outcome = outcome
        
        await create_audit_log(
            db=db, action=AuditAction.FLIGHT_CANCELLATION_OUTCOME_STORED,
            entity_type="booking", entity_id=booking.id,
            actor_id=actor.id, actor_role=actor.role.value,
            new_data={"outcome": outcome.value, "schedule_change_id": str(schedule_change.id)},
            reason="Airline schedule change"
        )
        
    await create_audit_log(
        db=db, action=AuditAction.ADMIN_EDITED_FLIGHT, entity_type="flight",
        entity_id=flight.id, actor_id=actor.id, actor_role=actor.role.value,
        old_data={"departure_at": str(old_dep), "arrival_at": str(old_arr)},
        new_data={"departure_at": str(flight.departure_at), "arrival_at": str(flight.arrival_at)}
    )
    
    await db.flush()
    return flight

async def get_seat_map(db: AsyncSession, flight_id: UUID) -> Optional[dict]:
    from app.models.physical_seat import FlightSeat
    
    result = await db.execute(
        select(Flight).where(Flight.id == flight_id)
    )
    flight = result.scalar_one_or_none()
    if not flight:
        return None
        
    seats_result = await db.execute(
        select(FlightSeat).where(FlightSeat.flight_id == flight_id)
    )
    seats = seats_result.scalars().all()
    
    seat_classes = {}
    for seat in seats:
        sc = seat.seat_class
        if sc not in seat_classes:
            seat_classes[sc] = []
        seat_classes[sc].append({
            "id": seat.id,
            "seat_number": seat.seat_number,
            "seat_class": seat.seat_class,
            "is_available": seat.is_available,
            "hold_id": seat.hold_id,
            "passenger_id": seat.passenger_id
        })
        
    return {
        "flight_id": flight.id,
        "flight_number": flight.flight_number,
        "seat_classes": seat_classes
    }
