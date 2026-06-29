import asyncio
import sys
from src.core.database import engine, Base

# Importar los modelos para que Base.metadata los registre
import src.models.user
import src.models.wallet
import src.models.security

async def main():
    print("Creando tablas faltantes en la base de datos...")
    async with engine.begin() as conn:
        # create_all crea solo las tablas que no existen. No borra datos de las existentes.
        await conn.run_sync(Base.metadata.create_all)
    print("¡Tablas creadas con éxito!")

if __name__ == "__main__":
    asyncio.run(main())
