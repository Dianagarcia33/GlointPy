from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any

from src.core.database import get_db
from src.api.deps import RequirePermission
from src.models.user import User
from src.schemas.company_asset import (
    CompanyAssetCreate,
    CompanyAssetUpdate,
    AssetAssignmentCreate,
    AssetReturnRequest,
    CompanyAssetResponse,
    CompanyAssetListResponse
)
from src.services.company_asset_service import CompanyAssetService

router = APIRouter()

@router.get("/stats")
async def get_asset_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:view", "assets.view", "inventory:view"]))
):
    """
    Estadísticas globales de activos fijos: total activos, disponibles, asignados, mantenimiento y valorización total.
    """
    return await CompanyAssetService.get_stats(db)

@router.get("", response_model=CompanyAssetListResponse)
async def list_assets(
    search: Optional[str] = Query(None, description="Búsqueda por placa, nombre, serial, marca o ubicación"),
    category: Optional[str] = Query(None, description="Filtro por categoría (TECNOLOGIA, MOBILIARIO, etc.)"),
    status: Optional[str] = Query(None, description="Filtro por estado (AVAILABLE, ASSIGNED, IN_MAINTENANCE, etc.)"),
    condition: Optional[str] = Query(None, description="Filtro por condición física (EXCELLENT, GOOD, FAIR, POOR)"),
    holder_id: Optional[int] = Query(None, description="Filtro por usuario custodio actual"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:view", "assets.view", "inventory:view"]))
):
    """
    Listado paginado de activos fijos de la empresa con filtros avanzados y custodia actual.
    """
    return await CompanyAssetService.get_assets(
        db=db,
        search=search,
        category=category,
        status_filter=status,
        condition=condition,
        holder_id=holder_id,
        skip=skip,
        limit=limit
    )

@router.get("/{asset_id}", response_model=CompanyAssetResponse)
async def get_asset_detail(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:view", "assets.view", "inventory:view"]))
):
    """
    Detalle completo del activo fijo, ficha técnica e historial de asignaciones/custodias.
    """
    asset = await CompanyAssetService.get_asset_by_id(db, asset_id)
    assignments_list = []
    for asg in asset.assignments:
        assignments_list.append({
            "id": asg.id,
            "asset_id": asg.asset_id,
            "user_id": asg.user_id,
            "user_name": f"{asg.user.first_name} {asg.user.last_name}" if asg.user else None,
            "user_email": asg.user.email if asg.user else None,
            "assigned_by_id": asg.assigned_by_id,
            "assigned_by_name": f"{asg.assigned_by.first_name} {asg.assigned_by.last_name}" if asg.assigned_by else None,
            "assigned_date": asg.assigned_date,
            "returned_date": asg.returned_date,
            "condition_on_assignment": asg.condition_on_assignment,
            "condition_on_return": asg.condition_on_return,
            "assignment_notes": asg.assignment_notes,
            "return_notes": asg.return_notes,
            "is_current": asg.is_current
        })

    return {
        "id": asset.id,
        "asset_code": asset.asset_code,
        "name": asset.name,
        "category": asset.category,
        "serial_number": asset.serial_number,
        "brand": asset.brand,
        "model": asset.model,
        "supplier_id": asset.supplier_id,
        "supplier_name": asset.supplier.name if asset.supplier else None,
        "purchase_date": asset.purchase_date,
        "purchase_cost": asset.purchase_cost,
        "warranty_expiration": asset.warranty_expiration,
        "status": asset.status,
        "current_condition": asset.current_condition,
        "location": asset.location,
        "current_holder_id": asset.current_holder_id,
        "current_holder_name": f"{asset.current_holder.first_name} {asset.current_holder.last_name}" if asset.current_holder else None,
        "current_holder_email": asset.current_holder.email if asset.current_holder else None,
        "photo_url": asset.photo_url,
        "invoice_reference": asset.invoice_reference,
        "notes": asset.notes,
        "created_at": asset.created_at,
        "updated_at": asset.updated_at,
        "assignments": assignments_list
    }

@router.post("", response_model=CompanyAssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    data: CompanyAssetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:create", "assets.create"]))
):
    """
    Registrar y dar de alta un nuevo activo fijo en la empresa.
    """
    return await CompanyAssetService.create_asset(db, data, current_user)

@router.put("/{asset_id}", response_model=CompanyAssetResponse)
async def update_asset(
    asset_id: int,
    data: CompanyAssetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:edit", "assets.edit"]))
):
    """
    Modificar ficha técnica, ubicación o estado del activo.
    """
    return await CompanyAssetService.update_asset(db, asset_id, data)

@router.post("/{asset_id}/assign", response_model=CompanyAssetResponse)
async def assign_asset(
    asset_id: int,
    data: AssetAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:assign", "assets.assign"]))
):
    """
    Asignar la custodia de un activo a un colaborador o directivo.
    """
    return await CompanyAssetService.assign_asset(db, asset_id, data, current_user)

@router.post("/{asset_id}/return", response_model=CompanyAssetResponse)
async def return_asset(
    asset_id: int,
    data: AssetReturnRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:assign", "assets.assign"]))
):
    """
    Recibir de vuelta el activo (devolución de custodia) y registrar el estado físico de entrega.
    """
    return await CompanyAssetService.return_asset(db, asset_id, data, current_user)

@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["assets:delete", "assets.delete"]))
):
    """
    Dar de baja (desincorporar) un activo fijo del inventario de la empresa.
    """
    return await CompanyAssetService.delete_asset(db, asset_id)
