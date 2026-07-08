import sys
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

def restore_investors():
    backup_file = "../backup_gloint_db.sql"
    if not os.path.exists(backup_file):
        print(f"Error: {backup_file} no encontrado.")
        return

    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST', 'db'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'root'),
            database=os.getenv('DB_NAME', 'glointpruebas_db')
        )
        cursor = conn.cursor()
    except Exception as e:
        print(f"Error de conexión: {e}")
        return

    try:
        cursor.execute("SET FOREIGN_KEY_CHECKS=0;")
        
        # 1. Crear tabla temporal
        temp_table = "investors_temp_restore"
        cursor.execute(f"DROP TABLE IF EXISTS `{temp_table}`;")
        
        in_create = False
        create_lines = []
        
        print(f"Leyendo backup para crear {temp_table} e insertar datos...")
        with open(backup_file, 'r', encoding='utf-8') as f:
            for line in f:
                if line.startswith("CREATE TABLE `investors`"):
                    in_create = True
                    create_lines.append(f"CREATE TABLE `{temp_table}` (\n")
                    continue
                
                if in_create:
                    if line.startswith(") ENGINE="):
                        if create_lines:
                            last_line = create_lines[-1].strip()
                            if last_line.endswith(','):
                                create_lines[-1] = "  " + last_line[:-1] + "\n"
                        create_lines.append(line)
                        in_create = False
                        
                        create_stmt = "".join(create_lines)
                        cursor.execute(create_stmt)
                        continue
                    
                    if "CONSTRAINT " in line:
                        continue
                        
                    create_lines.append(line)
                    continue
                
                if line.startswith("INSERT INTO `investors`"):
                    insert_stmt = line.replace("INSERT INTO `investors`", f"INSERT INTO `{temp_table}`")
                    cursor.execute(insert_stmt)
                    
        print(f"Datos insertados en {temp_table}. Copiando a investors...")
        
        # 2. Encontrar columnas en común
        cursor.execute(f"SHOW COLUMNS FROM `{temp_table}`")
        temp_cols = {row[0] for row in cursor.fetchall()}
        
        cursor.execute("SHOW COLUMNS FROM `investors`")
        target_cols = {row[0] for row in cursor.fetchall()}
        
        common_cols = list(temp_cols.intersection(target_cols))
        
        if not common_cols:
            print("No se encontraron columnas en común.")
            return
            
        cols_str = ", ".join([f"`{c}`" for c in common_cols])
        
        # 3. Insertar datos (ignorando duplicados por ID)
        insert_query = f"INSERT IGNORE INTO `investors` ({cols_str}) SELECT {cols_str} FROM `{temp_table}`"
        cursor.execute(insert_query)
        
        inserted_rows = cursor.rowcount
        print(f"Se copiaron {inserted_rows} registros a investors.")
        
        # 4. Limpiar
        cursor.execute(f"DROP TABLE IF EXISTS `{temp_table}`;")
        conn.commit()
        
        print("Restauración completada con éxito.")
        
    except Exception as e:
        print(f"Error durante el proceso: {e}")
        conn.rollback()
    finally:
        cursor.execute("SET FOREIGN_KEY_CHECKS=1;")
        conn.close()

if __name__ == "__main__":
    restore_investors()
