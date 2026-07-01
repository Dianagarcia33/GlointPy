import re

def extract_tables_data():
    input_file = "backup_gloint_db.sql"
    
    tables_to_backup = {
        'investors': 'investor_respaldo',
        'investment_requests': 'investment_requests_respaldo',
        'retiros': 'retiros_respaldo'
    }
    
    for src_table, dest_table in tables_to_backup.items():
        output_file = f"restore_{dest_table}.sql"
        in_table = False
        
        with open(input_file, 'r', encoding='utf-8') as f_in, open(output_file, 'w', encoding='utf-8') as f_out:
            f_out.write("SET FOREIGN_KEY_CHECKS=0;\n")
            f_out.write(f"DROP TABLE IF EXISTS `{dest_table}`;\n")
            
            for line in f_in:
                if line.startswith(f"CREATE TABLE `{src_table}`"):
                    in_table = True
                    line = line.replace(f"CREATE TABLE `{src_table}`", f"CREATE TABLE `{dest_table}`")
                    f_out.write(line)
                    continue
                    
                if in_table:
                    if line.startswith(f"/*!40000 ALTER TABLE `{src_table}` ENABLE KEYS */;") or line.startswith("UNLOCK TABLES;"):
                        line = line.replace(f"`{src_table}`", f"`{dest_table}`")
                        f_out.write(line)
                        in_table = False
                        continue
                        
                    line = line.replace(f"`{src_table}`", f"`{dest_table}`")
                    if "CONSTRAINT" in line and "FOREIGN KEY" in line:
                        continue
                    f_out.write(line)
                
                elif line.startswith(f"INSERT INTO `{src_table}`"):
                    line = line.replace(f"INSERT INTO `{src_table}`", f"INSERT INTO `{dest_table}`")
                    f_out.write(line)
                
                elif line.startswith(f"LOCK TABLES `{src_table}` WRITE;"):
                    in_table = True
                    line = line.replace(f"LOCK TABLES `{src_table}`", f"LOCK TABLES `{dest_table}`")
                    f_out.write(line)
                    
                elif line.startswith(f"/*!40000 ALTER TABLE `{src_table}` DISABLE KEYS */;"):
                    in_table = True
                    line = line.replace(f"`{src_table}`", f"`{dest_table}`")
                    f_out.write(line)
    
            f_out.write("SET FOREIGN_KEY_CHECKS=1;\n")
            print(f"Archivo {output_file} generado exitosamente.")
            
        # Post-process the file to fix trailing commas left by removing constraints
        with open(output_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace trailing comma before closing parenthesis of CREATE TABLE
        content = re.sub(r',\n\) ENGINE', '\n) ENGINE', content)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    extract_tables_data()
