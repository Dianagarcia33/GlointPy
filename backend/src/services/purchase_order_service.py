from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func, desc

from src.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from src.models.supplier import InventorySupplier
from src.models.inventory import InventoryItem, InventoryMovement
from src.models.user import User
from src.schemas.purchase_order import PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderReceiveRequest

class PurchaseOrderService:

    @staticmethod
    async def generate_order_number(db: AsyncSession) -> str:
        current_year = datetime.utcnow().year
        prefix = f"OC-{current_year}-"
        
        # Obtener el consecutivo más alto del año actual
        query = select(PurchaseOrder.order_number).where(
            PurchaseOrder.order_number.like(f"{prefix}%")
        ).order_by(desc(PurchaseOrder.id)).limit(1)
        
        res = await db.execute(query)
        last_number = res.scalar()
        
        if last_number:
            try:
                seq = int(last_number.split("-")[-1]) + 1
            except Exception:
                seq = 1
        else:
            seq = 1
            
        return f"{prefix}{seq:04d}"

    @staticmethod
    async def get_purchase_orders(
        db: AsyncSession,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        supplier_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        query = select(PurchaseOrder).options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
            selectinload(PurchaseOrder.created_by),
            selectinload(PurchaseOrder.approved_by),
            selectinload(PurchaseOrder.received_by)
        )

        if status_filter and status_filter != "ALL":
            query = query.where(PurchaseOrder.status == status_filter)

        if supplier_id:
            query = query.where(PurchaseOrder.supplier_id == supplier_id)

        if search:
            term = f"%{search.strip()}%"
            query = query.join(PurchaseOrder.supplier).where(
                or_(
                    PurchaseOrder.order_number.ilike(term),
                    PurchaseOrder.invoice_number.ilike(term),
                    InventorySupplier.name.ilike(term),
                    InventorySupplier.nit_rut.ilike(term)
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        query = query.order_by(desc(PurchaseOrder.id)).offset(skip).limit(limit)
        result = await db.execute(query)
        orders = result.scalars().all()

        response_items = []
        for o in orders:
            items_list = []
            for it in o.items:
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

            response_items.append({
                "id": o.id,
                "order_number": o.order_number,
                "supplier_id": o.supplier_id,
                "supplier_name": o.supplier.name if o.supplier else "N/A",
                "supplier_nit": o.supplier.nit_rut if o.supplier else None,
                "status": o.status,
                "issue_date": o.issue_date,
                "expected_delivery_date": o.expected_delivery_date,
                "received_date": o.received_date,
                "subtotal": o.subtotal,
                "tax_amount": o.tax_amount,
                "total_amount": o.total_amount,
                "payment_method": o.payment_method,
                "invoice_number": o.invoice_number,
                "invoice_url": o.invoice_url,
                "notes": o.notes,
                "created_by_id": o.created_by_id,
                "created_by_name": f"{o.created_by.first_name} {o.created_by.last_name}" if o.created_by else None,
                "approved_by_id": o.approved_by_id,
                "approved_by_name": f"{o.approved_by.first_name} {o.approved_by.last_name}" if o.approved_by else None,
                "received_by_id": o.received_by_id,
                "received_by_name": f"{o.received_by.first_name} {o.received_by.last_name}" if o.received_by else None,
                "created_at": o.created_at,
                "updated_at": o.updated_at,
                "items": items_list
            })

        return {"items": response_items, "total": total}

    @staticmethod
    async def get_purchase_order_by_id(db: AsyncSession, order_id: int) -> PurchaseOrder:
        query = select(PurchaseOrder).options(
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.items),
            selectinload(PurchaseOrder.created_by),
            selectinload(PurchaseOrder.approved_by),
            selectinload(PurchaseOrder.received_by)
        ).where(PurchaseOrder.id == order_id)
        
        res = await db.execute(query)
        order = res.scalars().first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Orden de compra no encontrada.")
        return order

    @staticmethod
    async def create_purchase_order(db: AsyncSession, data: PurchaseOrderCreate, current_user: User) -> PurchaseOrder:
        # Validar proveedor
        supplier_res = await db.execute(select(InventorySupplier).where(InventorySupplier.id == data.supplier_id))
        supplier = supplier_res.scalars().first()
        if not supplier:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El proveedor seleccionado no existe.")
        if not supplier.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El proveedor seleccionado se encuentra inactivo.")

        order_number = await PurchaseOrderService.generate_order_number(db)

        # Calcular totales
        subtotal = Decimal("0.00")
        order_items = []
        for it in data.items:
            line_cost = Decimal(str(it.unit_cost)) * it.quantity_ordered
            subtotal += line_cost

            # Si item_id fue seleccionado, enriquecer con SKU y nombre oficial si no viene
            sku = it.item_sku
            name = it.item_name
            if it.item_id:
                inv_res = await db.execute(select(InventoryItem).where(InventoryItem.id == it.item_id))
                inv_item = inv_res.scalars().first()
                if inv_item:
                    sku = inv_item.sku
                    if not name:
                        name = inv_item.name

            poi = PurchaseOrderItem(
                item_id=it.item_id,
                item_name=name,
                item_sku=sku,
                quantity_ordered=it.quantity_ordered,
                quantity_received=0,
                unit_cost=Decimal(str(it.unit_cost)),
                total_cost=line_cost
            )
            order_items.append(poi)

        tax_amount = Decimal(str(data.tax_amount or 0.0))
        total_amount = subtotal + tax_amount

        new_order = PurchaseOrder(
            order_number=order_number,
            supplier_id=data.supplier_id,
            status="REQUESTED",  # Pasa automáticamente a solicitada/pendiente de aprobación
            expected_delivery_date=data.expected_delivery_date,
            subtotal=subtotal,
            tax_amount=tax_amount,
            total_amount=total_amount,
            payment_method=data.payment_method or "TRANSFERENCIA",
            invoice_number=data.invoice_number,
            invoice_url=data.invoice_url,
            notes=data.notes,
            created_by_id=current_user.id,
            items=order_items
        )

        db.add(new_order)
        await db.commit()
        await db.refresh(new_order)
        return await PurchaseOrderService.get_purchase_order_by_id(db, new_order.id)

    @staticmethod
    async def update_purchase_order(db: AsyncSession, order_id: int, data: PurchaseOrderUpdate, current_user: User) -> PurchaseOrder:
        order = await PurchaseOrderService.get_purchase_order_by_id(db, order_id)
        if order.status in ["RECEIVED", "CANCELLED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No se puede modificar una orden que ya está en estado {order.status}."
            )

        if data.payment_method is not None:
            order.payment_method = data.payment_method
        if data.expected_delivery_date is not None:
            order.expected_delivery_date = data.expected_delivery_date
        if data.tax_amount is not None:
            order.tax_amount = Decimal(str(data.tax_amount))
            order.total_amount = order.subtotal + order.tax_amount
        if data.invoice_number is not None:
            order.invoice_number = data.invoice_number
        if data.invoice_url is not None:
            order.invoice_url = data.invoice_url
        if data.notes is not None:
            order.notes = data.notes

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def approve_purchase_order(db: AsyncSession, order_id: int, current_user: User) -> PurchaseOrder:
        order = await PurchaseOrderService.get_purchase_order_by_id(db, order_id)
        if order.status != "REQUESTED" and order.status != "DRAFT":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La orden se encuentra en estado '{order.status}' y no puede ser aprobada."
            )

        order.status = "APPROVED"
        order.approved_by_id = current_user.id
        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def receive_purchase_order(
        db: AsyncSession,
        order_id: int,
        receive_data: PurchaseOrderReceiveRequest,
        current_user: User
    ) -> PurchaseOrder:
        order = await PurchaseOrderService.get_purchase_order_by_id(db, order_id)
        if order.status not in ["APPROVED", "REQUESTED"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Solo se pueden recibir órdenes aprobadas o solicitadas. Estado actual: {order.status}."
            )

        # Mapear cantidades recibidas por item
        received_map = {}
        if receive_data.items:
            for r_it in receive_data.items:
                received_map[r_it.order_item_id] = r_it

        now = datetime.utcnow()
        order.received_date = now
        order.received_by_id = current_user.id
        order.status = "RECEIVED"

        if receive_data.invoice_number:
            order.invoice_number = receive_data.invoice_number.strip()
        if receive_data.invoice_url:
            order.invoice_url = receive_data.invoice_url.strip()
        if receive_data.notes:
            order.notes = f"{order.notes or ''}\n[Recepción {now.strftime('%Y-%m-%d')}]: {receive_data.notes}".strip()

        # IMPACTO AUTOMÁTICO EN INVENTARIO Y KARDEX
        for poi in order.items:
            # Si el request especifica la cantidad, usarla; si no, recibir el total ordenado
            qty_received = poi.quantity_ordered
            if poi.id in received_map:
                qty_received = received_map[poi.id].quantity_received

            poi.quantity_received = qty_received

            # Si este item está vinculado a un InventoryItem del catálogo, actualizar stock y registrar Kardex
            if poi.item_id and qty_received > 0:
                inv_res = await db.execute(
                    select(InventoryItem).where(InventoryItem.id == poi.item_id).with_for_update()
                )
                inv_item = inv_res.scalars().first()
                if inv_item:
                    prev_stock = inv_item.current_stock
                    new_stock = prev_stock + qty_received

                    # Actualizar costo unitario y stock del artículo
                    inv_item.current_stock = new_stock
                    inv_item.unit_cost = poi.unit_cost

                    # Registrar movimiento Kardex
                    movement = InventoryMovement(
                        item_id=inv_item.id,
                        movement_type="ENTRY",
                        quantity=qty_received,
                        previous_stock=prev_stock,
                        new_stock=new_stock,
                        unit_cost=poi.unit_cost,
                        total_cost=poi.unit_cost * Decimal(qty_received),
                        user_id=current_user.id,
                        reference=order.order_number,
                        notes=f"Entrada por recepción de OC {order.order_number} ({order.supplier.name}). Factura: {order.invoice_number or 'N/A'}"
                    )
                    db.add(movement)

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def cancel_purchase_order(db: AsyncSession, order_id: int, reason: Optional[str], current_user: User) -> PurchaseOrder:
        order = await PurchaseOrderService.get_purchase_order_by_id(db, order_id)
        if order.status == "RECEIVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No es posible cancelar una orden que ya ha sido recibida y cargada a inventario."
            )

        order.status = "CANCELLED"
        if reason:
            order.notes = f"{order.notes or ''}\n[Cancelada por {current_user.email}]: {reason}".strip()

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict[str, Any]:
        # Conteo por estados
        counts_res = await db.execute(
            select(PurchaseOrder.status, func.count(PurchaseOrder.id)).group_by(PurchaseOrder.status)
        )
        status_counts = dict(counts_res.all())

        # Total gastado en órdenes recibidas
        spent_res = await db.execute(
            select(func.coalesce(func.sum(PurchaseOrder.total_amount), Decimal("0.00")))
            .where(PurchaseOrder.status == "RECEIVED")
        )
        total_received_amount = spent_res.scalar() or Decimal("0.00")

        # Total en tránsito / aprobadas
        pending_res = await db.execute(
            select(func.coalesce(func.sum(PurchaseOrder.total_amount), Decimal("0.00")))
            .where(PurchaseOrder.status.in_(["REQUESTED", "APPROVED"]))
        )
        pending_amount = pending_res.scalar() or Decimal("0.00")

        return {
            "total_orders": sum(status_counts.values()),
            "requested_orders": status_counts.get("REQUESTED", 0),
            "approved_orders": status_counts.get("APPROVED", 0),
            "received_orders": status_counts.get("RECEIVED", 0),
            "cancelled_orders": status_counts.get("CANCELLED", 0),
            "total_received_amount": float(total_received_amount),
            "pending_amount": float(pending_amount)
        }
