import asyncio, os

with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

import asyncpg

async def check():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url, ssl='require', statement_cache_size=0)

    # All public tables
    tables = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
    print('=== EXISTING TABLES ===')
    for t in tables:
        print(' -', t['tablename'])

    # Check alembic_version
    alembic = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='alembic_version')")
    print(f'\nalembic_version table exists: {alembic}')
    if alembic:
        ver = await conn.fetchval('SELECT version_num FROM alembic_version')
        print(f'Current migration version: {ver}')

    await conn.close()

asyncio.run(check())
