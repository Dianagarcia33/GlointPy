import asyncio
import os
import sys

# Hardcoded to /app because __file__ is not available when running via python -c
sys.path.insert(0, "/app")

from src.core.database import async_session_maker
from sqlalchemy import text

async def main():
    print("Iniciando limpieza y restauracion de tablas...")
    
    # Extract inserts from the backup file
    wallet_inserts = []
    retiros_inserts = []
    
    # The backup file must be available in the container or passed through stdin.
    # We will read from sys.stdin
    print("Leyendo sentencias SQL desde la entrada estandar...")
    lines = sys.stdin.readlines()
    
    for line in lines:
        if line.startswith("INSERT INTO `wallet_transactions`"):
            wallet_inserts.append(line)
        elif line.startswith("INSERT INTO `retiros`"):
            retiros_inserts.append(line)
            
    print(f"Encontradas {len(wallet_inserts)} sentencias para wallet_transactions.")
    print(f"Encontradas {len(retiros_inserts)} sentencias para retiros.")
    
    async with async_session_maker() as db:
        print("Desactivando Foreign Key Checks...")
        await db.execute(text("SET FOREIGN_KEY_CHECKS=0;"))
        
        print("Trunkeando tabla wallet_transactions...")
        await db.execute(text("TRUNCATE TABLE wallet_transactions;"))
        
        print("Trunkeando tabla retiros...")
        await db.execute(text("TRUNCATE TABLE retiros;"))
        
        print("Insertando datos del backup...")
        for insert in wallet_inserts:
            await db.execute(text(insert))
            
        for insert in retiros_inserts:
            await db.execute(text(insert))
            
        print("Reactivando Foreign Key Checks...")
        await db.execute(text("SET FOREIGN_KEY_CHECKS=1;"))
        
        await db.commit()
        print("¡Restauración completada con éxito!")

if __name__ == "__main__":
    asyncio.run(main())
