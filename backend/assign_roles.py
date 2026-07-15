import asyncio
import os
import sys

# Asegurar que los imports de src funcionen correctamente
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.database import async_session_maker
from src.models.user import User
from src.models.security import Role, user_roles
from sqlalchemy.future import select
from sqlalchemy import insert, delete

async def main():
    print("Iniciando conexión a la base de datos...")
    async with async_session_maker() as db:
        # 1. Buscar o crear el rol de Inversionista
        print("Buscando el rol de Inversionista...")
        role_result = await db.execute(select(Role).where(Role.name.ilike("%invest%")))
        role = role_result.scalars().first()
        
        if not role:
            role_result = await db.execute(select(Role).where(Role.name.ilike("%inversionista%")))
            role = role_result.scalars().first()
            
        if not role:
            print("No se encontró el rol, creándolo...")
            role = Role(
                name="Investor",
                description="Rol creado automáticamente",
                is_system_role=True
            )
            db.add(role)
            await db.commit()
            await db.refresh(role)
            
        print(f"Rol a asignar: {role.name} (ID: {role.id})")
        
        # 2. Obtener usuarios
        print("Obteniendo usuarios...")
        result = await db.execute(select(User).where(User.is_superuser == False))
        users = result.scalars().all()
        
        count = 0
        for u in users:
            # Eliminar roles anteriores de la tabla pivote para evitar duplicados o roles incorrectos
            await db.execute(delete(user_roles).where(user_roles.c.user_id == u.id))
            
            # Asignar el rol correcto
            await db.execute(insert(user_roles).values(user_id=u.id, role_id=role.id))
            count += 1
            print(f"[{count}] Reasignando rol a ID: {u.id} | Email: {u.email}")
            
        print("Guardando cambios en la base de datos...")
        await db.commit()
        print(f"\\n¡Éxito! A {count} usuarios se les reasignó el rol correctamente.")

if __name__ == "__main__":
    asyncio.run(main())
