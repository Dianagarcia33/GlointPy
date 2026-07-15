import asyncio
import sys
import os
from datetime import datetime

# Add the root project directory to sys.path so we can import src modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.database import async_session_maker
from src.models.user import User
from src.models.security import Role
from src.core.security import get_password_hash
from sqlalchemy import select

async def main():
    # Usaremos una contraseña por defecto (123456789)
    default_password_hash = get_password_hash("123456789")
    
    users_data = [
        {
            "id": 5,
            "name": 'Betzy Leal Rubio',
            "email": 'dpto.projects@gloint.com.co',
            "password_hash": default_password_hash,
            "must_change_password": True,
            "is_active": True,
            "permissions_override": None,
            "created_at": datetime.strptime('2025-10-20 03:18:28', '%Y-%m-%d %H:%M:%S'),
            "updated_at": datetime.strptime('2026-05-20 15:46:06', '%Y-%m-%d %H:%M:%S')
        },
        {
            "id": 3,
            "name": 'Directivo de Inversiones',
            "email": 'directivo@gloint.com',
            "password_hash": default_password_hash,
            "must_change_password": True,
            "is_active": True,
            "permissions_override": None,
            "created_at": datetime.strptime('2025-10-19 20:22:30', '%Y-%m-%d %H:%M:%S'),
            "updated_at": datetime.strptime('2025-10-19 20:22:30', '%Y-%m-%d %H:%M:%S')
        },
        {
            "id": 6,
            "name": 'Karen Moreno',
            "email": 'dpto.directivo@gloint.com.co',
            "password_hash": default_password_hash,
            "must_change_password": True,
            "is_active": True,
            "permissions_override": None,
            "created_at": datetime.strptime('2025-10-20 03:18:28', '%Y-%m-%d %H:%M:%S'),
            "updated_at": datetime.strptime('2026-06-22 17:06:31', '%Y-%m-%d %H:%M:%S')
        },
        {
            "id": 568,
            "name": 'Miguel Emilio Soto Perez',
            "email": 'directivo2@gloint.com.co',
            "password_hash": default_password_hash,
            "must_change_password": True,
            "is_active": True,
            "permissions_override": None,
            "created_at": datetime.strptime('2026-04-09 17:11:36', '%Y-%m-%d %H:%M:%S'),
            "updated_at": datetime.strptime('2026-06-10 16:51:37', '%Y-%m-%d %H:%M:%S')
        },
        {
            "id": 695,
            "name": 'Isabela Salazar',
            "email": 'directivo3@gloint.com.co',
            "password_hash": default_password_hash,
            "must_change_password": True,
            "is_active": True,
            "permissions_override": None,
            "created_at": datetime.strptime('2026-05-20 11:02:06', '%Y-%m-%d %H:%M:%S'),
            "updated_at": datetime.strptime('2026-05-20 11:02:06', '%Y-%m-%d %H:%M:%S')
        }
    ]

    async with async_session_maker() as db:
        # Get the directivo_inversion role
        role_result = await db.execute(select(Role).where(Role.name == "directivo_inversion"))
        directivo_role = role_result.scalars().first()
        
        if not directivo_role:
            print("El rol 'directivo_inversion' no existe en la base de datos.")
            return

        for data in users_data:
            # Check if user already exists
            user_result = await db.execute(select(User).where((User.id == data["id"]) | (User.email == data["email"])))
            existing_user = user_result.scalars().first()
            
            if existing_user:
                print(f"El usuario {data['email']} ya existe. Omitiendo.")
                continue
                
            new_user = User(**data)
            new_user.roles.append(directivo_role)
            db.add(new_user)
            print(f"Creando usuario {data['email']}...")
            
        await db.commit()
        print("¡Todos los usuarios directivos han sido creados exitosamente!")

if __name__ == "__main__":
    asyncio.run(main())
