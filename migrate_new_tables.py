import asyncio, os
import asyncpg
from dotenv import load_dotenv
load_dotenv()

async def migrate():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url, ssl='require', statement_cache_size=0)
    
    print("Creating schedule_changes table...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS schedule_changes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
            changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
            old_departure_at TIMESTAMPTZ NOT NULL,
            new_departure_at TIMESTAMPTZ NOT NULL,
            old_arrival_at TIMESTAMPTZ NOT NULL,
            new_arrival_at TIMESTAMPTZ NOT NULL,
            old_origin VARCHAR(3) NOT NULL,
            new_origin VARCHAR(3) NOT NULL,
            old_destination VARCHAR(3) NOT NULL,
            new_destination VARCHAR(3) NOT NULL,
            rebooking_rule VARCHAR(20) DEFAULT 'NONE',
            fare_policy_override BOOLEAN DEFAULT FALSE,
            override_reason TEXT,
            affected_bookings_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    """)
    print("[OK] schedule_changes created")

    print("Adding columns to physical_seats...")
    try:
        await conn.execute("ALTER TABLE physical_seats ADD COLUMN IF NOT EXISTS hold_id UUID REFERENCES seat_holds(id) ON DELETE SET NULL;")
        print("[OK] hold_id added to physical_seats")
    except Exception as e:
        print(f"Error adding hold_id: {e}")
        
    try:
        await conn.execute("ALTER TABLE physical_seats ADD COLUMN IF NOT EXISTS passenger_id UUID REFERENCES passengers(id) ON DELETE SET NULL;")
        print("[OK] passenger_id added to physical_seats")
    except Exception as e:
        print(f"Error adding passenger_id: {e}")

    await conn.close()
    print("Migration complete!")

asyncio.run(migrate())
