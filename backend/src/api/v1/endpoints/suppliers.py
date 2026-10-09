from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any

from src.core.database import get_db
from src.api.deps import RequirePermission
from src.models.user import User
from src.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse, SupplierListResponse
from src.services.supplier_service import SupplierService

router = APIRouter()

@router.get("", response_model=SupplierListResponse)
async def list_suppliers(
    search: Optional[str] = Query(None, description="Búsqueda por nombre, NIT, contacto o email"),
    category: Optional[str] = Query(None, description="Filtro por categoría de proveedor"),
    active_only: bool = Query(True, description="Mostrar solo proveedores activos"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["suppliers:view", "suppliers.view", "inventory:view"]))
):
    """
    Listado paginado de proveedores con búsqueda y estadísticas de compras.
    """
    return await SupplierService.get_suppliers(
        db=db,
        search=search,
        category=category,
        active_only=active_only,
        skip=skip,
        limit=limit
    )

@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier_detail(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["suppliers:view", "suppliers.view", "inventory:view"]))
):
    """
    Obtener información detallada de un proveedor por ID.
    """
    return await SupplierService.get_supplier_by_id(db, supplier_id)

@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    data: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["suppliers:create", "suppliers.create"]))
):
    """
    Dar de alta un nuevo proveedor en el sistema.
    """
    return await SupplierService.create_supplier(db, data)

@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["suppliers:edit", "suppliers.edit"]))
):
    """
    Modificar datos de contacto, condiciones comerciales o bancarias de un proveedor.
    """
    return await SupplierService.update_supplier(db, supplier_id, data)

@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["suppliers:delete", "suppliers.delete"]))
):
    """
    Desactivar o eliminar un proveedor del sistema.
    """
    return await SupplierService.delete_supplier(db, supplier_id)
