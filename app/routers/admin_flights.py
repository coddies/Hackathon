from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.database import get_db
from app.models.flight import Flight, FlightStatus
from app.models.user import User
from app.schemas.flight import FlightCreateRequest, FlightUpdateRequest, FlightResponse, FlightCancelRequest
from app.services.flight_service import create_flight, update_flight, cancel_flight, get_flight
from app.dependencies.auth import require_admin, require_super_admin
from app.dependencies.idempotency import get_idempotency_key
from app.services.idempotency_service import check_idempotency, store_idempotency_result

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/flights", response_model=FlightResponse, status_code=status.HTTP_201_CREATED)
async def create_new_flight(
    request: FlightCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    idempotency_key: str | None = Depends(get_idempotency_key)
):
    if idempotency_key:
        cached = await check_idempotency(db, idempotency_key, "/admin/flights", request.model_dump())
        if cached:
            return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    result = await create_flight(db, request, current_user)
    
    if idempotency_key:
        result_dict = result.model_dump(mode='json') if hasattr(result, 'model_dump') else result
        await store_idempotency_result(db, idempotency_key, "/admin/flights", request.model_dump(), 201, result_dict)
        
    return result

@router.put("/flights/{flight_id}", response_model=FlightResponse)
async def edit_flight(
    flight_id: UUID,
    request: FlightUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await update_flight(db, flight_id, request, current_user)

@router.put("/flights/{flight_id}/schedule", response_model=FlightResponse)
async def edit_flight_schedule(
    flight_id: UUID,
    request: FlightUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin)
):
    from app.services.flight_service import update_flight_schedule
    return await update_flight_schedule(db, flight_id, request, current_user)

@router.post("/flights/{flight_id}/cancel", response_model=FlightResponse)
async def cancel_existing_flight(
    flight_id: UUID,
    request: FlightCancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
    idempotency_key: str | None = Depends(get_idempotency_key)
):
    if idempotency_key:
        cached = await check_idempotency(db, idempotency_key, f"/admin/flights/{flight_id}/cancel", request.model_dump())
        if cached:
            return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    result = await cancel_flight(db, flight_id, request, current_user)
    
    if idempotency_key:
        result_dict = result.model_dump(mode='json') if hasattr(result, 'model_dump') else result
        await store_idempotency_result(db, idempotency_key, f"/admin/flights/{flight_id}/cancel", request.model_dump(), 200, result_dict)
        
    return result

@router.get("/flights/{flight_id}", response_model=FlightResponse)
async def get_flight_details(
    flight_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    return await get_flight(db, flight_id)

@router.get("/flights", response_model=list[FlightResponse])
async def list_flights(
    status: FlightStatus | None = Query(None),
    origin: str | None = Query(None),
    destination: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    stmt = select(Flight).options(selectinload(Flight.seat_inventory))
    if status:
        stmt = stmt.where(Flight.status == status)
    if origin:
        stmt = stmt.where(Flight.origin == origin)
    if destination:
        stmt = stmt.where(Flight.destination == destination)
    
    result = await db.execute(stmt)
    flights = result.scalars().all()
    return flights
