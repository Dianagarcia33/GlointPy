import asyncio
import os
import sys
from dotenv import load_dotenv

file_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(file_dir, ".."))

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if file_dir not in sys.path:
    sys.path.insert(0, file_dir)

load_dotenv(".env")

from src.core.database import async_session_maker
from src.services.security_service import SecurityService

async def main():
    async with async_session_maker() as db:
        print("🔍 Sincronizando todos los permisos del sistema...")
        result = await SecurityService.sync_all_system_permissions(db)
        print(f"✅ {result['message']}. Total permisos disponibles: {result['total_permissions']}")

if __name__ == "__main__":
    asyncio.run(main())
