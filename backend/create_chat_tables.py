import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import engine, Base
import src.models.chat  # Importar modelos de chat para que estén registrados en Base.metadata

async def create_tables():
    print("💬 Creando tablas de Chat (chat_rooms, chat_participants, chat_messages) en MySQL...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de Chat creadas exitosamente.")

if __name__ == "__main__":
    asyncio.run(create_tables())
