import asyncio, os

with open('.env') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            os.environ[k.strip()] = v.strip()

import asyncpg

async def test():
    raw = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    print(f"Connecting to: {raw[:50]}...")
    conn = await asyncpg.connect(raw, ssl='require')
    ver = await conn.fetchval('SELECT version()')
    print('SUCCESS:', ver[:70])
    rows = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname='public' LIMIT 5")
    print('Existing public tables:', [r['tablename'] for r in rows] or '(none yet)')
    await conn.close()

asyncio.run(test())
