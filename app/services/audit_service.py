from typing import Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
import logging

logger = logging.getLogger(__name__)

# Audit action constants
class AuditAction:
    ADMIN_CREATED_FLIGHT = "ADMIN_CREATED_FLIGHT"
    ADMIN_EDITED_FLIGHT = "ADMIN_EDITED_FLIGHT"
    ADMIN_CANCELLED_FLIGHT = "ADMIN_CANCELLED_FLIGHT"
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"
    SEAT_HOLD_CREATED = "SEAT_HOLD_CREATED"
    SEAT_HOLD_RELEASED = "SEAT_HOLD_RELEASED"
    SEAT_HOLD_EXPIRED = "SEAT_HOLD_EXPIRED"
    REFUND_DECIDED = "REFUND_DECIDED"
    TRAVEL_CREDIT_ISSUED = "TRAVEL_CREDIT_ISSUED"
    WAITLIST_JOINED = "WAITLIST_JOINED"
    WAITLIST_PROMOTED = "WAITLIST_PROMOTED"
    USER_REGISTERED = "USER_REGISTERED"
    FLIGHT_CANCELLATION_OUTCOME_STORED = "FLIGHT_CANCELLATION_OUTCOME_STORED"

async def create_audit_log(
    db: AsyncSession,
    action: str,
    entity_type: str,
    entity_id: Optional[UUID] = None,
    actor_id: Optional[UUID] = None,
    actor_role: str = "SYSTEM",
    old_data: Optional[dict] = None,
    new_data: Optional[dict] = None,
    reason: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    """Create an audit log record and flush to DB (does not commit — let caller commit)."""
    log = AuditLog(
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_data=old_data,
        new_data=new_data,
        reason=reason,
        ip_address=ip_address,
    )
    db.add(log)
    await db.flush()
    logger.info(f"Audit: {action} on {entity_type}:{entity_id} by {actor_role}:{actor_id}")
    return log
