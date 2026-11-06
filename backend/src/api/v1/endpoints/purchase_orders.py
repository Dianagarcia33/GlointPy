from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List, Dict, Any

from src.core.database import get_db
from src.api.deps import RequirePermission
from src.models.user import User
from src.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderReceiveRequest,
    PurchaseOrderResponse,
    PurchaseOrderListResponse
)
from src.services.purchase_order_service import PurchaseOrderService

router = APIRouter()

@router.get("/stats")
async def get_purchase_order_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:view", "purchase_orders.view", "inventory:view"]))
):
    """
    Estadísticas globales de órdenes de compra: órdenes por estado, gasto recibido y montos pendientes.
    """
    return await PurchaseOrderService.get_stats(db)

@router.get("", response_model=PurchaseOrderListResponse)
async def list_purchase_orders(
    search: Optional[str] = Query(None, description="Búsqueda por número de OC, factura o proveedor"),
    status: Optional[str] = Query(None, description="Filtro por estado (REQUESTED, APPROVED, RECEIVED, CANCELLED)"),
    supplier_id: Optional[int] = Query(None, description="Filtro por ID de proveedor"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:view", "purchase_orders.view", "inventory:view"]))
):
    """
    Listado paginado de órdenes de compra con filtros por estado y proveedor.
    """
    return await PurchaseOrderService.get_purchase_orders(
        db=db,
        search=search,
        status_filter=status,
        supplier_id=supplier_id,
        skip=skip,
        limit=limit
    )

@router.get("/{order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order_detail(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:view", "purchase_orders.view", "inventory:view"]))
):
    """
    Obtener el detalle completo de una orden de compra e items.
    """
    order = await PurchaseOrderService.get_purchase_order_by_id(db, order_id)
    items_list = []
    for it in order.items:
        items_list.append({
            "id": it.id,
            "purchase_order_id": it.purchase_order_id,
            "item_id": it.item_id,
            "item_name": it.item_name,
            "item_sku": it.item_sku,
            "quantity_ordered": it.quantity_ordered,
            "quantity_received": it.quantity_received,
            "unit_cost": it.unit_cost,
            "total_cost": it.total_cost
        })
    return {
        "id": order.id,
        "order_number": order.order_number,
        "supplier_id": order.supplier_id,
        "supplier_name": order.supplier.name if order.supplier else "N/A",
        "supplier_nit": order.supplier.nit_rut if order.supplier else None,
        "status": order.status,
        "issue_date": order.issue_date,
        "expected_delivery_date": order.expected_delivery_date,
        "received_date": order.received_date,
        "subtotal": order.subtotal,
        "tax_amount": order.tax_amount,
        "total_amount": order.total_amount,
        "payment_method": order.payment_method,
        "invoice_number": order.invoice_number,
        "invoice_url": order.invoice_url,
        "notes": order.notes,
        "created_by_id": order.created_by_id,
        "created_by_name": f"{order.created_by.first_name} {order.created_by.last_name}" if order.created_by else None,
        "approved_by_id": order.approved_by_id,
        "approved_by_name": f"{order.approved_by.first_name} {order.approved_by.last_name}" if order.approved_by else None,
        "received_by_id": order.received_by_id,
        "received_by_name": f"{order.received_by.first_name} {order.received_by.last_name}" if order.received_by else None,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "items": items_list
    }

@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:create", "purchase_orders.create"]))
):
    """
    Crear una nueva orden de compra con items detallados.
    """
    return await PurchaseOrderService.create_purchase_order(db, data, current_user)

@router.put("/{order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    order_id: int,
    data: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:create", "purchase_orders.create"]))
):
    """
    Modificar detalles o notas de una orden de compra antes de ser recibida.
    """
    return await PurchaseOrderService.update_purchase_order(db, order_id, data, current_user)

@router.post("/{order_id}/approve", response_model=PurchaseOrderResponse)
async def approve_purchase_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:approve", "purchase_orders.approve"]))
):
    """
    Aprobar formalmente una orden de compra para autorizar la adquisición.
    """
    return await PurchaseOrderService.approve_purchase_order(db, order_id, current_user)

@router.post("/{order_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order(
    order_id: int,
    data: PurchaseOrderReceiveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:receive", "purchase_orders.receive"]))
):
    """
    Registrar la recepción física de mercancía: actualiza stock de inventario e inserta registros Kardex de entrada.
    """
    return await PurchaseOrderService.receive_purchase_order(db, order_id, data, current_user)

@router.post("/{order_id}/cancel", response_model=PurchaseOrderResponse)
async def cancel_purchase_order(
    order_id: int,
    reason: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["purchase_orders:cancel", "purchase_orders.cancel"]))
):
    """
    Anular una orden de compra no recibida.
    """
    return await PurchaseOrderService.cancel_purchase_order(db, order_id, reason, current_user)
