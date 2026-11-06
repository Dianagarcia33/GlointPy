import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
load_dotenv(".env")

from src.core.database import engine, Base, async_session_maker
import src.models  # Registra todos los modelos en Base.metadata
from src.models.supplier import InventorySupplier
from src.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from src.models.company_asset import CompanyAsset, AssetAssignment
from src.services.security_service import SecurityService

async def setup_corporate_resources():
    print("🏢 [1/2] Verificando y creando tablas de Proveedores, Órdenes de Compra y Activos Fijos...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas creadas/verificadas en MySQL:")
    print("   - inventory_suppliers")
    print("   - purchase_orders")
    print("   - purchase_order_items")
    print("   - company_assets")
    print("   - asset_assignments")

    print("\n🔐 [2/2] Sincronizando nuevos permisos PBAC en la base de datos...")
    async with async_session_maker() as db:
        result = await SecurityService.sync_all_system_permissions(db)
        print(f"✅ {result['message']}.")

if __name__ == "__main__":
    asyncio.run(setup_corporate_resources())
