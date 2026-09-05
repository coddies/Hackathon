import asyncio, os

with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

import asyncpg

async def setup():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url, ssl='require', statement_cache_size=0)

    print('Creating itineraries table...')
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS itineraries (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'PENDING',
            currency VARCHAR(3) DEFAULT 'USD',
            locale VARCHAR(10) DEFAULT 'en-US',
            created_at TIMESTAMPTZ DEFAULT now()
        );
    """)
    print('  [OK] itineraries created')

    print('Creating itinerary_legs table...')
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS itinerary_legs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
            flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
            leg_order INTEGER NOT NULL,
            seat_class VARCHAR(20) NOT NULL,
            fare_type VARCHAR(20) NOT NULL,
            passenger_count INTEGER NOT NULL
        );
    """)
    print('  [OK] itinerary_legs created')

    print('Stamping alembic version...')
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS alembic_version (
            version_num VARCHAR(32) NOT NULL,
            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
        );
    """)
    await conn.execute("""
        INSERT INTO alembic_version (version_num) VALUES ('0001') ON CONFLICT DO NOTHING;
    """)
    print('  [OK] alembic_version stamped')

    tables = await conn.fetch(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
    )
    print('\n=== ALL TABLES (' + str(len(tables)) + ' total) ===')
    for t in tables:
        print('  - ' + t['tablename'])

    await conn.close()
    print('\nDatabase setup COMPLETE!')

asyncio.run(setup())
