import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def migrate_tables():
    input_file = "../backup_gloint_db.sql"
    if not os.path.exists(input_file):
        print(f"❌ No se encontró el archivo {input_file}")
        return

    tables_to_backup = {
        'investors': 'investor_respaldo',
        'investment_requests': 'investment_requests_respaldo',
        'retiros': 'retiros_respaldo'
    }

    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'db'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'root'),
            database=os.getenv('DB_NAME', 'glointpruebas_db')
        )
        cursor = connection.cursor()
    except Exception as e:
        print(f"❌ Error conectando a la base de datos: {e}")
        return

    try:
        cursor.execute("SET FOREIGN_KEY_CHECKS=0;")
        
        for src_table, dest_table in tables_to_backup.items():
            print(f"🚀 Procesando {src_table} -> {dest_table}...")
            
            cursor.execute(f"DROP TABLE IF EXISTS `{dest_table}`;")
            
            in_create = False
            create_lines = []
            
            with open(input_file, 'r', encoding='utf-8') as f:
                for line in f:
                    # Capture CREATE TABLE
                    if line.startswith(f"CREATE TABLE `{src_table}`"):
                        in_create = True
                        create_lines.append(f"CREATE TABLE `{dest_table}` (\n")
                        continue
                        
                    if in_create:
                        if line.startswith(") ENGINE="):
                            # Fix trailing comma in the previous line
                            if create_lines:
                                last_line = create_lines[-1].strip()
                                if last_line.endswith(','):
                                    create_lines[-1] = "  " + last_line[:-1] + "\n"
                            
                            create_lines.append(line)
                            in_create = False
                            
                            create_stmt = "".join(create_lines)
                            try:
                                cursor.execute(create_stmt)
                            except Exception as e:
                                print(f"⚠️ Error creando tabla {dest_table}: {e}")
                                print(create_stmt)
                            continue
                            
                        # Skip constraints to avoid naming collisions
                        if "CONSTRAINT " in line:
                            continue
                            
                        create_lines.append(line)
                        continue
                    
                    # Capture INSERT INTO
                    if line.startswith(f"INSERT INTO `{src_table}`"):
                        insert_stmt = line.replace(f"INSERT INTO `{src_table}`", f"INSERT INTO `{dest_table}`")
                        try:
                            cursor.execute(insert_stmt)
                        except Exception as e:
                            print(f"⚠️ Error insertando datos en {dest_table}: {e}")
                            
            connection.commit()
            print(f"✅ ¡Restauración completa para {dest_table}!")

    except Exception as e:
        print(f"⚠️ Error general: {e}")
    finally:
        cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
        connection.close()
        print("✅ Proceso finalizado.")

if __name__ == "__main__":
    migrate_tables()
