from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db, check_db_connection

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_ok = await check_db_connection()
    return {
        "status": "ok",
        "service": "flight-management-api",
        "database": "connected" if db_ok else "disconnected"
    }
