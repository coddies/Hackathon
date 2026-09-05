from pydantic import BaseModel, ConfigDict
from uuid import UUID
from app.models.flight import SeatClass

class FlightSeatResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    seat_number: str
    seat_class: SeatClass
    is_available: bool
    hold_id: UUID | None = None
    passenger_id: UUID | None = None

class SeatMapResponse(BaseModel):
    flight_id: UUID
    flight_number: str
    seat_classes: dict[SeatClass, list[FlightSeatResponse]]
