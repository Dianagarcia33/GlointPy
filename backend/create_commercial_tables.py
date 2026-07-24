import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import engine
from src.models.commercial_sale import Base

async def create_tables():
    async with engine.begin() as conn:
        print("🔨 Creando tabla commercial_sales en la base de datos...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tabla commercial_sales creada correctamente.")

if __name__ == "__main__":
    asyncio.run(create_tables())
