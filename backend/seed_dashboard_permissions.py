import asyncio
import os
import sys

# Añadir el directorio base al PYTHONPATH para poder importar módulos de src
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select
from src.core.database import SessionLocal
from src.models.security import Permission, Role, role_permissions

# Lista de nuevos permisos para el dashboard
NEW_PERMISSIONS = [
    {
        "name": "dashboard:view_kpis",
        "description": "Ver HeroCard y KPIs en el Dashboard",
        "module": "dashboard"
    },
    {
        "name": "dashboard:view_quick_actions",
        "description": "Ver acciones rápidas en el Dashboard",
        "module": "dashboard"
    },
    {
        "name": "dashboard:view_investments",
        "description": "Ver listado de inversiones en el Dashboard",
        "module": "dashboard"
    },
    {
        "name": "dashboard:view_requests",
        "description": "Ver pestaña de solicitudes de inversión",
        "module": "dashboard"
    }
]

async def seed_dashboard_permissions():
    print("Iniciando seed de permisos del dashboard...")
    
    async with SessionLocal() as db:
        try:
            # 1. Insertar permisos si no existen
            created_perms = []
            for perm_data in NEW_PERMISSIONS:
                stmt = select(Permission).where(Permission.name == perm_data["name"])
                result = await db.execute(stmt)
                existing_perm = result.scalars().first()
                
                if not existing_perm:
                    new_perm = Permission(
                        name=perm_data["name"],
                        description=perm_data["description"],
                        module=perm_data["module"]
                    )
                    db.add(new_perm)
                    await db.flush() # Para obtener el ID
                    created_perms.append(new_perm)
                    print(f"[+] Permiso creado: {perm_data['name']}")
                else:
                    created_perms.append(existing_perm)
                    print(f"[*] Permiso ya existe: {perm_data['name']}")
            
            # 2. Buscar el rol "Inversionista" (ID 5 o por nombre)
            stmt_role = select(Role).where(
                (Role.id == 5) | (Role.name.ilike('%inversionista%')) | (Role.name.ilike('%investor%'))
            )
            result_role = await db.execute(stmt_role)
            investor_role = result_role.scalars().first()
            
            if investor_role:
                print(f"\nAsignando permisos al rol: {investor_role.name} (ID: {investor_role.id})")
                
                # Asignación manual en la tabla pivot para evitar problemas de carga de ORM
                for perm in created_perms:
                    # Verificar si ya lo tiene
                    from sqlalchemy import text
                    check_stmt = text("SELECT 1 FROM role_permissions WHERE role_id = :role_id AND permission_id = :perm_id")
                    res = await db.execute(check_stmt, {"role_id": investor_role.id, "perm_id": perm.id})
                    if not res.first():
                        insert_stmt = text("INSERT INTO role_permissions (role_id, permission_id) VALUES (:role_id, :perm_id)")
                        await db.execute(insert_stmt, {"role_id": investor_role.id, "perm_id": perm.id})
                        print(f"  -> Permiso '{perm.name}' asignado exitosamente.")
                    else:
                        print(f"  -> Permiso '{perm.name}' ya estaba asignado.")
            else:
                print("\n[!] No se encontró el rol Inversionista (ID 5). Tendrás que asignar los permisos manualmente desde el panel de admin.")
            
            await db.commit()
            print("\n¡Seed finalizado exitosamente!")
            
        except Exception as e:
            await db.rollback()
            print(f"Error durante el seed: {e}")

if __name__ == "__main__":
    asyncio.run(seed_dashboard_permissions())
