import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker

async def prepare_database():
    print("Iniciando la preparación de la base de datos para migración...")
    async with async_session_maker() as session:
        try:
            # 1. Crear tablas de respaldo para wallets (clonando la estructura real)
            print("Creando tablas wallet_respaldo y wallet_transactions_respaldo...")
            await session.execute(text("CREATE TABLE IF NOT EXISTS wallet_respaldo LIKE wallets"))
            await session.execute(text("CREATE TABLE IF NOT EXISTS wallet_transactions_respaldo LIKE wallet_transactions"))
            
            # 2. Copiar los datos actuales de wallets hacia el respaldo (usamos IGNORE para evitar duplicados si se corre 2 veces)
            print("Copiando datos de wallets a tablas de respaldo...")
            await session.execute(text("INSERT IGNORE INTO wallet_respaldo SELECT * FROM wallets"))
            await session.execute(text("INSERT IGNORE INTO wallet_transactions_respaldo SELECT * FROM wallet_transactions"))
            
            # 3. Limpiar TODAS las tablas de producción (las de V1 que ya tienen respaldo)
            # NOTA: Desactivamos las foreign keys temporalmente para poder truncar sin problemas de relación
            print("Vaciando tablas de producción (dejando solo tablas maestras y usuarios)...")
            await session.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            
            tablas_a_limpiar = [
                "wallet_transactions",
                "wallets",
                "contract_histories",
                "contract_accelerations",
                "retiros",
                "investment_requests",
                "investors"
            ]
            
            for tabla in tablas_a_limpiar:
                print(f"  -> Truncando {tabla}...")
                await session.execute(text(f"TRUNCATE TABLE {tabla}"))
                
            await session.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            
            await session.commit()
            print("¡Éxito! Las tablas de respaldo están listas y la base de datos de producción quedó limpia.")
            
        except Exception as e:
            await session.rollback()
            print(f"Error durante el proceso: {e}")

if __name__ == "__main__":
    asyncio.run(prepare_database())
