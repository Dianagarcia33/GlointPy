from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from src.core.config import settings

# 1. Crear el motor asíncrono
# echo=True imprimirá las sentencias SQL en consola solo si estamos en desarrollo
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.ENVIRONMENT == "development"),
    future=True,
    pool_pre_ping=True, # Verifica que la conexión no se haya caído
)

# 2. Fábrica de sesiones
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# 3. Base declarativa para los modelos
Base = declarative_base()

# 4. Dependencia para inyectar la sesión en los endpoints
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
