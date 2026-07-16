import asyncio
import os
import sys
from dotenv import load_dotenv

# Asegurar que los módulos locales se puedan importar
sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.models.user import User
from src.models.security import Role
from src.core.security import get_password_hash
from sqlalchemy.future import select

async def seed_superadmin():
    async with async_session_maker() as db:
        # 1. Crear el rol SuperAdmin si no existe
        role_result = await db.execute(select(Role).where(Role.name == "SuperAdmin"))
        superadmin_role = role_result.scalars().first()
        
        if not superadmin_role:
            print("Creando rol SuperAdmin...")
            superadmin_role = Role(
                name="SuperAdmin",
                description="Administrador Supremo del Sistema",
                is_system_role="1"
            )
            db.add(superadmin_role)
            await db.commit()
            await db.refresh(superadmin_role)
            print("Rol SuperAdmin creado.")

        # 2. Crear el usuario administrador si no existe
        admin_email = "admin@gloint.com.co"
        user_result = await db.execute(select(User).where(User.email == admin_email))
        admin_user = user_result.scalars().first()
        
        if not admin_user:
            print(f"Creando usuario admin ({admin_email})...")
            admin_user = User(
                name="Super Administrador",
                email=admin_email,
                password_hash=get_password_hash("Admin123!"), # Cambiar en producción
                is_superuser=True,
                is_active=True,
                must_change_password=True # Se le obligará a cambiar esta contraseña
            )
            admin_user.roles.append(superadmin_role)
            db.add(admin_user)
            await db.commit()
            print(f"Usuario SuperAdmin creado exitosamente. Email: {admin_email} | Password: Admin123!")
        else:
            print(f"Usuario admin ({admin_email}) ya existe. Restaurando contraseña a Admin123!...")
            admin_user.password_hash = get_password_hash("Admin123!")
            admin_user.must_change_password = True
            admin_user.failed_login_attempts = 0
            admin_user.locked_until = None
            await db.commit()
            print("Contraseña restaurada exitosamente.")

if __name__ == "__main__":
    print("Iniciando seeder...")
    asyncio.run(seed_superadmin())
    print("Seeder finalizado.")
