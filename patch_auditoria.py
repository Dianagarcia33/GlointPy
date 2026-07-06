import sys
import re

with open('backend/src/api/v1/endpoints/auditoria.py', 'r') as f:
    content = f.read()

# Find get_inversiones_respaldo function
start_idx = content.find('@router.get("/respaldo"')
end_idx = content.find('@router.post("/migrar-batch")')

if start_idx == -1 or end_idx == -1:
    print("Could not find boundaries")
    sys.exit(1)

func_code = content[start_idx:end_idx]

# Replace function names and route
new_code = func_code.replace('@router.get("/respaldo"', '@router.get("/reales"')
new_code = new_code.replace('def get_inversiones_respaldo', 'def get_inversiones_reales')
new_code = new_code.replace('tabla de respaldo de inversiones (investor_respaldo o investment_requests_respaldo)', 'tablas reales de inversiones')

# Replace table names in queries
new_code = new_code.replace('investor_respaldo', 'investors')
new_code = new_code.replace('retiros_respaldo', 'retiros')
new_code = new_code.replace('investment_requests_respaldo', 'investment_requests')
new_code = new_code.replace('contract_accelerations_respaldo', 'contract_accelerations')
new_code = new_code.replace('contract_histories_respaldo', 'contract_histories')
new_code = new_code.replace('Error fetching from respaldo', 'Error fetching from reales')

# Now append it before the migrar-batch endpoint
new_full_content = content[:end_idx] + new_code + "\n" + content[end_idx:]

with open('backend/src/api/v1/endpoints/auditoria.py', 'w') as f:
    f.write(new_full_content)

print("Successfully added get_inversiones_reales endpoint.")
