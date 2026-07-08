import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.models.security import Permission
from sqlalchemy.future import select

async def clean_permissions():
    async with async_session_maker() as db:
        print("Buscando permisos sobrantes...")
        result = await db.execute(select(Permission))
        all_perms = result.scalars().all()
        
        for perm in all_perms:
            if perm.name != "admin.roles.manage":
                await db.delete(perm)
                print(f"Permiso eliminado: {perm.name}")
        
        await db.commit()
        print("Limpieza completada.")

if __name__ == "__main__":
    asyncio.run(clean_permissions())
