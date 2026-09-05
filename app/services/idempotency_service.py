import hashlib
import json
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from app.models.idempotency import IdempotencyKey
from app.exceptions.handlers import IdempotencyConflictError

def _hash_body(body: Any) -> str:
    """SHA-256 hash of JSON-serialized request body."""
    body_str = json.dumps(body, sort_keys=True, default=str)
    return hashlib.sha256(body_str.encode()).hexdigest()

async def check_idempotency(
    db: AsyncSession,
    key: str,
    route: str,
    request_body: Any,
) -> Optional[dict]:
    """
    Check if idempotency key already exists.
    Returns stored response if same key+route+body.
    Raises IdempotencyConflictError if same key+route but different body.
    Returns None if new key (proceed normally).
    """
    if not key:
        return None
    
    request_hash = _hash_body(request_body)
    result = await db.execute(
        select(IdempotencyKey).where(
            IdempotencyKey.key == key,
            IdempotencyKey.route == route
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing is None:
        return None
    
    if existing.request_hash != request_hash:
        raise IdempotencyConflictError(
            f"Idempotency key '{key}' was used with a different request body"
        )
    
    # Same key + same body = return stored response
    return {
        "status_code": existing.response_status,
        "body": existing.response_body
    }

async def store_idempotency_result(
    db: AsyncSession,
    key: str,
    route: str,
    request_body: Any,
    response_status: int,
    response_body: Any,
) -> None:
    """Store the result of a successfully processed idempotent request."""
    if not key:
        return
    
    request_hash = _hash_body(request_body)
    record = IdempotencyKey(
        key=key,
        route=route,
        request_hash=request_hash,
        response_status=response_status,
        response_body=response_body if isinstance(response_body, dict) else json.loads(json.dumps(response_body, default=str)),
    )
    db.add(record)
    try:
        await db.flush()
    except IntegrityError:
        # Race condition: another request stored the same key concurrently, ignore
        await db.rollback()
