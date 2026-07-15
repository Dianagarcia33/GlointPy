import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.core.database import async_session_maker
from src.models.security import Permission, Role
from sqlalchemy.future import select

async def main():
    async with async_session_maker() as db:
        permissions_data = [
            {"name": "wallets:view", "description": "Acceso a la pagina de mi billetera"},
            {"name": "wallets:view_balance", "description": "Ver el saldo disponible en la billetera"},
            {"name": "wallets:view_history", "description": "Ver el historial de movimientos de la billetera"},
            {"name": "wallets:request_withdrawal", "description": "Solicitar retiro de fondos"},
            {"name": "wallets:new_investment", "description": "Realizar nueva inversion desde la billetera"}
        ]
        
        # Insert permissions
        for p_data in permissions_data:
            existing = await db.execute(select(Permission).where(Permission.name == p_data["name"]))
            if not existing.scalars().first():
                db.add(Permission(name=p_data["name"], description=p_data["description"]))
                print(f"Permiso {p_data['name']} añadido.")
                
        await db.commit()
        
        # Get investor role
        role_res = await db.execute(select(Role).where(Role.name == "inversionista"))
        investor_role = role_res.scalars().first()
        
        if not investor_role:
            print("Rol 'inversionista' no encontrado.")
            return
            
        # Get all permissions
        perms_res = await db.execute(select(Permission).where(Permission.name.in_([p["name"] for p in permissions_data])))
        perms = perms_res.scalars().all()
        
        # Load existing role permissions
        await db.refresh(investor_role, ['permissions'])
        
        # Add missing
        for p in perms:
            if p not in investor_role.permissions:
                investor_role.permissions.append(p)
                print(f"Permiso {p.name} asignado al rol inversionista.")
                
        await db.commit()
        print("Finalizado con exito.")

if __name__ == "__main__":
    asyncio.run(main())
