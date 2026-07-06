import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import async_session_maker
from src.models.security import Permission, Role

async def seed_roles_and_permissions():
    async with async_session_maker() as db:
        print("Iniciando seeder de permisos y roles...")
        
        # Recuperar la columna 'permissions' si fue eliminada por error
        try:
            from sqlalchemy import text
            await db.execute(text("ALTER TABLE roles ADD COLUMN permissions JSON NOT NULL"))
            await db.commit()
            print("Columna 'permissions' recuperada exitosamente en la tabla roles.")
        except Exception as e:
            # Si ya existe, MySQL arrojará un error (Duplicate column name), lo ignoramos.
            await db.rollback()
            pass
            
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
            
        # 5. Asignar los mismos permisos al rol 'admin' (que es el que el usuario usa)
        stmt = select(Role).where(Role.name == "admin")
        result = await db.execute(stmt)
        admin_role = result.scalar_one_or_none()
        
        if admin_role:
            existing_admin_perms = admin_role.permissions if isinstance(admin_role.permissions, list) else []
            new_admin_perms = []
            
            for p in perms_to_assign:
                if p.slug not in existing_admin_perms:
                    new_admin_perms.append(p.slug)
                    
            if new_admin_perms:
                admin_role.permissions = existing_admin_perms + new_admin_perms
                db.add(admin_role)
                await db.commit()
                print("Permisos asignados al rol 'admin'.")
            else:
                print("El rol 'admin' ya tenía todos los permisos.")

if __name__ == "__main__":
    asyncio.run(seed_roles_and_permissions())
