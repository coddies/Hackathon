from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.hold import SeatHoldRequest, SeatHoldResponse
from app.schemas.booking import BookingConfirmRequest, BookingResponse, BookingCancelRequest, BookingCancelResponse
from app.services.booking_service import create_hold, confirm_booking, cancel_booking, get_booking
from app.dependencies.auth import get_current_user, get_current_user_optional
from app.dependencies.idempotency import require_idempotency_key
from app.services.idempotency_service import check_idempotency, store_idempotency_result

router = APIRouter(prefix="/bookings", tags=["Bookings"])

@router.post("/hold", response_model=SeatHoldResponse, status_code=status.HTTP_201_CREATED)
async def hold_seats(
    request: SeatHoldRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    idempotency_key: str = Depends(require_idempotency_key)
):
    cached = await check_idempotency(db, idempotency_key, "/bookings/hold", request.model_dump())
    if cached:
        return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    result = await create_hold(db, request, current_user)
    
    result_pydantic = SeatHoldResponse.model_validate(result)
    result_dict = jsonable_encoder(result_pydantic)
    await store_idempotency_result(db, idempotency_key, "/bookings/hold", request.model_dump(), 201, result_dict)
    
    return result

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def confirm_flight_booking(
    request: BookingConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    idempotency_key: str = Depends(require_idempotency_key)
):
    cached = await check_idempotency(db, idempotency_key, "/bookings", request.model_dump())
    if cached:
        return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    result = await confirm_booking(db, request, current_user)
    
    result_pydantic = BookingResponse.model_validate(result)
    result_dict = jsonable_encoder(result_pydantic)
    await store_idempotency_result(db, idempotency_key, "/bookings", request.model_dump(), 201, result_dict)
    
    return result

@router.get("/{booking_reference}", response_model=BookingResponse)
async def get_booking_details(
    booking_reference: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await get_booking(db, booking_reference, current_user)

@router.post("/{booking_reference}/cancel", response_model=BookingCancelResponse)
async def cancel_existing_booking(
    booking_reference: str,
    request: BookingCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    idempotency_key: str = Depends(require_idempotency_key)
):
    cached = await check_idempotency(db, idempotency_key, f"/bookings/{booking_reference}/cancel", request.model_dump())
    if cached:
        return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    result = await cancel_booking(db, booking_reference, request, current_user)
    
    result_pydantic = BookingCancelResponse.model_validate(result)
    result_dict = jsonable_encoder(result_pydantic)
    await store_idempotency_result(db, idempotency_key, f"/bookings/{booking_reference}/cancel", request.model_dump(), 200, result_dict)
    
    return result

@router.post("/hold/{hold_id}/release")
async def release_seat_hold(
    hold_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    idempotency_key: str = Depends(require_idempotency_key)
):
    cached = await check_idempotency(db, idempotency_key, f"/bookings/hold/{hold_id}/release", {})
    if cached:
        return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    from app.services.booking_service import release_hold
    result = await release_hold(db, hold_id, current_user)
    
    await store_idempotency_result(db, idempotency_key, f"/bookings/hold/{hold_id}/release", {}, 200, result)
    
    return result
