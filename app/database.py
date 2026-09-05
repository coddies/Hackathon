from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=(settings.environment == "development"),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    # Required for Supabase Transaction Pooler (port 6543)
    # Disables prepared statements which are not supported in transaction mode
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "ssl": "require",
    },
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def check_db_connection() -> bool:
    try:
        from sqlalchemy import text
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database connection check failed: {e}")
        return False
