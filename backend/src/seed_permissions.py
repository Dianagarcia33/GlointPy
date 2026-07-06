import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import async_session_maker
from src.models.security import Permission, Role

async def seed_roles_and_permissions():
    async with async_session_maker() as db:
        print("Iniciando seeder de permisos y roles...")
        
        # 1. Asegurar que existe el rol de Super Admin
        stmt = select(Role).where(Role.name == "super_admin")
        result = await db.execute(stmt)
        super_admin = result.scalar_one_or_none()
        
        if not super_admin:
            super_admin = Role(
                name="super_admin",
                display_name="Super Administrador",
                description="Acceso total al sistema",
                permissions=[]
            )
            db.add(super_admin)
            await db.commit()
            await db.refresh(super_admin)
            print("Rol 'super_admin' creado.")
            
        # 2. Definir los permisos requeridos
        required_permissions = [
            {"slug": "admin.roles.manage", "name": "Gestionar Roles", "module": "administración", "description": "Permite crear, editar y eliminar roles y permisos"},
            {"slug": "investments:view", "name": "Ver Inversiones", "module": "inversiones", "description": "Ver inversiones del usuario"},
            {"slug": "admin.investments.requests", "name": "Gestionar Solicitudes", "module": "inversiones", "description": "Aprobar o rechazar solicitudes de inversión"},
        ]
        
        # 3. Crear los permisos si no existen y asignarlos al super_admin
        perms_to_assign = []
        for p_data in required_permissions:
            stmt = select(Permission).where(Permission.slug == p_data["slug"])
            result = await db.execute(stmt)
            perm = result.scalar_one_or_none()
            
            if not perm:
                perm = Permission(**p_data)
                db.add(perm)
                await db.commit()
                await db.refresh(perm)
                print(f"Permiso '{p_data['slug']}' creado.")
                
            perms_to_assign.append(perm)
            
        # 4. Asignar todos los permisos al super admin (evitando duplicados)
        existing_perms = super_admin.permissions if isinstance(super_admin.permissions, list) else []
        new_perms = []
        
        for p in perms_to_assign:
            if p.slug not in existing_perms:
                new_perms.append(p.slug)
                
        if new_perms:
            super_admin.permissions = existing_perms + new_perms
            db.add(super_admin)
            await db.commit()
            print("Permisos asignados al rol 'super_admin'.")
        else:
            print("El rol 'super_admin' ya tenía todos los permisos.")

if __name__ == "__main__":
    asyncio.run(seed_roles_and_permissions())
