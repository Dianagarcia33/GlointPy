import asyncio
import os
import sys

# Añadir el directorio base al sys.path para que los imports funcionen
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.database import SessionLocal
from src.models.permissions import Permission
from src.models.roles import Role
from src.models.user_roles import UserRole
from sqlalchemy import select

async def main():
    async with SessionLocal() as db:
        # Verificar si el permiso ya existe
        stmt = select(Permission).where(Permission.name == 'manage_system_events')
        result = await db.execute(stmt)
        perm = result.scalars().first()

        if not perm:
            print("Creando permiso manage_system_events...")
            perm = Permission(name='manage_system_events', description='Permite configurar y administrar fechas de eventos del sistema (ej. retiros)')
            db.add(perm)
            await db.flush()
        else:
            print("El permiso manage_system_events ya existe.")

        # Obtener el rol de Super Administrador (rol 1 o 'admin' / 'SuperAdmin')
        stmt_role = select(Role).where(Role.id == 1)
        res_role = await db.execute(stmt_role)
        super_admin_role = res_role.scalars().first()

        if super_admin_role:
            # Asignar el permiso al rol si no lo tiene
            if perm not in super_admin_role.permissions:
                print(f"Asignando permiso a rol {super_admin_role.name}...")
                super_admin_role.permissions.append(perm)
                db.add(super_admin_role)
        
        await db.commit()
        print("¡Permiso de gestión de eventos de sistema agregado con éxito!")

if __name__ == "__main__":
    asyncio.run(main())
