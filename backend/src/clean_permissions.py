import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text

from src.core.database import async_session_maker
from src.models.security import Role, Permission

async def clean_and_seed():
    async with async_session_maker() as db:
        print("Borrando TODOS los permisos viejos de la tabla permissions...")
        await db.execute(text("TRUNCATE TABLE permissions"))
        
        print("Vaciando los arreglos JSON de permisos de todos los roles...")
        await db.execute(text("UPDATE roles SET permissions = '[]'"))
        await db.commit()
        
        print("Insertando ÚNICAMENTE los permisos nuevos...")
        required_permissions = [
            {
                "slug": "admin.roles.manage",
                "name": "Gestionar Roles",
                "module": "Roles",
                "description": "Permite crear, editar y eliminar roles del sistema"
            },
            {
                "slug": "investments:view",
                "name": "Ver Inversiones",
                "module": "Inversiones",
                "description": "Permite ver el listado de inversiones"
            },
            {
                "slug": "admin.investments.requests",
                "name": "Gestionar Solicitudes",
                "module": "Inversiones",
                "description": "Permite aprobar o rechazar solicitudes de inversión"
            }
        ]
        
        for p_data in required_permissions:
            perm = Permission(**p_data)
            db.add(perm)
        
        await db.commit()
        
        print("Asignando los nuevos permisos a admin y super_admin...")
        roles_to_update = ["admin", "super_admin"]
        for role_name in roles_to_update:
            stmt = select(Role).where(Role.name == role_name)
            result = await db.execute(stmt)
            role = result.scalar_one_or_none()
            if role:
                role.permissions = [p["slug"] for p in required_permissions]
                db.add(role)
        
        await db.commit()
        print("¡Limpieza total y resiembra completada con éxito!")

if __name__ == "__main__":
    asyncio.run(clean_and_seed())
