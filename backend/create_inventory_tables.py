import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import engine, Base, async_session_maker
import src.models.inventory  # Importar modelos de inventario para registrarlos en Base.metadata
from src.models.inventory import InventoryCategory
from src.services.security_service import SecurityService
from sqlalchemy.future import select

DEFAULT_CATEGORIES = [
    {"name": "Papelería y Útiles", "description": "Resmas, bolígrafos, carpetas, libretas y consumibles de oficina.", "item_type": "OFFICE_SUPPLY"},
    {"name": "Cafetería y Aseo", "description": "Café, azúcar, vasos, elementos de limpieza e higiene corporativa.", "item_type": "OFFICE_SUPPLY"},
    {"name": "Tecnología y Accesorios", "description": "Periféricos, cables, adaptadores, suministros de cómputo.", "item_type": "GENERAL"},
    {"name": "Merchandising y Comercial", "description": "Material publicitario, agendas de marca, camisetas y kits de bienvenida.", "item_type": "PRODUCT"},
    {"name": "Mobiliario y Enseres", "description": "Sillas, organizadores, elementos de soporte para la oficina.", "item_type": "OFFICE_SUPPLY"},
]

async def setup_inventory():
    print("📦 [1/3] Creando tablas de Inventario en la Base de Datos...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de inventario (inventory_categories, inventory_items, inventory_movements) verificadas/creadas.")

    async with async_session_maker() as db:
        print("📁 [2/3] Verificando categorías iniciales...")
        for cat_data in DEFAULT_CATEGORIES:
            res = await db.execute(select(InventoryCategory).where(InventoryCategory.name == cat_data["name"]))
            if not res.scalars().first():
                cat = InventoryCategory(**cat_data)
                db.add(cat)
        await db.commit()
        print("✅ Categorías iniciales registradas.")

        print("🔐 [3/3] Sincronizando permisos de Inventario con PBAC...")
        result = await SecurityService.sync_all_system_permissions(db)
        print(f"✅ {result['message']}.")

if __name__ == "__main__":
    asyncio.run(setup_inventory())
