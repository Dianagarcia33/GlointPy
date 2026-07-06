import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import async_session_maker
from src.models.security import Permission, Role

async def sync_all_permissions():
    async with async_session_maker() as db:
        print("🚀 Iniciando sincronización total de permisos...")
        
        # Lista definitiva de permisos basada en la auditoría del código
        all_required_permissions = [
            {"slug": "wallets:view", "name": "Ver Billetera", "module": "billetera", "description": "Permite ver el saldo y transacciones de la billetera"},
            {"slug": "investments:view", "name": "Ver Menú Inversiones", "module": "inversiones", "description": "Permite ver el menú lateral de inversiones"},
            {"slug": "ver_mis_inversiones", "name": "Cargar Inversiones Propias", "module": "dashboard", "description": "Permite visualizar el resumen de inversiones en el dashboard"},
            {"slug": "admin.investments.reales", "name": "Ver Inversiones Activas (Admin)", "module": "administración", "description": "Permite a los administradores ver todas las inversiones reales"},
            {"slug": "admin.investments.requests", "name": "Gestionar Solicitudes (Admin)", "module": "administración", "description": "Permite aprobar o rechazar nuevas solicitudes"},
            {"slug": "admin.roles.manage", "name": "Gestionar Roles", "module": "administración", "description": "Permite crear, editar y eliminar roles y permisos"},
            {"slug": "manage_system_events", "name": "Ver Auditoría del Sistema", "module": "administración", "description": "Permite consultar los logs y eventos del sistema"},
            {"slug": "superadmin_tools", "name": "Herramientas de Superadmin", "module": "sistema", "description": "Acceso a herramientas avanzadas de desarrollo"},
        ]
        
        # 1. Crear permisos faltantes en la DB
        for p_data in all_required_permissions:
            stmt = select(Permission).where(Permission.slug == p_data["slug"])
            result = await db.execute(stmt)
            perm = result.scalar_one_or_none()
            
            if not perm:
                perm = Permission(**p_data)
                db.add(perm)
                print(f"✅ Permiso '{p_data['slug']}' creado con éxito.")
            else:
                # Actualizar información por si acaso
                perm.name = p_data["name"]
                perm.module = p_data["module"]
                perm.description = p_data["description"]
                print(f"🔄 Permiso '{p_data['slug']}' ya existía (información actualizada).")
                
        await db.commit()
        
        # 2. Asignar los permisos básicos al rol 'investor' o 'inversionista'
        stmt = select(Role).where(Role.name.in_(["investor", "inversionista"]))
        result = await db.execute(stmt)
        investor_roles = result.scalars().all()
        
        investor_slugs = ["wallets:view", "investments:view", "ver_mis_inversiones"]
        
        for role in investor_roles:
            current_perms = role.permissions if isinstance(role.permissions, list) else []
            new_perms = list(set(current_perms + investor_slugs))
            role.permissions = new_perms
            print(f"🛡️  Permisos básicos asignados al rol '{role.name}'.")
            
        # 3. Asignar TODOS los permisos al rol 'super_admin' y 'admin'
        stmt = select(Role).where(Role.name.in_(["super_admin", "admin"]))
        result = await db.execute(stmt)
        admin_roles = result.scalars().all()
        
        all_slugs = [p["slug"] for p in all_required_permissions]
        
        for role in admin_roles:
            role.permissions = all_slugs
            print(f"👑 Todos los permisos asignados al rol administrador '{role.name}'.")
            
        await db.commit()
        print("✨ ¡Sincronización completada! Todos los roles están listos.")

if __name__ == "__main__":
    asyncio.run(sync_all_permissions())
