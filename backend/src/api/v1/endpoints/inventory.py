from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.inventory import (
    InventoryCategoryCreate,
    InventoryCategoryResponse,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryItemResponse,
    InventoryMovementCreate,
    InventoryAdjustmentCreate,
    InventoryMovementResponse,
    InventoryDashboardStats
)
from src.services.inventory_service import InventoryService

router = APIRouter()

# =============================================================================
# ESTADÍSTICAS Y RESUMEN GENERAL
# =============================================================================
@router.get("/stats", response_model=InventoryDashboardStats)
async def get_inventory_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:view", "inventory.view", "inventory:kardex"]))
):
    """
    Retorna métricas clave del inventario: total productos, insumos, stock crítico,
    valorización total y desglose de gastos por consumo de insumos de oficina.
    """
    return await InventoryService.get_dashboard_stats(db)


# =============================================================================
# CATEGORÍAS
# =============================================================================
@router.get("/categories", response_model=List[InventoryCategoryResponse])
async def list_categories(
    item_type: Optional[str] = Query(None, description="Filtrar por PRODUCT, OFFICE_SUPPLY o ALL"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:view", "inventory.view"]))
):
    """
    Listar las categorías de productos o insumos.
    """
    return await InventoryService.get_categories(db, item_type=item_type)


@router.post("/categories", response_model=InventoryCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: InventoryCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:create", "inventory.create", "inventory:manage"]))
):
    """
    Crear una nueva categoría de inventario.
    """
    return await InventoryService.create_category(db, data)


# =============================================================================
# ARTÍCULOS (PRODUCTOS E INSUMOS)
# =============================================================================
@router.get("/items", response_model=List[InventoryItemResponse])
async def list_items(
    item_type: Optional[str] = Query(None, description="'PRODUCT' o 'OFFICE_SUPPLY'"),
    category_id: Optional[int] = Query(None, description="Filtrar por categoría"),
    search: Optional[str] = Query(None, description="Buscar por nombre o SKU"),
    only_low_stock: bool = Query(False, description="Filtrar únicamente stock crítico"),
    active_only: bool = Query(True, description="Mostrar solo ítems activos"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:view", "inventory.view"]))
):
    """
    Listar artículos del inventario con soporte de filtros por tipo, categoría, búsqueda y stock bajo.
    """
    return await InventoryService.get_items(
        db=db,
        item_type=item_type,
        category_id=category_id,
        search=search,
        only_low_stock=only_low_stock,
        active_only=active_only
    )


@router.get("/items/{item_id}", response_model=InventoryItemResponse)
async def get_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:view", "inventory.view"]))
):
    """
    Obtener el detalle de un artículo específico por su ID.
    """
    item = await InventoryService.get_item_by_id(db, item_id)
    return {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "category_id": item.category_id,
        "category_name": item.category.name if item.category else None,
        "unit_measure": item.unit_measure,
        "current_stock": item.current_stock,
        "min_stock": item.min_stock,
        "unit_cost": item.unit_cost,
        "sale_price": item.sale_price,
        "is_active": item.is_active,
        "is_low_stock": item.current_stock <= item.min_stock,
        "created_at": item.created_at,
        "updated_at": item.updated_at
    }


@router.post("/items", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: InventoryItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:create", "inventory.create", "inventory:manage"]))
):
    """
    Crear un nuevo producto comercial o insumo de oficina en el inventario.
    """
    item = await InventoryService.create_item(db, data, user_id=current_user.id)
    return {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "category_id": item.category_id,
        "category_name": item.category.name if item.category else None,
        "unit_measure": item.unit_measure,
        "current_stock": item.current_stock,
        "min_stock": item.min_stock,
        "unit_cost": item.unit_cost,
        "sale_price": item.sale_price,
        "is_active": item.is_active,
        "is_low_stock": item.current_stock <= item.min_stock,
        "created_at": item.created_at,
        "updated_at": item.updated_at
    }


@router.put("/items/{item_id}", response_model=InventoryItemResponse)
async def update_item(
    item_id: int,
    data: InventoryItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:edit", "inventory.edit", "inventory:manage"]))
):
    """
    Actualizar datos básicos de un producto o insumo.
    """
    item = await InventoryService.update_item(db, item_id, data)
    return {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "description": item.description,
        "item_type": item.item_type,
        "category_id": item.category_id,
        "category_name": item.category.name if item.category else None,
        "unit_measure": item.unit_measure,
        "current_stock": item.current_stock,
        "min_stock": item.min_stock,
        "unit_cost": item.unit_cost,
        "sale_price": item.sale_price,
        "is_active": item.is_active,
        "is_low_stock": item.current_stock <= item.min_stock,
        "created_at": item.created_at,
        "updated_at": item.updated_at
    }


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:delete", "inventory.delete", "inventory:manage"]))
):
    """
    Desactivar un producto o insumo de la base de datos (Soft Delete).
    """
    return await InventoryService.delete_item(db, item_id)


