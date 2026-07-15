import asyncio
import os
import sys

# Asegurar que los imports de src funcionen correctamente
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.database import async_session_maker
from src.models.security import Permission, Role, role_permissions
from sqlalchemy.future import select
from sqlalchemy import insert

async def main():
    print("Iniciando conexión a la base de datos...")
    
    # Lista de permisos nuevos que creamos en el frontend
    new_permissions = [
        {"name": "dashboard:view_kpis", "description": "Ver KPIs en Dashboard", "module": "dashboard"},
        {"name": "dashboard:view_quick_actions", "description": "Ver acciones rápidas en Dashboard", "module": "dashboard"},
        {"name": "dashboard:view_investments", "description": "Ver listado de mis inversiones", "module": "dashboard"},
        {"name": "dashboard:view_requests", "description": "Ver solicitudes pendientes", "module": "dashboard"},
    ]
    
    async with async_session_maker() as db:
        
        # 1. Crear los permisos en la base de datos si no existen
        inserted_perms = []
        for p in new_permissions:
            result = await db.execute(select(Permission).where(Permission.name == p["name"]))
            perm = result.scalars().first()
            if not perm:
                print(f"Creando permiso en BD: {p['name']}")
                perm = Permission(name=p["name"], description=p["description"], module=p["module"])
                db.add(perm)
                await db.commit()
                await db.refresh(perm)
            inserted_perms.append(perm)
            
        print("Permisos registrados en el sistema.")
        
        # 2. Buscar el rol oficial de Inversionista
        role_result = await db.execute(select(Role).where(Role.name.ilike("%invest%")))
        role = role_result.scalars().first()
        
        if not role:
            role_result = await db.execute(select(Role).where(Role.name.ilike("%inversionista%")))
            role = role_result.scalars().first()
            
        # 3. Vincular los permisos al rol
        if role:
            print(f"\\nRol Inversionista encontrado: {role.name}. Asignando permisos nuevos...")
            for perm in inserted_perms:
                # Verificar si ya tiene este permiso para no duplicar
                check = await db.execute(select(role_permissions).where(
                    (role_permissions.c.role_id == role.id) & 
                    (role_permissions.c.permission_id == perm.id)
                ))
                if not check.first():
                    await db.execute(insert(role_permissions).values(
                        role_id=role.id,
                        permission_id=perm.id
                    ))
                    print(f"✅ Permiso '{perm.name}' asignado al rol '{role.name}'.")
            
            await db.commit()
            print("\\n¡Éxito total! Permisos creados y asignados al Inversionista automáticamente.")
        else:
            print("Rol Inversionista no encontrado.")

if __name__ == "__main__":
    asyncio.run(main())
