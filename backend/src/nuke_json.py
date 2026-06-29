import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker

async def nuke_permissions():
    async with async_session_maker() as db:
        print("Aniquilando la vieja columna JSON de la tabla roles...")
        await db.execute(text("UPDATE roles SET permissions = '[]'"))
        await db.commit()
        print("¡Permisos viejos eliminados de la base de datos!")

if __name__ == "__main__":
    asyncio.run(nuke_permissions())
