"""Database connection and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=settings.app_env == "development",
    pool_pre_ping=True,
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """Dependency that yields an async database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
