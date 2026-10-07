from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import and_, or_, func, desc

from src.models.inventory import InventoryCategory, InventoryItem, InventoryMovement
from src.models.user import User
from src.models.user_notification import UserNotification
from src.models.security import Role, user_roles
from src.schemas.inventory import (
    InventoryCategoryCreate,
    InventoryItemCreate,
    InventoryItemUpdate,
    InventoryMovementCreate,
    InventoryAdjustmentCreate,
    InventoryDashboardStats,
    InventoryDepartmentExpense
)


class InventoryService:

    # =========================================================================
    # CATEGORÍAS
    # =========================================================================
    @staticmethod
    async def get_categories(db: AsyncSession, item_type: Optional[str] = None) -> List[InventoryCategory]:
        query = select(InventoryCategory).where(InventoryCategory.is_active == True)
        if item_type and item_type != "ALL":
            query = query.where(or_(InventoryCategory.item_type == item_type, InventoryCategory.item_type == "GENERAL"))
        query = query.order_by(InventoryCategory.name.asc())
        res = await db.execute(query)
        return res.scalars().all()

    @staticmethod
    async def create_category(db: AsyncSession, data: InventoryCategoryCreate) -> InventoryCategory:
        existing = await db.execute(select(InventoryCategory).where(InventoryCategory.name == data.name.strip()))
        if existing.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ya existe una categoría con este nombre.")
        
        category = InventoryCategory(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            item_type=data.item_type,
            is_active=data.is_active
        )
        db.add(category)
        await db.commit()
        await db.refresh(category)
        return category

    # =========================================================================
    # ARTÍCULOS (PRODUCTOS E INSUMOS)
    # =========================================================================
    @staticmethod
    async def get_items(
        db: AsyncSession,
        item_type: Optional[str] = None,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        only_low_stock: bool = False,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        query = select(InventoryItem).options(selectinload(InventoryItem.category))
        
        if active_only:
            query = query.where(InventoryItem.is_active == True)
        
        if item_type and item_type != "ALL":
            query = query.where(InventoryItem.item_type == item_type)
            
        if category_id:
            query = query.where(InventoryItem.category_id == category_id)

        if search:
            s = f"%{search.strip()}%"
            query = query.where(
                or_(
                    InventoryItem.name.ilike(s),
                    InventoryItem.sku.ilike(s),
                    InventoryItem.description.ilike(s)
                )
            )

        if only_low_stock:
            query = query.where(InventoryItem.current_stock <= InventoryItem.min_stock)

        query = query.order_by(InventoryItem.name.asc())
        result = await db.execute(query)
        items = result.scalars().all()

        formatted = []
        for it in items:
            formatted.append({
                "id": it.id,
                "sku": it.sku,
                "name": it.name,
                "description": it.description,
                "item_type": it.item_type,
                "category_id": it.category_id,
                "category_name": it.category.name if it.category else None,
                "unit_measure": it.unit_measure,
                "current_stock": it.current_stock,
                "min_stock": it.min_stock,
                "unit_cost": it.unit_cost,
                "sale_price": it.sale_price,
                "is_active": it.is_active,
                "is_low_stock": it.current_stock <= it.min_stock,
                "created_at": it.created_at,
                "updated_at": it.updated_at
            })
        return formatted

    @staticmethod
    async def get_item_by_id(db: AsyncSession, item_id: int) -> InventoryItem:
        query = select(InventoryItem).options(selectinload(InventoryItem.category)).where(InventoryItem.id == item_id)
        result = await db.execute(query)
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artículo de inventario no encontrado.")
        return item

    @staticmethod
    async def create_item(db: AsyncSession, data: InventoryItemCreate, user_id: Optional[int] = None) -> Dict[str, Any]:
        # Validar SKU único
        existing = await db.execute(select(InventoryItem).where(InventoryItem.sku == data.sku.strip()))
        if existing.scalars().first():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Ya existe un artículo con el SKU '{data.sku.strip()}'.")

        item = InventoryItem(
            sku=data.sku.strip().upper(),
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            item_type=data.item_type,
            category_id=data.category_id,
            unit_measure=data.unit_measure.strip().upper(),
            current_stock=data.current_stock,
            min_stock=data.min_stock,
            unit_cost=data.unit_cost,
            sale_price=data.sale_price if data.item_type == "PRODUCT" else None,
            is_active=data.is_active
        )
        db.add(item)
        await db.flush()

        # Si viene con stock inicial > 0, registrar el primer movimiento en el Kardex
        if data.current_stock > 0:
            total = Decimal(data.current_stock) * Decimal(data.unit_cost)
            first_movement = InventoryMovement(
                item_id=item.id,
                movement_type="ENTRY",
                quantity=data.current_stock,
                previous_stock=0,
                new_stock=data.current_stock,
                unit_cost=data.unit_cost,
                total_cost=total,
                user_id=user_id,
                reference="INVENTARIO_INICIAL",
                notes="Inventario inicial al dar de alta el artículo."
            )
            db.add(first_movement)

        await db.commit()
        await db.refresh(item)
        return await InventoryService.get_item_by_id(db, item.id)

    @staticmethod
    async def update_item(db: AsyncSession, item_id: int, data: InventoryItemUpdate) -> InventoryItem:
        item = await InventoryService.get_item_by_id(db, item_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "sale_price" and item.item_type != "PRODUCT":
                continue
            if isinstance(value, str):
                value = value.strip()
            setattr(item, field, value)

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def delete_item(db: AsyncSession, item_id: int) -> Dict[str, Any]:
        item = await InventoryService.get_item_by_id(db, item_id)
        item.is_active = False
        await db.commit()
        return {"success": True, "message": f"Artículo '{item.name}' desactivado correctamente."}

    # =========================================================================
    # KARDEX Y MOVIMIENTOS
    # =========================================================================
    @staticmethod
    async def create_movement(
        db: AsyncSession,
        item_id: int,
        data: InventoryMovementCreate,
        user_id: Optional[int] = None
    ) -> InventoryMovement:
        # Obtener ítem con bloqueo pesimista
        query = select(InventoryItem).where(InventoryItem.id == item_id).with_for_update()
        result = await db.execute(query)
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artículo no encontrado.")

        if not item.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No se pueden registrar movimientos en un artículo inactivo.")

        previous_stock = item.current_stock
        mtype = data.movement_type.upper()
        quantity = abs(data.quantity)

        # Determinar costo unitario
        unit_cost = data.unit_cost if data.unit_cost is not None else item.unit_cost
        total_cost = Decimal(quantity) * Decimal(unit_cost)

        # Validaciones según el tipo de movimiento
        if mtype in ["DISPATCH_OFFICE", "SALE", "WASTE"]:
            if previous_stock < quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Stock insuficiente para '{item.name}'. Stock actual: {previous_stock} {item.unit_measure}, solicitado: {quantity}."
                )
            new_stock = previous_stock - quantity
        elif mtype == "ENTRY":
            new_stock = previous_stock + quantity
            # Actualizar costo unitario del producto si entra con nuevo costo
            if data.unit_cost is not None and data.unit_cost > 0:
                item.unit_cost = data.unit_cost
        elif mtype == "ADJUSTMENT":
            # Para ajuste libre se toma quantity como delta positivo o negativo
            new_stock = previous_stock + data.quantity
            if new_stock < 0:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El stock resultante no puede ser negativo.")
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tipo de movimiento no soportado: '{mtype}'.")

        # Para salida de oficina se requiere especificar el departamento
        if mtype == "DISPATCH_OFFICE" and not data.destination_department:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debes especificar el departamento o área de destino para el insumo de oficina."
            )

        # Actualizar stock actual
        item.current_stock = new_stock

        movement = InventoryMovement(
            item_id=item.id,
            movement_type=mtype,
            quantity=quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            unit_cost=unit_cost,
            total_cost=total_cost,
            user_id=user_id,
            destination_department=data.destination_department.strip() if data.destination_department else None,
            reference=data.reference.strip() if data.reference else None,
            notes=data.notes.strip() if data.notes else None
        )
        db.add(movement)

        # Disparar alerta si el stock baja a o por debajo del mínimo
        if new_stock <= item.min_stock:
            await InventoryService._trigger_low_stock_notification(db, item, new_stock)

        await db.commit()
        await db.refresh(movement)
        return movement

    @staticmethod
    async def adjust_stock(
        db: AsyncSession,
        item_id: int,
        data: InventoryAdjustmentCreate,
        user_id: Optional[int] = None
    ) -> InventoryMovement:
        query = select(InventoryItem).where(InventoryItem.id == item_id).with_for_update()
        result = await db.execute(query)
        item = result.scalars().first()
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Artículo no encontrado.")

        previous_stock = item.current_stock
        new_stock = data.actual_stock
        diff = new_stock - previous_stock

        if diff == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El stock actual coincide exactamente con el conteo reportado.")

        total_cost = Decimal(abs(diff)) * Decimal(item.unit_cost)
        item.current_stock = new_stock

        notes = f"Ajuste físico: {data.reason.strip()}."
        if data.notes:
            notes += f" {data.notes.strip()}"

        movement = InventoryMovement(
            item_id=item.id,
            movement_type="ADJUSTMENT",
            quantity=abs(diff),
            previous_stock=previous_stock,
            new_stock=new_stock,
            unit_cost=item.unit_cost,
            total_cost=total_cost,
            user_id=user_id,
            reference="AUDITORIA_FISICA",
            notes=notes
        )
        db.add(movement)

        if new_stock <= item.min_stock:
            await InventoryService._trigger_low_stock_notification(db, item, new_stock)

        await db.commit()
        await db.refresh(movement)
        return movement

    @staticmethod
    async def get_movements(
        db: AsyncSession,
        item_id: Optional[int] = None,
        item_type: Optional[str] = None,
        movement_type: Optional[str] = None,
        department: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = (
            select(InventoryMovement)
            .options(
                selectinload(InventoryMovement.item),
                selectinload(InventoryMovement.user)
            )
        )

        if item_id:
            query = query.where(InventoryMovement.item_id == item_id)
        if movement_type and movement_type != "ALL":
            query = query.where(InventoryMovement.movement_type == movement_type)
        if department:
            query = query.where(InventoryMovement.destination_department == department)

        if item_type and item_type != "ALL":
            query = query.join(InventoryItem, InventoryMovement.item_id == InventoryItem.id)
            query = query.where(InventoryItem.item_type == item_type)

        query = query.order_by(desc(InventoryMovement.created_at)).limit(limit).offset(offset)
        result = await db.execute(query)
        movements = result.scalars().all()

        formatted = []
        for m in movements:
            formatted.append({
                "id": m.id,
                "item_id": m.item_id,
                "item_name": m.item.name if m.item else "Desconocido",
                "item_sku": m.item.sku if m.item else "N/A",
                "item_type": m.item.item_type if m.item else "N/A",
                "movement_type": m.movement_type,
                "quantity": m.quantity,
                "previous_stock": m.previous_stock,
                "new_stock": m.new_stock,
                "unit_cost": m.unit_cost,
                "total_cost": m.total_cost,
                "user_id": m.user_id,
                "user_name": m.user.name if m.user else "Sistema",
                "destination_department": m.destination_department,
                "reference": m.reference,
                "notes": m.notes,
                "created_at": m.created_at
            })
        return formatted

    # =========================================================================
    # ESTADÍSTICAS Y GASTOS DE NEGOCIO (INSUMOS)
    # =========================================================================
    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> Dict[str, Any]:
        # Totales de productos e insumos
        prod_count_res = await db.execute(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.is_active == True, InventoryItem.item_type == "PRODUCT")
        )
        total_products = prod_count_res.scalar() or 0

        supplies_count_res = await db.execute(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.is_active == True, InventoryItem.item_type == "OFFICE_SUPPLY")
        )
        total_supplies = supplies_count_res.scalar() or 0

        # Stock bajo
        low_stock_res = await db.execute(
            select(func.count(InventoryItem.id))
            .where(InventoryItem.is_active == True, InventoryItem.current_stock <= InventoryItem.min_stock)
        )
        low_stock_count = low_stock_res.scalar() or 0

        # Valorización total del inventario (Stock actual * Costo unitario)
        val_res = await db.execute(
            select(func.sum(InventoryItem.current_stock * InventoryItem.unit_cost))
            .where(InventoryItem.is_active == True)
        )
        total_valuation = val_res.scalar() or Decimal("0.00")

        # Gastos de oficina del mes en curso (Movimientos DISPATCH_OFFICE)
        first_day_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_expenses_res = await db.execute(
            select(func.sum(InventoryMovement.total_cost))
            .where(
                InventoryMovement.movement_type == "DISPATCH_OFFICE",
                InventoryMovement.created_at >= first_day_of_month
            )
        )
        monthly_office_expenses = month_expenses_res.scalar() or Decimal("0.00")

        # Gastos por departamento
        dept_expenses_res = await db.execute(
            select(
                InventoryMovement.destination_department,
                func.sum(InventoryMovement.total_cost).label("total_amount"),
                func.count(InventoryMovement.id).label("movements_count")
            )
            .where(
                InventoryMovement.movement_type == "DISPATCH_OFFICE",
                InventoryMovement.destination_department.isnot(None)
            )
            .group_by(InventoryMovement.destination_department)
            .order_by(desc("total_amount"))
        )
        dept_rows = dept_expenses_res.all()
        expenses_by_department = [
            {
                "department": r.destination_department or "General",
                "total_amount": r.total_amount or Decimal("0.00"),
                "movements_count": r.movements_count
            }
            for r in dept_rows
        ]

        return {
            "total_products": total_products,
            "total_supplies": total_supplies,
            "low_stock_count": low_stock_count,
            "total_inventory_valuation": total_valuation,
            "monthly_office_expenses": monthly_office_expenses,
            "expenses_by_department": expenses_by_department
        }

    # =========================================================================
    # NOTIFICACIONES INTERNAS
    # =========================================================================
    @staticmethod
    async def _trigger_low_stock_notification(db: AsyncSession, item: InventoryItem, current_stock: int):
        """
        Genera una notificación en la campana para administradores y encargados de compras.
        """
        # Buscar usuarios administradores
        admin_roles_query = select(user_roles.c.user_id).join(Role, user_roles.c.role_id == Role.id).where(
            or_(Role.name == "SuperAdmin", Role.name == "Administrador", Role.name.ilike("%admin%"))
        )
        admins_res = await db.execute(admin_roles_query)
        admin_user_ids = list(set(admins_res.scalars().all()))

        # Si no hay admins por rol, buscar usuarios con superuser
        if not admin_user_ids:
            superusers = await db.execute(select(User.id).where(User.is_superuser == True, User.is_active == True))
            admin_user_ids = list(set(superusers.scalars().all()))

        title = f"⚠️ Stock Crítico: {item.name}"
        item_label = "Insumo de oficina" if item.item_type == "OFFICE_SUPPLY" else "Producto"
        message = (
            f"El {item_label} '{item.name}' (SKU: {item.sku}) tiene solo {current_stock} {item.unit_measure} disponible(s). "
            f"Umbral mínimo configurado: {item.min_stock}."
        )

        for uid in admin_user_ids:
            notif = UserNotification(
                user_id=uid,
                title=title,
                message=message,
                type="alerta_stock",
                is_read=False,
                link=f"/dashboard/inventory?search={item.sku}"
            )
            db.add(notif)
