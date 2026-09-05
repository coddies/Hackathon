import asyncio, os
import asyncpg
from dotenv import load_dotenv
load_dotenv()
async def describe():
    url = os.environ['DATABASE_URL'].replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(url, ssl='require', statement_cache_size=0)
    for table in ['seat_holds', 'passengers', 'bookings', 'physical_seats']:
        print(f'\n--- {table} ---')
        rows = await conn.fetch(f"""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '{table}';
        """)
        for row in rows:
            print(f"{row['column_name']}: {row['data_type']}")
    await conn.close()
asyncio.run(describe())