# =============================================================================
# MOVIMIENTOS Y KARDEX
# =============================================================================
@router.post("/items/{item_id}/movements", response_model=InventoryMovementResponse)
async def create_movement(
    item_id: int,
    data: InventoryMovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:create", "inventory:dispatch", "inventory:manage", "inventory.create", "inventory.dispatch"]))
):
    """
    Registrar un movimiento en el Kardex:
    - Entrada (compra / abastecimiento)
    - Salida por consumo interno de oficina (genera registro de gasto)
    - Venta comercial
    - Merma o pérdida
    """
    movement = await InventoryService.create_movement(
        db=db,
        item_id=item_id,
        data=data,
        user_id=current_user.id
    )
    return {
        "id": movement.id,
        "item_id": movement.item_id,
        "item_name": movement.item.name if movement.item else None,
        "item_sku": movement.item.sku if movement.item else None,
        "item_type": movement.item.item_type if movement.item else None,
        "movement_type": movement.movement_type,
        "quantity": movement.quantity,
        "previous_stock": movement.previous_stock,
        "new_stock": movement.new_stock,
        "unit_cost": movement.unit_cost,
        "total_cost": movement.total_cost,
        "user_id": movement.user_id,
        "user_name": movement.user.name if movement.user else current_user.name,
        "destination_department": movement.destination_department,
        "reference": movement.reference,
        "notes": movement.notes,
        "created_at": movement.created_at
    }


@router.post("/items/{item_id}/adjust", response_model=InventoryMovementResponse)
async def adjust_stock(
    item_id: int,
    data: InventoryAdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:adjust", "inventory.adjust", "inventory:manage"]))
):
    """
    Ajuste de stock por auditoría o conteo físico.
    """
    movement = await InventoryService.adjust_stock(
        db=db,
        item_id=item_id,
        data=data,
        user_id=current_user.id
    )
    return {
        "id": movement.id,
        "item_id": movement.item_id,
        "item_name": movement.item.name if movement.item else None,
        "item_sku": movement.item.sku if movement.item else None,
        "item_type": movement.item.item_type if movement.item else None,
        "movement_type": movement.movement_type,
        "quantity": movement.quantity,
        "previous_stock": movement.previous_stock,
        "new_stock": movement.new_stock,
        "unit_cost": movement.unit_cost,
        "total_cost": movement.total_cost,
        "user_id": movement.user_id,
        "user_name": movement.user.name if movement.user else current_user.name,
        "destination_department": movement.destination_department,
        "reference": movement.reference,
        "notes": movement.notes,
        "created_at": movement.created_at
    }


@router.get("/movements", response_model=List[InventoryMovementResponse])
async def list_movements(
    item_id: Optional[int] = Query(None, description="Filtrar movimientos de un ítem"),
    item_type: Optional[str] = Query(None, description="Filtrar por PRODUCT o OFFICE_SUPPLY"),
    movement_type: Optional[str] = Query(None, description="ENTRY, DISPATCH_OFFICE, SALE, ADJUSTMENT, WASTE"),
    department: Optional[str] = Query(None, description="Filtrar por área/departamento destino"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["inventory:kardex", "inventory:view", "inventory.kardex", "inventory.view"]))
):
    """
    Consultar la bitácora completa de movimientos (Kardex) con filtros avanzados.
    """
    return await InventoryService.get_movements(
        db=db,
        item_id=item_id,
        item_type=item_type,
        movement_type=movement_type,
        department=department,
        limit=limit,
        offset=offset
    )
