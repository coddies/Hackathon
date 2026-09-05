from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID
from datetime import datetime
from .common import SeatClass, FareType, HoldStatus

class SeatHoldRequest(BaseModel):
    flight_id: UUID
    seat_class: SeatClass
    passenger_count: int = Field(gt=0)
    fare_type: FareType
    seat_number: str | None = None
    itinerary_id: UUID | None = None

class SeatHoldResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    flight_id: UUID
    seat_class: SeatClass
    fare_type: FareType
    passenger_count: int
    status: HoldStatus
    hold_started_at: datetime
    hold_expires_at: datetime
    itinerary_id: UUID | None = None
