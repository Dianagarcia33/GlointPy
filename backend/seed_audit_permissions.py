import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.database import async_session_maker
from src.models.security import Permission, Role
from sqlalchemy.future import select

async def main():
    async with async_session_maker() as db:
        p_data = {"name": "admin.audits.manage", "description": "Gestionar auditorias y cruce de datos", "module": "admin"}
        
        # Insert permission
        existing = await db.execute(select(Permission).where(Permission.name == p_data["name"]))
        perm = existing.scalars().first()
        if not perm:
            perm = Permission(**p_data)
            db.add(perm)
            print(f"Permiso {p_data['name']} añadido.")
        
        await db.commit()
        
        # Attach to roles: administrador and superadmin
        for role_name in ["administrador", "superadmin"]:
            role_res = await db.execute(select(Role).where(Role.name == role_name))
            role = role_res.scalars().first()
            
            if role:
                await db.refresh(role, ['permissions'])
                if perm not in role.permissions:
                    role.permissions.append(perm)
                    print(f"Permiso asignado al rol {role_name}.")
            else:
                print(f"Rol {role_name} no encontrado.")
                
        await db.commit()
        print("Finalizado con exito.")

if __name__ == "__main__":
    asyncio.run(main())
