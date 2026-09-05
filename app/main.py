from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.exceptions.handlers import register_exception_handlers
from app.routers import health, auth, admin_flights, flights, bookings, waitlist, refunds

settings = get_settings()

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting Flight Management API...")
    # Import all models so SQLAlchemy knows about them
    from app.models import (  # noqa: F401
        User, Flight, SeatInventory, Itinerary, ItineraryLeg,
        SeatHold, Booking, Passenger, WaitlistEntry,
        Refund, TravelCredit, AuditLog, IdempotencyKey
    )
    logger.info("Flight Management API started successfully")
    yield
    logger.info("Shutting down Flight Management API...")

app = FastAPI(
    title="Flight Management System API",
    description="""Complete Flight Management System API.
    
    ## Features
    - ✈️ Flight creation, editing, and cancellation (Admin)
    - 🔍 Flight search with fare and availability info
    - 🎫 Seat holds and booking confirmation with atomic inventory
    - ❌ Cancellations with refund/credit/non-refundable policies
    - ⏳ Waitlist with priority scoring for n8n promotion
    - 📧 Transactional emails on booking and cancellation
    - 🔐 JWT authentication with role-based access control
    - 🔁 Idempotent write endpoints
    - 📋 Full audit logging
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
register_exception_handlers(app)

# Routers
app.include_router(health.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(admin_flights.router, prefix="/admin")
app.include_router(flights.router, prefix="/flights")
app.include_router(bookings.router, prefix="/bookings")
app.include_router(waitlist.router, prefix="/waitlist")
app.include_router(refunds.router, prefix="/refunds")

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Flight Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }
