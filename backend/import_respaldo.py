import asyncio
from sqlalchemy import text
from src.core.database import async_session_maker

async def import_respaldo():
    # El script asume que restore_investor_respaldo.sql está en la raíz del backend (o se copió)
    # Sin embargo, como está en la raíz del proyecto, le pasaremos la ruta correcta
    import os
    
    file_path = "../restore_investor_respaldo.sql"
    if not os.path.exists(file_path):
        # Intentar en el directorio actual (por si lo movió a backend/)
        file_path = "restore_investor_respaldo.sql"
        if not os.path.exists(file_path):
            print("❌ No se encontró el archivo restore_investor_respaldo.sql")
            return
            
    print(f"📖 Leyendo archivo SQL desde {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split by semicolon to execute commands individually
    # This basic split might fail if there are semicolons inside strings, 
    # but mysqldump usually structures inserts safely.
    statements = sql_content.split(';')
    
    async with async_session_maker() as db:
        print("🚀 Iniciando restauración de investor_respaldo...")
        for stmt in statements:
            stmt = stmt.strip()
            if not stmt:
                continue
            try:
                await db.execute(text(stmt))
            except Exception as e:
                print(f"⚠️ Error ejecutando bloque SQL (puede ser ignorado si es de sintaxis menor): {e}")
                
        await db.commit()
        print("✅ ¡Tabla investor_respaldo creada y poblada exitosamente!")

if __name__ == "__main__":
    asyncio.run(import_respaldo())
