import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.models.security import Permission, Role, role_permissions
from sqlalchemy.future import select
from sqlalchemy import insert

CHAT_PERMISSIONS = [
    {"name": "chat:view", "description": "Acceder y ver el módulo de chat en tiempo real", "module": "chat"},
    {"name": "chat:send", "description": "Enviar mensajes en las conversaciones del chat", "module": "chat"},
    {"name": "admin.chat.manage", "description": "Administrar y moderar todas las salas de chat", "module": "chat"},
]

async def seed_chat_permissions():
    async with async_session_maker() as db:
        print("💬 Sincronizando permisos de Chat...")
        all_perms_map = {}

        for p_data in CHAT_PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.name == p_data["name"]))
            existing = result.scalars().first()
            if not existing:
                new_perm = Permission(**p_data)
                db.add(new_perm)
                await db.flush()
                print(f"✨ Permiso creado: {p_data['name']}")
                all_perms_map[p_data["name"]] = new_perm
            else:
                existing.description = p_data["description"]
                existing.module = p_data["module"]
                all_perms_map[p_data["name"]] = existing

        # Asignar permisos a roles de administración y comercial

        roles_res = await db.execute(select(Role))
        roles = roles_res.scalars().all()

        for role in roles:
            role_name_lower = role.name.lower()
            if "super" in role_name_lower or "admin" in role_name_lower or "comercial" in role_name_lower or "director" in role_name_lower:
                for p_name, perm in all_perms_map.items():
                    check = await db.execute(select(role_permissions).where(
                        (role_permissions.c.role_id == role.id) & 
                        (role_permissions.c.permission_id == perm.id)
                    ))
                    if not check.first():
                        await db.execute(insert(role_permissions).values(
                            role_id=role.id,
                            permission_id=perm.id
                        ))
                print(f"🔑 Permisos de chat asignados a: {role.name}")

        await db.commit()
        print("✅ Permisos de chat sincronizados correctamente.")

if __name__ == "__main__":
    asyncio.run(seed_chat_permissions())
