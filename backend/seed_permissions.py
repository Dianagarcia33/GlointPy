import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.models.security import Permission
from sqlalchemy.future import select

PERMISSIONS = [
    {"name": "admin.roles.manage", "description": "Gestionar roles y permisos del sistema", "module": "admin", "slug": "admin.roles.manage"},
    {"name": "admin.users.manage", "description": "Gestionar usuarios de la plataforma", "module": "admin", "slug": "admin.users.manage"},
    {"name": "admin.periods.manage", "description": "Gestionar periodos de inversión", "module": "admin", "slug": "admin.periods.manage"},
]

async def seed_permissions():
    async with async_session_maker() as db:
        print("Sincronizando permisos base...")
        for p_data in PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.name == p_data["name"]))
            existing = result.scalars().first()
            if not existing:
                new_perm = Permission(**p_data)
                db.add(new_perm)
                print(f"Permiso creado: {p_data['name']}")
        
        await db.commit()
        print("Permisos sincronizados correctamente.")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
