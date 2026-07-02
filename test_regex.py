import re
with open("restore_retiros_respaldo.sql", "r") as f:
    sql_content = f.read()

fixed_content = re.sub(r',\s*\n\)\s*ENGINE', '\n) ENGINE', sql_content)
if ",\n) ENGINE" in sql_content and ",\n) ENGINE" not in fixed_content:
    print("Regex fixed the comma successfully")
else:
    print("Regex failed")
    print(sql_content[sql_content.find(") ENGINE")-20:sql_content.find(") ENGINE")+20])

