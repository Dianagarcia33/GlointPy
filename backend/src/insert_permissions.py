import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import async_session_maker
from src.models.user import User
from src.models.security import Permission

async def seed_permissions():
    async with async_session_maker() as db:
        # 1. Crear el permiso en la base de datos si no existe
        perm_name = "dashboard.investments.read"
        result = await db.execute(select(Permission).where(Permission.name == perm_name))
        perm = result.scalars().first()
        
        if not perm:
            print(f"Creando permiso: {perm_name}")
            perm = Permission(
                name=perm_name,
                module="dashboard",
                action="read",
                description="Permite ver la tarjeta de Inversiones en el Inicio"
            )
            db.add(perm)
            await db.commit()
            await db.refresh(perm)
        else:
            print(f"El permiso {perm_name} ya existe en la tabla permissions.")

        # 2. Asignarle este permiso directamente al usuario Super Admin (ID 1)
        # usando la columna especial de excepciones (permissions_override)
        result = await db.execute(select(User).where(User.id == 1))
        user = result.scalars().first()
        
        if user:
            print(f"Actualizando permisos directos para el usuario: {user.name}")
            # Si ya tiene un diccionario, lo usamos, si no, creamos uno nuevo
            current_overrides = user.permissions_override or {}
            current_overrides[perm_name] = True
            
            user.permissions_override = current_overrides
            
            db.add(user)
            await db.commit()
            print("¡Permiso asignado con éxito al Super Admin!")
        else:
            print("No se encontró el usuario con ID 1.")

if __name__ == "__main__":
    asyncio.run(seed_permissions())
