import asyncio
from sqlalchemy import select, insert, text
from src.core.database import async_session_maker
from src.models.security import Role, Permission, role_permissions

async def add_wallet_permission():
    async with async_session_maker() as db:
        print("Buscando o creando permiso 'wallets:view'...")
        # 1. Crear el permiso si no existe (RAW SQL to avoid model mismatches)
        check_perm = await db.execute(text("SELECT id FROM permissions WHERE name = 'wallets:view'"))
        perm_row = check_perm.fetchone()
        
        if not perm_row:
            await db.execute(text(
                "INSERT INTO permissions (slug, name, module, description, is_active) "
                "VALUES ('wallets-view', 'wallets:view', 'wallets', 'Ver información de la billetera', 1)"
            ))
            check_perm = await db.execute(text("SELECT id FROM permissions WHERE name = 'wallets:view'"))
            perm_row = check_perm.fetchone()
            print("Permiso 'wallets:view' creado con éxito.")
        else:
            print("El permiso 'wallets:view' ya existe.")
            
        permission_id = perm_row[0]

        # 2. Buscar rol Inversionista
        role_stmt = select(Role).where(Role.name == 'Inversionista')
        role_res = await db.execute(role_stmt)
        role = role_res.scalars().first()
        
        if not role:
            print("¡ERROR! Rol 'Inversionista' no encontrado.")
            return

        # 3. Asignar permiso al rol (evitar duplicados usando SQL crudo)
        check_pivot = await db.execute(
            text(f"SELECT 1 FROM role_permissions WHERE role_id = {role.id} AND permission_id = {permission_id}")
        )
        if not check_pivot.fetchone():
            await db.execute(
                text(f"INSERT INTO role_permissions (role_id, permission_id) VALUES ({role.id}, {permission_id})")
            )
            print(f"Permiso 'wallets:view' asignado al rol 'Inversionista' (ID: {role.id}).")
        else:
            print("El rol 'Inversionista' ya tenía este permiso asignado.")
            
        await db.commit()
        print("¡Proceso finalizado!")

if __name__ == "__main__":
    asyncio.run(add_wallet_permission())
