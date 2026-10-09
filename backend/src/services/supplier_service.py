from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, func, desc
from decimal import Decimal

from src.models.supplier import InventorySupplier
from src.models.purchase_order import PurchaseOrder
from src.schemas.supplier import SupplierCreate, SupplierUpdate

class SupplierService:

    @staticmethod
    async def get_suppliers(
        db: AsyncSession,
        search: Optional[str] = None,
        category: Optional[str] = None,
        active_only: bool = True,
        skip: int = 0,
        limit: int = 100
    ) -> Dict[str, Any]:
        query = select(InventorySupplier)

        if active_only:
            query = query.where(InventorySupplier.is_active == True)

        if category and category != "ALL":
            query = query.where(InventorySupplier.category == category)

        if search:
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    InventorySupplier.name.ilike(term),
                    InventorySupplier.nit_rut.ilike(term),
                    InventorySupplier.contact_name.ilike(term),
                    InventorySupplier.email.ilike(term),
                    InventorySupplier.phone.ilike(term),
                    InventorySupplier.city.ilike(term)
                )
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Pagination & sorting
        query = query.order_by(InventorySupplier.name.asc()).offset(skip).limit(limit)
        result = await db.execute(query)
        suppliers = result.scalars().all()

        # Aggregate total orders and total spent per supplier
        response_items = []
        for s in suppliers:
            stats_query = select(
                func.count(PurchaseOrder.id),
                func.coalesce(func.sum(PurchaseOrder.total_amount), Decimal("0.00"))
            ).where(
                PurchaseOrder.supplier_id == s.id,
                PurchaseOrder.status.in_(["APPROVED", "RECEIVED"])
            )
            stats_res = await db.execute(stats_query)
            order_count, total_spent = stats_res.first() or (0, Decimal("0.00"))

            item_dict = {
                "id": s.id,
                "name": s.name,
                "nit_rut": s.nit_rut,
                "contact_name": s.contact_name,
                "email": s.email,
                "phone": s.phone,
                "address": s.address,
                "city": s.city,
                "category": s.category,
                "payment_terms": s.payment_terms,
                "bank_info": s.bank_info,
                "notes": s.notes,
                "is_active": s.is_active,
                "created_at": s.created_at,
                "updated_at": s.updated_at,
                "total_purchase_orders": order_count or 0,
                "total_spent": float(total_spent or 0.0)
            }
            response_items.append(item_dict)

        return {"items": response_items, "total": total}

    @staticmethod
    async def get_supplier_by_id(db: AsyncSession, supplier_id: int) -> InventorySupplier:
        res = await db.execute(select(InventorySupplier).where(InventorySupplier.id == supplier_id))
        supplier = res.scalars().first()
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor no encontrado.")
        return supplier

    @staticmethod
    async def create_supplier(db: AsyncSession, data: SupplierCreate) -> InventorySupplier:
        # Check duplicate NIT if provided
        if data.nit_rut and data.nit_rut.strip():
            existing = await db.execute(
                select(InventorySupplier).where(InventorySupplier.nit_rut == data.nit_rut.strip())
            )
            if existing.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe un proveedor registrado con el NIT / Documento '{data.nit_rut}'."
                )

        # Check duplicate name
        existing_name = await db.execute(
            select(InventorySupplier).where(func.lower(InventorySupplier.name) == data.name.strip().lower())
        )
        if existing_name.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un proveedor con la razón social o nombre '{data.name}'."
            )

        supplier = InventorySupplier(
            name=data.name.strip(),
            nit_rut=data.nit_rut.strip() if data.nit_rut else None,
            contact_name=data.contact_name.strip() if data.contact_name else None,
            email=data.email.strip().lower() if data.email else None,
            phone=data.phone.strip() if data.phone else None,
            address=data.address.strip() if data.address else None,
            city=data.city.strip() if data.city else None,
            category=data.category or "GENERAL",
            payment_terms=data.payment_terms or "CONTADO",
            bank_info=data.bank_info.strip() if data.bank_info else None,
            notes=data.notes.strip() if data.notes else None,
            is_active=data.is_active
        )
        db.add(supplier)
        await db.commit()
        await db.refresh(supplier)
        return supplier

    @staticmethod
    async def update_supplier(db: AsyncSession, supplier_id: int, data: SupplierUpdate) -> InventorySupplier:
        supplier = await SupplierService.get_supplier_by_id(db, supplier_id)

        if data.nit_rut and data.nit_rut.strip():
            existing = await db.execute(
                select(InventorySupplier).where(
                    InventorySupplier.nit_rut == data.nit_rut.strip(),
                    InventorySupplier.id != supplier_id
                )
            )
            if existing.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El NIT / Documento '{data.nit_rut}' ya está asignado a otro proveedor."
                )

        if data.name and data.name.strip():
            existing_name = await db.execute(
                select(InventorySupplier).where(
                    func.lower(InventorySupplier.name) == data.name.strip().lower(),
                    InventorySupplier.id != supplier_id
                )
            )
            if existing_name.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El nombre '{data.name}' ya está en uso por otro proveedor."
                )
            supplier.name = data.name.strip()

        if data.nit_rut is not None:
            supplier.nit_rut = data.nit_rut.strip() if data.nit_rut else None
        if data.contact_name is not None:
            supplier.contact_name = data.contact_name.strip() if data.contact_name else None
        if data.email is not None:
            supplier.email = data.email.strip().lower() if data.email else None
        if data.phone is not None:
            supplier.phone = data.phone.strip() if data.phone else None
        if data.address is not None:
            supplier.address = data.address.strip() if data.address else None
        if data.city is not None:
            supplier.city = data.city.strip() if data.city else None
        if data.category is not None:
            supplier.category = data.category
        if data.payment_terms is not None:
            supplier.payment_terms = data.payment_terms
        if data.bank_info is not None:
            supplier.bank_info = data.bank_info.strip() if data.bank_info else None
        if data.notes is not None:
            supplier.notes = data.notes.strip() if data.notes else None
        if data.is_active is not None:
            supplier.is_active = data.is_active

        await db.commit()
        await db.refresh(supplier)
        return supplier

    @staticmethod
    async def delete_supplier(db: AsyncSession, supplier_id: int) -> Dict[str, Any]:
        supplier = await SupplierService.get_supplier_by_id(db, supplier_id)

        # Check if supplier has purchase orders or assets
        po_check = await db.execute(
            select(func.count(PurchaseOrder.id)).where(PurchaseOrder.supplier_id == supplier_id)
        )
        po_count = po_check.scalar() or 0

        if po_count > 0:
            # Soft delete to preserve historical purchase integrity
            supplier.is_active = False
            await db.commit()
            return {"message": "El proveedor tiene historial de compras; ha sido desactivado en lugar de eliminado."}
        else:
            await db.delete(supplier)
            await db.commit()
            return {"message": "Proveedor eliminado exitosamente."}
