import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker, engine, Base
import src.models.user  # Add this to register users table
import src.models.user_bank_account  # Import to register with Base

async def migrate_bank_accounts():
    async with engine.begin() as conn:
        print("Creando tabla user_bank_accounts si no existe...")
        await conn.run_sync(Base.metadata.create_all)
        print("Tabla user_bank_accounts procesada.")

    async with async_session_maker() as db:
        print("Verificando si existen las columnas antiguas en investors...")
        # Check if columns exist before dropping to avoid errors
        res = await db.execute(text("SHOW COLUMNS FROM investors LIKE 'banco'"))
        if res.fetchone():
            print("Eliminando columnas banco, tipo_cuenta, numero_cuenta de investors...")
            await db.execute(text("ALTER TABLE investors DROP COLUMN banco, DROP COLUMN tipo_cuenta, DROP COLUMN numero_cuenta;"))
            print("Columnas eliminadas exitosamente.")
        else:
            print("Las columnas ya fueron eliminadas o no existen.")

if __name__ == "__main__":
    asyncio.run(migrate_bank_accounts())
