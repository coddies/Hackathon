from pydantic import BaseModel, Field, model_validator, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Self
from .common import SeatClass, OverbookingPolicy, GroupBookingPolicy, FlightStatus

class SeatClassInput(BaseModel):
    seat_class: SeatClass
    total_seats: int = Field(gt=0)
    fare_basic: Decimal = Field(gt=0)
    fare_flexible: Decimal = Field(gt=0)
    overbooking_policy: OverbookingPolicy = OverbookingPolicy.HARD_NEVER_OVERSELL
    overbooking_buffer: int = Field(default=0, ge=0)
    booking_cutoff_hours: int = Field(default=3, ge=0)
    group_booking_policy: GroupBookingPolicy = GroupBookingPolicy.FULL_FAIL

class FlightCreateRequest(BaseModel):
    flight_number: str = Field(pattern=r'^[A-Z0-9\-]{2,10}$')
    origin: str = Field(min_length=3, max_length=3)
    destination: str = Field(min_length=3, max_length=3)
    departure_at: datetime
    arrival_at: datetime
    aircraft_capacity: int = Field(gt=0)
    seat_classes: list[SeatClassInput] = Field(min_length=1)

    @model_validator(mode='after')
    def validate_flight(self) -> Self:
        if self.origin:
            self.origin = self.origin.upper()
        if self.destination:
            self.destination = self.destination.upper()
        if self.origin and self.destination and self.origin == self.destination:
            raise ValueError("origin must differ from destination")
        if self.departure_at and self.arrival_at and self.departure_at >= self.arrival_at:
            raise ValueError("departure_at must be before arrival_at")
        if self.seat_classes and self.aircraft_capacity:
            if sum(sc.total_seats for sc in self.seat_classes) != self.aircraft_capacity:
                raise ValueError("sum of seat class total_seats must equal aircraft_capacity")
        return self

class FlightUpdateRequest(BaseModel):
    origin: str | None = Field(default=None, min_length=3, max_length=3)
    destination: str | None = Field(default=None, min_length=3, max_length=3)
    departure_at: datetime | None = None
    arrival_at: datetime | None = None
    seat_classes: list[SeatClassInput] | None = None
    
    # Schedule change properties
    rebooking_rule: str = "NONE"  # Literal["AUTO_REBOOK", "NOTIFY_ONLY", "NONE"]
    fare_policy_override: bool = False
    override_reason: str | None = None

    @model_validator(mode='after')
    def validate_update(self) -> Self:
        if self.origin:
            self.origin = self.origin.upper()
        if self.destination:
            self.destination = self.destination.upper()
        if self.origin and self.destination and self.origin == self.destination:
            raise ValueError("origin must differ from destination")
        if self.departure_at and self.arrival_at and self.departure_at >= self.arrival_at:
            raise ValueError("departure_at must be before arrival_at")
        return self

class SeatInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    flight_id: UUID
    seat_class: SeatClass
    total_seats: int
    available_seats: int
    held_seats: int
    overbooking_policy: OverbookingPolicy
    overbooking_buffer: int
    fare_basic: Decimal
    fare_flexible: Decimal
    booking_cutoff_hours: int
    group_booking_policy: GroupBookingPolicy
    fare_amount: dict

class FlightResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    flight_number: str
    origin: str
    destination: str
    departure_at: datetime
    arrival_at: datetime
    aircraft_capacity: int
    status: FlightStatus
    seat_inventory: list[SeatInventoryResponse]
    created_at: datetime

class FlightSearchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    flight_number: str
    origin: str
    destination: str
    departure_at: datetime
    arrival_at: datetime
    status: FlightStatus
    available_classes: list[SeatInventoryResponse]
    currency: str = 'USD'
    locale: str = 'en-US'

class FlightCancelRequest(BaseModel):
    reason: str | None = None
