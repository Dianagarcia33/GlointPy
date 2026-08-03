import asyncio
import os
import sys
from dotenv import load_dotenv

# Set sys.path so backend imports work properly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(".env")

from src.core.database import async_session_maker
from src.core.security import get_password_hash
from src.models.user import User
from sqlalchemy.future import select

async def main():
    new_password = sys.argv[1] if len(sys.argv) > 1 else "12345678"
    print(f"🔄 Iniciando actualización masiva de contraseñas de usuarios...")
    print(f"🔑 Nueva contraseña genérica a establecer: '{new_password}'")

    hashed_password = get_password_hash(new_password)

    async with async_session_maker() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        
        print(f"👥 Se encontraron {len(users)} usuarios en la base de datos.")

        updated_count = 0
        for user in users:
            user.password_hash = hashed_password
            user.must_change_password = False
            updated_count += 1

        await db.commit()
        print(f"✅ ¡ÉXITO! Se actualizaron las contraseñas de {updated_count} usuarios a '{new_password}'.")

if __name__ == "__main__":
    asyncio.run(main())
