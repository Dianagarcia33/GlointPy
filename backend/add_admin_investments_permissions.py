import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker

async def add_admin_investments_permissions():
    permissions = [
        {
            "slug": "admin-investments-reales",
            "name": "admin.investments.reales",
            "module": "admin_investments",
            "description": "Ver la pestaña de inversiones activas y migradas en administración"
        },
        {
            "slug": "admin-investments-requests",
            "name": "admin.investments.requests",
            "module": "admin_investments",
            "description": "Ver la pestaña de solicitudes de inversión pendientes en administración"
        }
    ]

    async with async_session_maker() as db:
        print("Buscando o creando permisos de administración de inversiones...")
        
        for perm in permissions:
            # 1. Crear el permiso si no existe
            check_perm = await db.execute(text(f"SELECT id FROM permissions WHERE name = '{perm['name']}'"))
            perm_row = check_perm.fetchone()
            
            if not perm_row:
                await db.execute(text(
                    f"INSERT INTO permissions (slug, name, module, description, is_active) "
                    f"VALUES ('{perm['slug']}', '{perm['name']}', '{perm['module']}', '{perm['description']}', 1)"
                ))
                check_perm = await db.execute(text(f"SELECT id FROM permissions WHERE name = '{perm['name']}'"))
                perm_row = check_perm.fetchone()
                print(f"Permiso '{perm['name']}' creado con éxito.")
            else:
                print(f"El permiso '{perm['name']}' ya existe.")
                
            permission_id = perm_row[0]

            # 2. Asignar permiso a roles de Admin (incluyendo Super Admin)
            roles_check = await db.execute(text("SELECT id, name FROM roles WHERE name LIKE '%Admin%'"))
            admin_roles = roles_check.fetchall()

            if not admin_roles:
                print("¡ERROR! No se encontraron roles de administrador.")
                continue

            # 3. Iterar y asignar
            for role_id, role_name in admin_roles:
                check_pivot = await db.execute(
                    text(f"SELECT 1 FROM role_permissions WHERE role_id = {role_id} AND permission_id = {permission_id}")
                )
                if not check_pivot.fetchone():
                    await db.execute(
                        text(f"INSERT INTO role_permissions (role_id, permission_id) VALUES ({role_id}, {permission_id})")
                    )
                    print(f"Permiso '{perm['name']}' asignado al rol '{role_name}' (ID: {role_id}).")
                else:
                    print(f"El rol '{role_name}' ya tenía este permiso asignado.")
                    
        await db.commit()
        print("¡Proceso finalizado con éxito!")

if __name__ == "__main__":
    asyncio.run(add_admin_investments_permissions())
