from fastapi import Header
from typing import Optional

async def get_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
) -> Optional[str]:
    """Extract Idempotency-Key header. Returns None if not provided."""
    return idempotency_key

async def require_idempotency_key(
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key")
) -> str:
    """Require Idempotency-Key header. Raises 400 if not provided."""
    from fastapi import HTTPException, status
    if not idempotency_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Idempotency-Key header is required for this endpoint"
        )
    return idempotency_key
