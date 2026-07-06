import asyncio
import sys
import os

# Añadir el directorio raíz al path para que Python encuentre los módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core.database import SessionLocal
from src.api.v1.endpoints.auditoria import migrate_simple_users, SimpleUserMigrationRequest, get_simple_users
from sqlalchemy import text

class MockUser:
    email = "superadmin@gloint.com"
    roles = []

async def main():
    print("Iniciando proceso de migración de usuarios sencillos (1 inversión)...")
    
    async with SessionLocal() as db:
        try:
            print("1. Obteniendo lista de usuarios sencillos...")
            users = await get_simple_users(db, current_user=MockUser())
            user_ids = [u['user_id'] for u in users]
            
            if not user_ids:
                print("✅ No hay usuarios sencillos pendientes por migrar en las tablas de respaldo.")
                return
                
            print(f"2. Se encontraron {len(user_ids)} usuarios sencillos. Calculando balances y ejecutando migración...")
            
            req = SimpleUserMigrationRequest(user_ids=user_ids)
            res = await migrate_simple_users(req, db, current_user=MockUser())
            
            print("✅ ¡Migración completada exitosamente!")
            print(f"➡️ Total de usuarios migrados: {res['migrated']}")
            print("Las wallets han sido creadas con el saldo exacto y las transacciones de historial (Rendimientos, Bonos, Retiros) han sido registradas en 'wallet_transactions'. Los datos de respaldo correspondientes han sido eliminados de las tablas '_respaldo'.")
            
        except Exception as e:
            print(f"❌ Ocurrió un error durante la migración: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
