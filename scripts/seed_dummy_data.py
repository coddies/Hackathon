"""
scripts/seed_dummy_data.py
==========================
Supabase Free-Tier Keep-Alive Script
=====================================
Supabase pauses the database after 7 days of inactivity.
Run this script every 6 days (via GitHub Actions or cron) to prevent hibernation.

Also seeds minimal dummy data so the DB always has realistic content.

Usage:
    python scripts/seed_dummy_data.py

GitHub Actions (recommended):
    See .github/workflows/keep-alive.yml
"""

import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# Load .env if running locally
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import asyncpg

DATABASE_URL = os.environ.get("DATABASE_URL", "")


def get_pg_url(url: str) -> str:
    """Convert SQLAlchemy URL to asyncpg URL."""
    return (
        url
        .replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgresql+psycopg2://", "postgresql://")
    )


async def ping_database(conn: asyncpg.Connection) -> None:
    """Simple heartbeat query — just proves the DB is awake."""
    result = await conn.fetchval("SELECT COUNT(*) FROM flights WHERE status = 'SCHEDULED'")
    print(f"[KEEP-ALIVE] DB is awake. Active scheduled flights: {result}")


async def ensure_keep_alive_user(conn: asyncpg.Connection) -> str:
    """Get or create a system user for seeding purposes."""
    existing = await conn.fetchrow(
        "SELECT id FROM users WHERE email = 'keepalive@skyflow.internal'"
    )
    if existing:
        return str(existing["id"])

    user_id = str(uuid.uuid4())
    # Passwords don't matter — this is a system account
    await conn.execute(
        """
        INSERT INTO users (id, email, full_name, hashed_password, role, is_active, created_at)
        VALUES ($1, 'keepalive@skyflow.internal', 'SkyFlow System', 
                '$2b$12$PLACEHOLDER_HASH', 'OPS_AGENT', true, NOW())
        ON CONFLICT (email) DO NOTHING
        """,
        user_id
    )
    print(f"[SEED] Created keep-alive system user: {user_id}")
    return user_id


async def seed_dummy_flight(conn: asyncpg.Connection, actor_id: str) -> None:
    """
    Insert a dummy future flight to keep all flight-related tables active.
    Cleans up flights older than 30 days to avoid clutter.
    """
    # Clean up old dummy keep-alive flights
    deleted = await conn.execute(
        """
        DELETE FROM flights
        WHERE flight_number LIKE 'KA-%'
        AND departure_at < NOW() - INTERVAL '30 days'
        """
    )
    print(f"[SEED] Cleaned old dummy flights: {deleted}")

    # Check if a future dummy flight already exists
    existing = await conn.fetchrow(
        """
        SELECT id FROM flights
        WHERE flight_number LIKE 'KA-%'
        AND departure_at > NOW()
        LIMIT 1
        """
    )
    if existing:
        print(f"[SEED] Future dummy flight already exists: {existing['id']}")
        return

    flight_id = str(uuid.uuid4())
    departure = datetime.now(timezone.utc) + timedelta(days=14)
    arrival = departure + timedelta(hours=6)
    flight_number = f"KA-{datetime.now().strftime('%m%d')}"

    await conn.execute(
        """
        INSERT INTO flights (id, flight_number, origin, destination, departure_at, arrival_at,
                             aircraft_capacity, status, created_by, created_at)
        VALUES ($1, $2, 'LHR', 'DXB', $3, $4, 180, 'SCHEDULED', $5, NOW())
        ON CONFLICT DO NOTHING
        """,
        flight_id, flight_number, departure, arrival, actor_id
    )
    print(f"[SEED] Inserted dummy flight: {flight_number} ({flight_id})")

    # Insert seat inventory for the dummy flight
    classes = [
        ("FIRST", 20, Decimal("1500.00"), Decimal("2200.00")),
        ("BUSINESS", 40, Decimal("800.00"), Decimal("1200.00")),
        ("ECONOMY", 120, Decimal("200.00"), Decimal("350.00")),
    ]
    for seat_class, total_seats, fare_basic, fare_flexible in classes:
        inv_id = str(uuid.uuid4())
        await conn.execute(
            """
            INSERT INTO seat_inventory (
                id, flight_id, seat_class, total_seats, available_seats, held_seats,
                fare_basic, fare_flexible, overbooking_policy, overbooking_buffer,
                booking_cutoff_hours, group_booking_policy
            )
            VALUES ($1, $2, $3, $4, $4, 0, $5, $6,
                    'HARD_NEVER_OVERSELL', 0, 3, 'FULL_FAIL')
            ON CONFLICT (flight_id, seat_class) DO NOTHING
            """,
            inv_id, flight_id, seat_class, total_seats, fare_basic, fare_flexible
        )
    print(f"[SEED] Inserted seat inventory for flight {flight_number}")

    # Insert audit log for this seeding action
    await conn.execute(
        """
        INSERT INTO audit_logs (id, actor_id, actor_role, action, entity_type, entity_id,
                                new_data, reason, created_at)
        VALUES ($1, $2, 'SYSTEM', 'KEEP_ALIVE_SEED', 'flight', $3,
                '{"source": "seed_dummy_data.py"}'::jsonb,
                'Automated keep-alive seeding to prevent Supabase hibernation', NOW())
        """,
        str(uuid.uuid4()), actor_id, flight_id
    )


async def touch_notification_logs(conn: asyncpg.Connection) -> None:
    """
    Insert a keep-alive notification log entry so notification_logs table stays active.
    Cleans up entries older than 60 days.
    """
    await conn.execute(
        "DELETE FROM notification_logs WHERE notification_type = 'KEEP_ALIVE' AND created_at < NOW() - INTERVAL '60 days'"
    )
    # Only insert if table has a created_at column (check first)
    try:
        await conn.execute(
            """
            INSERT INTO notification_logs (id, notification_type, recipient_email, created_at)
            VALUES ($1, 'KEEP_ALIVE', 'keepalive@skyflow.internal', NOW())
            """,
            str(uuid.uuid4())
        )
        print("[SEED] Touched notification_logs table")
    except Exception as e:
        # notification_logs may have a different schema — just log
        print(f"[SEED] notification_logs touch skipped: {e}")


async def main():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL environment variable not set!")
        print("Set it to your Supabase Postgres connection string.")
        return

    pg_url = get_pg_url(DATABASE_URL)
    print(f"[KEEP-ALIVE] Connecting to Supabase at {pg_url[:40]}...")

    try:
        conn = await asyncpg.connect(pg_url)
        try:
            # Step 1: Ping
            await ping_database(conn)

            # Step 2: Ensure system user
            actor_id = await ensure_keep_alive_user(conn)

            # Step 3: Seed dummy flight
            await seed_dummy_flight(conn, actor_id)

            # Step 4: Touch notification logs
            await touch_notification_logs(conn)

            print("[KEEP-ALIVE] ✅ All done — Supabase is awake and healthy!")

        finally:
            await conn.close()

    except Exception as e:
        print(f"[KEEP-ALIVE] ❌ Error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
