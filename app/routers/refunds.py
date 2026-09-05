from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.schemas.refund import RefundResponse, TravelCreditResponse
from app.services.refund_service import get_refunds_for_booking, get_travel_credits_for_booking

router = APIRouter(prefix="/refunds", tags=["Refunds"])

@router.get("/{booking_reference}")
async def get_booking_refunds(
    booking_reference: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    refunds = await get_refunds_for_booking(db, booking_reference)
    travel_credits = await get_travel_credits_for_booking(db, booking_reference)
    
    return {
        "booking_reference": booking_reference,
        "refunds": refunds,
        "travel_credits": travel_credits
    }
