import asyncio
import os
import httpx
from datetime import datetime, timedelta, timezone
from sqlalchemy import text
from app.database import engine
import uuid

BASE_URL = "http://localhost:8000"

async def test_invariants():
    results = []
    
    async with engine.connect() as conn:
        await conn.execute(text("DELETE FROM audit_logs WHERE entity_type = 'FLIGHT'"))
        await conn.execute(text("DELETE FROM seat_inventory WHERE flight_id IN (SELECT id FROM flights WHERE flight_number = 'INV100')"))
        await conn.execute(text("DELETE FROM flights WHERE flight_number = 'INV100'"))
        await conn.commit()
        # Create a test flight manually
        fid = str(uuid.uuid4())
        try:
            await conn.execute(
                text("INSERT INTO flights (id, flight_number, origin, destination, departure_at, arrival_at, aircraft_capacity, status) "
                     "VALUES (:id, 'INV100', 'LHE', 'DXB', '2027-01-01 10:00:00+00', '2027-01-01 14:00:00+00', 10, 'SCHEDULED')"),
                {"id": fid}
            )
            
            await conn.execute(
                text("INSERT INTO seat_inventory (id, flight_id, seat_class, total_seats, available_seats, held_seats, fare_basic, fare_flexible, booking_cutoff_hours, overbooking_policy, overbooking_buffer, group_booking_policy) "
                     "VALUES (:id, :fid, 'ECONOMY', 10, 10, 0, 100, 200, 3, 'HARD_NEVER_OVERSELL', 0, 'FULL_FAIL')"),
                {"id": str(uuid.uuid4()), "fid": fid}
            )
            await conn.commit()
        except Exception as e:
            print("Setup failed:", e)
            await conn.rollback()
            return
            
        # 1. available_seats cannot become negative
        try:
            await conn.execute(text("UPDATE seat_inventory SET available_seats = -1 WHERE flight_id = :fid"), {"fid": fid})
            results.append({"invariant": "available_seats >= 0", "passed": False, "detail": "Allowed negative available seats in DB"})
            # Revert
            await conn.execute(text("UPDATE seat_inventory SET available_seats = 10 WHERE flight_id = :fid"), {"fid": fid})
            await conn.commit()
        except Exception as e:
            results.append({"invariant": "available_seats >= 0", "passed": True, "detail": str(e)})
            await conn.rollback()

        # 2. Duplicate flight number for same route/day is rejected
        try:
            await conn.execute(
                text("INSERT INTO flights (id, flight_number, origin, destination, departure_at, arrival_at, aircraft_capacity, status) "
                     "VALUES (:id, 'INV100', 'LHE', 'DXB', '2027-01-01 12:00:00+00', '2027-01-01 16:00:00+00', 10, 'SCHEDULED')"),
                {"id": str(uuid.uuid4())}
            )
            results.append({"invariant": "Unique flight number per route/day", "passed": False, "detail": "Allowed duplicate flight"})
            await conn.commit()
        except Exception as e:
            results.append({"invariant": "Unique flight number per route/day", "passed": True, "detail": "Rejected duplicate"})
            await conn.rollback()

        # 3. Duplicate idempotency key behavior is correct
        try:
            key = str(uuid.uuid4())
            await conn.execute(
                text("INSERT INTO idempotency_keys (idempotency_key, request_method, request_path, request_body_hash, response_status, response_body) "
                     "VALUES (:key, 'POST', '/test', 'hash', 200, '{}')"),
                {"key": key}
            )
            await conn.execute(
                text("INSERT INTO idempotency_keys (idempotency_key, request_method, request_path, request_body_hash, response_status, response_body) "
                     "VALUES (:key, 'POST', '/test', 'hash2', 400, '{}')"),
                {"key": key}
            )
            results.append({"invariant": "Unique idempotency key per method/path", "passed": False, "detail": "Allowed duplicate"})
            await conn.commit()
        except Exception as e:
            results.append({"invariant": "Unique idempotency key per method/path", "passed": True, "detail": "Rejected duplicate"})
            await conn.rollback()

        # 4. Foreign keys and audit log writes succeed
        try:
            await conn.execute(
                text("INSERT INTO audit_logs (id, entity_id, entity_type, action, actor_id, actor_role) "
                     "VALUES (:id, :fid, 'FLIGHT', 'CREATE', NULL, 'SYSTEM')"),
                {"id": str(uuid.uuid4()), "fid": fid}
            )
            results.append({"invariant": "Audit log insert", "passed": True, "detail": "Successfully inserted"})
            await conn.commit()
        except Exception as e:
            results.append({"invariant": "Audit log insert", "passed": False, "detail": str(e)})
            await conn.rollback()

    for r in results:
        print(f"[{'PASS' if r['passed'] else 'FAIL'}] {r['invariant']}: {r['detail']}")

if __name__ == "__main__":
    asyncio.run(test_invariants())
