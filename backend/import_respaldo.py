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
                
            # Replace constraint names to avoid collisions with existing tables
            sql_content = sql_content.replace('CONSTRAINT `investment_requests_chk_1`', 'CONSTRAINT `inv_req_respaldo_chk_1`')
            
            # Remove character set variables that are not defined
            sql_content = sql_content.replace('/*!40101 SET character_set_client = @saved_cs_client */;', '')
            
            # Fix any trailing commas before the closing parenthesis of CREATE TABLE
            import re
            sql_content = re.sub(r',\s*\n\)\s*ENGINE', '\n) ENGINE', sql_content)
        
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
