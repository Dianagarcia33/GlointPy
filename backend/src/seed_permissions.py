import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.core.database import async_session_maker
from src.models.security import Permission, Role

async def seed_roles_and_permissions():
    async with async_session_maker() as db:
        print("Iniciando seeder de permisos y roles...")
        
        # Eliminar la columna 'permissions' antigua de la tabla 'roles' si existe
        # (Esto arregla el error: Field 'permissions' doesn't have a default value)
        try:
            from sqlalchemy import text
            await db.execute(text("ALTER TABLE roles DROP COLUMN permissions"))
            await db.commit()
            print("Columna 'permissions' antigua eliminada de la tabla roles.")
        except Exception:
            # Si la columna no existe u ocurre otro error, lo ignoramos y seguimos
            await db.rollback()
            pass
        
        # 1. Asegurar que existe el rol de Super Admin
        stmt = select(Role).options(selectinload(Role.permissions)).where(Role.name == "super_admin")
        result = await db.execute(stmt)
        super_admin = result.scalar_one_or_none()
        
        if not super_admin:
            super_admin = Role(
                name="super_admin",
                display_name="Super Administrador",
                description="Acceso total al sistema"
            )
            db.add(super_admin)
            await db.commit()
            await db.refresh(super_admin)
            print("Rol 'super_admin' creado.")
            
        # 2. Definir los permisos requeridos
        required_permissions = [
            {"name": "admin.roles.manage", "module": "administración", "action": "Gestionar Roles", "description": "Permite crear, editar y eliminar roles y permisos"},
            {"name": "investments:view", "module": "inversiones", "action": "Ver Inversiones", "description": "Ver inversiones del usuario"},
            {"name": "admin.investments.requests", "module": "inversiones", "action": "Gestionar Solicitudes", "description": "Aprobar o rechazar solicitudes de inversión"},
        ]
        
        # 3. Crear los permisos si no existen y asignarlos al super_admin
        perms_to_assign = []
        for p_data in required_permissions:
            stmt = select(Permission).where(Permission.name == p_data["name"])
            result = await db.execute(stmt)
            perm = result.scalar_one_or_none()
            
            if not perm:
                perm = Permission(**p_data)
                db.add(perm)
                await db.commit()
                await db.refresh(perm)
                print(f"Permiso '{p_data['name']}' creado.")
                
            perms_to_assign.append(perm)
            
        # 4. Asignar todos los permisos al super admin (evitando duplicados)
        existing_perm_ids = {p.id for p in super_admin.permissions}
        new_perms_assigned = False
        
        for p in perms_to_assign:
            if p.id not in existing_perm_ids:
                super_admin.permissions.append(p)
                new_perms_assigned = True
                
        if new_perms_assigned:
            db.add(super_admin)
            await db.commit()
            print("Permisos asignados al rol 'super_admin'.")
        else:
            print("El rol 'super_admin' ya tenía todos los permisos.")

if __name__ == "__main__":
    asyncio.run(seed_roles_and_permissions())
