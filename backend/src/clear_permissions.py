import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker

async def clear_tables():
    async with async_session_maker() as db:
        print("Iniciando borrado total de permisos y relaciones...")
        # Borrar primero la tabla puente para evitar errores de llaves foraneas
        await db.execute(text("DELETE FROM role_permissions"))
        # Borrar la tabla de permisos
        await db.execute(text("DELETE FROM permissions"))
        
        # Opcional: Reiniciar los contadores de ID (AUTO_INCREMENT) para que empiecen en 1
        try:
            await db.execute(text("ALTER TABLE permissions AUTO_INCREMENT = 1"))
        except Exception:
            pass
            
        await db.commit()
        print("¡Tablas vaciadas exitosamente! El sistema está listo para los nuevos permisos.")

if __name__ == "__main__":
    asyncio.run(clear_tables())
