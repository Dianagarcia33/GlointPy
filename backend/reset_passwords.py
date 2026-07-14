import asyncio
import os
import sys

# Asegurar que los imports de src funcionen correctamente
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.database import SessionLocal
from src.models.user import User
from src.core.security import get_password_hash
from sqlalchemy.future import select

async def main():
    print("Iniciando conexión a la base de datos...")
    async with SessionLocal() as db:
        print("Obteniendo usuarios que tienen un número de documento registrado...")
        result = await db.execute(select(User).where(User.document_id.isnot(None)))
        users = result.scalars().all()
        
        count = 0
        for u in users:
            # Excluir a la superadmin (para que tú no te bloquees)
            if u.is_superuser:
                continue
                
            if u.document_id and str(u.document_id).strip():
                new_pass = str(u.document_id).strip()
                
                # Generar el hash Bcrypt de la nueva contraseña (su número de documento)
                u.password_hash = get_password_hash(new_pass)
                
                # Encender la obligación de cambio de contraseña en su próximo inicio
                u.must_change_password = True
                
                # Limpiar cualquier bloqueo previo por si ya se equivocaron 5 veces
                u.failed_login_attempts = 0
                u.locked_until = None
                
                count += 1
                print(f"[{count}] Reseteando -> ID: {u.id} | Email: {u.email} | Clave Temp: {new_pass}")
                
        print("Guardando cambios en la base de datos...")
        await db.commit()
        print(f"\\n¡Éxito total! Se han reseteado {count} contraseñas.")

if __name__ == "__main__":
    asyncio.run(main())
