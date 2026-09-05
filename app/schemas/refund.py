from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from .common import RefundType, RefundStatus

class RefundResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    booking_id: UUID
    passenger_id: UUID
    refund_type: RefundType
    amount: Decimal
    currency: str
    status: RefundStatus
    reason: str | None = None
    created_at: datetime
    processed_at: datetime | None = None

class TravelCreditResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    user_id: UUID
    booking_id: UUID
    amount: Decimal
    currency: str
    expires_at: datetime
    is_used: bool
    used_at: datetime | None = None
    created_at: datetime
