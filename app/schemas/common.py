from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    OPS_AGENT = "OPS_AGENT"
    PASSENGER = "PASSENGER"

class FlightStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    DELAYED = "DELAYED"
    DEPARTED = "DEPARTED"
    ARRIVED = "ARRIVED"
    CANCELLED = "CANCELLED"

class SeatClass(str, Enum):
    FIRST = "FIRST"
    BUSINESS = "BUSINESS"
    ECONOMY = "ECONOMY"

class OverbookingPolicy(str, Enum):
    HARD_NEVER_OVERSELL = "HARD_NEVER_OVERSELL"
    BUFFER_ALLOWED = "BUFFER_ALLOWED"

class GroupBookingPolicy(str, Enum):
    FULL_FAIL = "FULL_FAIL"
    PARTIAL_HOLD = "PARTIAL_HOLD"
    WAITLIST = "WAITLIST"

class FareType(str, Enum):
    BASIC = "BASIC"
    FLEXIBLE = "FLEXIBLE"

class HoldStatus(str, Enum):
    HELD = "HELD"
    EXPIRED = "EXPIRED"
    CONFIRMED = "CONFIRMED"
    RELEASED = "RELEASED"

class BookingStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    REBOOKING_PENDING = "REBOOKING_PENDING"

class CancellationPolicy(str, Enum):
    REFUNDABLE = "REFUNDABLE"
    CREDIT_ONLY = "CREDIT_ONLY"
    NON_REFUNDABLE = "NON_REFUNDABLE"

class FlightCancellationOutcome(str, Enum):
    REFUND = "REFUND"
    REBOOK = "REBOOK"
    TRAVEL_CREDIT = "TRAVEL_CREDIT"

class PassengerStatus(str, Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"

class WaitlistStatus(str, Enum):
    WAITING = "WAITING"
    PROMOTED = "PROMOTED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class LoyaltyTier(str, Enum):
    NONE = "NONE"
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"

class RefundType(str, Enum):
    CASH = "CASH"
    TRAVEL_CREDIT = "TRAVEL_CREDIT"
    NONE = "NONE"

class RefundStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"

class MoneyAmount(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    amount: Decimal
    currency: str = 'USD'
    locale: str = 'en-US'

class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)

class ErrorResponse(BaseModel):
    detail: str

class SuccessResponse(BaseModel):
    message: str
