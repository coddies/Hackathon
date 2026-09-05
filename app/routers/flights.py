from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
from uuid import UUID

from app.database import get_db
from app.schemas.flight import FlightSearchResponse
from app.schemas.seat_map import SeatMapResponse, FlightSeatResponse
from app.services.flight_service import search_flights, get_seat_map

router = APIRouter(prefix="/flights", tags=["Flights"])

@router.get("/search", response_model=list[FlightSearchResponse])
async def search_for_flights(
    origin: str = Query(..., description="Origin airport code"),
    destination: str = Query(..., description="Destination airport code"),
    date: date = Query(..., description="Date of departure"),
    passengers: int = Query(1, description="Number of passengers"),
    currency: str = Query("USD", description="Currency for pricing"),
    locale: str = Query("en-US", description="Locale for display"),
    db: AsyncSession = Depends(get_db)
):
    flights = await search_flights(db, origin, destination, date, passengers, currency, locale)
    
    response = []
    for flight in flights:
        response.append(FlightSearchResponse(
            id=flight.id,
            flight_number=flight.flight_number,
            origin=flight.origin,
            destination=flight.destination,
            departure_at=flight.departure_at,
            arrival_at=flight.arrival_at,
            status=flight.status,
            available_classes=[si for si in flight.seat_inventory]
        ))
    return response

@router.get("/{flight_id}/seat-map", response_model=SeatMapResponse)
async def get_flight_seat_map(
    flight_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    seat_map = await get_seat_map(db, flight_id)
    if not seat_map:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Flight not found")
    return seat_map
