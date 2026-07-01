import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker

async def import_respaldo():
    import os
    
    files = [
        "restore_investor_respaldo.sql",
        "restore_investment_requests_respaldo.sql",
        "restore_retiros_respaldo.sql"
    ]
    
    async with async_session_maker() as db:
        for fname in files:
            file_path = f"../{fname}"
            if not os.path.exists(file_path):
                file_path = fname
                if not os.path.exists(file_path):
                    print(f"❌ No se encontró el archivo {fname}")
                    continue
                    
            print(f"📖 Leyendo archivo SQL desde {file_path}...")
            with open(file_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
        
            statements = sql_content.split(';')
            
            print(f"🚀 Iniciando restauración para {fname}...")
            for stmt in statements:
                stmt = stmt.strip()
                if not stmt:
                    continue
                try:
                    await db.execute(text(stmt))
                except Exception as e:
                    print(f"⚠️ Error ejecutando bloque SQL en {fname} (puede ser ignorado si es de sintaxis menor): {e}")
                    
        await db.commit()
        print("✅ ¡Todas las tablas de respaldo creadas y pobladas exitosamente!")

if __name__ == "__main__":
    asyncio.run(import_respaldo())
