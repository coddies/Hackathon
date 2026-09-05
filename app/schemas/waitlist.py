from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID
from datetime import datetime
from .common import SeatClass, LoyaltyTier, FareType, WaitlistStatus

class WaitlistJoinRequest(BaseModel):
    flight_id: UUID
    seat_class: SeatClass
    passenger_name: str
    email: EmailStr
    loyalty_tier: LoyaltyTier = LoyaltyTier.NONE
    fare_type: FareType

class WaitlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    flight_id: UUID
    seat_class: SeatClass
    passenger_name: str
    email: EmailStr
    loyalty_tier: LoyaltyTier
    fare_type: FareType
    status: WaitlistStatus
    priority_score: int
    loyalty_rank: int
    fare_type_rank: int
    position: int
    created_at: datetime
