import asyncio
from sqlalchemy import select, insert, text
from src.core.database import async_session_maker
from src.models.security import Role

async def add_investments_permission():
    async with async_session_maker() as db:
        print("Buscando o creando permiso 'investments:view'...")
        # 1. Crear el permiso si no existe
        check_perm = await db.execute(text("SELECT id FROM permissions WHERE name = 'investments:view'"))
        perm_row = check_perm.fetchone()
        
        if not perm_row:
            await db.execute(text(
                "INSERT INTO permissions (slug, name, module, description, is_active) "
                "VALUES ('investments-view', 'investments:view', 'investments', 'Ver información de las inversiones globales', 1)"
            ))
            check_perm = await db.execute(text("SELECT id FROM permissions WHERE name = 'investments:view'"))
            perm_row = check_perm.fetchone()
            print("Permiso 'investments:view' creado con éxito.")
        else:
            print("El permiso 'investments:view' ya existe.")
            
        permission_id = perm_row[0]

        # 2. Asignar permiso a roles de Admin
        roles_check = await db.execute(text("SELECT id, name FROM roles WHERE name LIKE '%Admin%'"))
        admin_roles = roles_check.fetchall()

        if not admin_roles:
            print("¡ERROR! No se encontraron roles de administrador.")
            return

        # 3. Iterar y asignar
        for role_id, role_name in admin_roles:
            check_pivot = await db.execute(
                text(f"SELECT 1 FROM role_permissions WHERE role_id = {role_id} AND permission_id = {permission_id}")
            )
            if not check_pivot.fetchone():
                await db.execute(
                    text(f"INSERT INTO role_permissions (role_id, permission_id) VALUES ({role_id}, {permission_id})")
                )
                print(f"Permiso 'investments:view' asignado al rol '{role_name}' (ID: {role_id}).")
            else:
                print(f"El rol '{role_name}' ya tenía este permiso asignado.")
                
        await db.commit()
        print("¡Proceso finalizado con éxito!")

if __name__ == "__main__":
    asyncio.run(add_investments_permission())
