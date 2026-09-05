from pydantic import BaseModel, EmailStr, Field, ConfigDict
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from .common import SeatClass, FareType, BookingStatus, CancellationPolicy, FlightCancellationOutcome, PassengerStatus, RefundType

class PassengerInput(BaseModel):
    name: str
    email: EmailStr
    passport_number: str | None = None
    date_of_birth: date | None = None
    seat_number: str | None = None

class BookingConfirmRequest(BaseModel):
    hold_id: UUID
    passengers: list[PassengerInput] = Field(min_length=1)
    cancellation_policy: CancellationPolicy
    currency: str = 'USD'

class PassengerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    email: EmailStr
    status: PassengerStatus
    seat_number: str | None = None
    cancelled_at: datetime | None = None
    refund_amount: Decimal | None = None

class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    booking_reference: str
    flight_id: UUID
    seat_class: SeatClass
    fare_type: FareType
    total_amount: Decimal
    currency: str
    status: BookingStatus
    cancellation_policy: CancellationPolicy
    hold_id: UUID
    itinerary_id: UUID | None = None
    airline_initiated: bool
    flight_cancellation_outcome: FlightCancellationOutcome | None = None
    passengers: list[PassengerResponse]
    created_at: datetime
    cancelled_at: datetime | None = None

class BookingCancelRequest(BaseModel):
    passenger_ids: list[UUID] | None = None
    reason: str | None = None

class BookingCancelResponse(BaseModel):
    booking_reference: str
    cancelled_passengers: list[UUID]
    refund_type: RefundType
    refund_amount: Decimal
    credit_expires_at: datetime | None = None
    message: str
