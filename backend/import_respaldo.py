import asyncio
import os
import pymysql
from pymysql.constants import CLIENT
from dotenv import load_dotenv

load_dotenv()

def import_sql_files():
    files = [
        "restore_investor_respaldo.sql",
        "restore_investment_requests_respaldo.sql",
        "restore_retiros_respaldo.sql"
    ]
    
    print("Conectando a la base de datos de forma nativa para ejecutar multi-statements...")
    
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'db'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'root'),
            database=os.getenv('DB_NAME', 'gloint_db'),
            client_flag=CLIENT.MULTI_STATEMENTS
        )
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {e}")
        return

    try:
        with connection.cursor() as cursor:
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
                    
                # Limpiar cualquier coma suelta y reemplazar el nombre del constraint
                sql_content = sql_content.replace('CONSTRAINT `investment_requests_chk_1`', 'CONSTRAINT `inv_req_respaldo_chk_1`')
                sql_content = sql_content.replace('/*!40101 SET character_set_client = @saved_cs_client */;', '')
                import re
                sql_content = re.sub(r',\s*\n\)\s*ENGINE', '\n) ENGINE', sql_content)
                
                # IMPORTANT: El volcado de MySQL hace LOCK TABLES, pero el script de parseo omitió el UNLOCK TABLES
                # al final del archivo. Añadimos explícitamente UNLOCK TABLES para liberar la sesión.
                sql_content += "\nUNLOCK TABLES;\n"
                
                print(f"🚀 Iniciando restauración nativa para {fname}...")
                try:
                    cursor.execute(sql_content)
                    connection.commit()
                    print(f"✅ ¡Restauración completa para {fname}!")
                except Exception as e:
                    print(f"⚠️ Error en {fname}: {e}")
                    
    finally:
        connection.close()
        print("✅ Proceso finalizado.")

if __name__ == "__main__":
    import_sql_files()
