from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.models.waitlist import WaitlistEntry
from app.schemas.waitlist import WaitlistJoinRequest, WaitlistResponse
from app.services.waitlist_service import join_waitlist
from app.dependencies.auth import get_current_user_optional
from app.dependencies.idempotency import require_idempotency_key
from app.services.idempotency_service import check_idempotency, store_idempotency_result

router = APIRouter(prefix="/waitlist", tags=["Waitlist"])

@router.post("", response_model=WaitlistResponse, status_code=status.HTTP_201_CREATED)
async def join_flight_waitlist(
    request: WaitlistJoinRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user_optional),
    idempotency_key: str = Depends(require_idempotency_key)
):
    cached = await check_idempotency(db, idempotency_key, "/waitlist", request.model_dump())
    if cached:
        return JSONResponse(status_code=cached["status_code"], content=cached["body"])

    result = await join_waitlist(db, request, current_user)
    
    result_dict = result.model_dump(mode='json') if hasattr(result, 'model_dump') else result
    await store_idempotency_result(db, idempotency_key, "/waitlist", request.model_dump(), 201, result_dict)
    
    return result

@router.get("/{waitlist_id}", response_model=WaitlistResponse)
async def get_waitlist_status(
    waitlist_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(WaitlistEntry).where(WaitlistEntry.id == waitlist_id)
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Waitlist entry not found")
        
    return entry
