from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, func, desc

from src.models.company_asset import CompanyAsset, AssetAssignment
from src.models.supplier import InventorySupplier
from src.models.user import User
from src.schemas.company_asset import (
    CompanyAssetCreate,
    CompanyAssetUpdate,
    AssetAssignmentCreate,
    AssetReturnRequest
)

class CompanyAssetService:

    @staticmethod
    async def generate_asset_code(db: AsyncSession, category: str) -> str:
        # Prefijo según categoría
        prefix_map = {
            "TECNOLOGIA": "TEC",
            "MOBILIARIO": "MOB",
            "EQUIPOS_OFICINA": "EQP",
            "VEHICULOS": "VEH",
            "HERRAMIENTAS": "HRR",
            "OTROS": "ACT"
        }
        pfx = prefix_map.get(category.upper(), "ACT")
        
        # Conteo de activos con ese prefijo
        query = select(CompanyAsset.asset_code).where(
            CompanyAsset.asset_code.like(f"{pfx}-%")
        ).order_by(desc(CompanyAsset.id)).limit(1)
        
        res = await db.execute(query)
        last_code = res.scalar()
        
        if last_code:
            try:
                seq = int(last_code.split("-")[-1]) + 1
            except Exception:
                seq = 1
        else:
            seq = 1
            
        return f"{pfx}-{seq:04d}"

    @staticmethod
    async def get_assets(
        db: AsyncSession,
        search: Optional[str] = None,
        category: Optional[str] = None,
        status_filter: Optional[str] = None,
        condition: Optional[str] = None,
        holder_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        query = select(CompanyAsset).options(
            selectinload(CompanyAsset.supplier),
            selectinload(CompanyAsset.current_holder),
            selectinload(CompanyAsset.assignments).selectinload(AssetAssignment.user),
            selectinload(CompanyAsset.assignments).selectinload(AssetAssignment.assigned_by)
        )

        if category and category != "ALL":
            query = query.where(CompanyAsset.category == category)

        if status_filter and status_filter != "ALL":
            query = query.where(CompanyAsset.status == status_filter)

        if condition and condition != "ALL":
            query = query.where(CompanyAsset.current_condition == condition)

        if holder_id:
            query = query.where(CompanyAsset.current_holder_id == holder_id)

        if search:
            term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    CompanyAsset.asset_code.ilike(term),
                    CompanyAsset.name.ilike(term),
                    CompanyAsset.serial_number.ilike(term),
                    CompanyAsset.brand.ilike(term),
                    CompanyAsset.model.ilike(term),
                    CompanyAsset.location.ilike(term),
                    CompanyAsset.invoice_reference.ilike(term)
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        query = query.order_by(desc(CompanyAsset.id)).offset(skip).limit(limit)
        result = await db.execute(query)
        assets = result.scalars().all()

        response_items = []
        for a in assets:
            assignments_list = []
            for asg in a.assignments:
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

            response_items.append({
                "id": a.id,
                "asset_code": a.asset_code,
                "name": a.name,
                "category": a.category,
                "serial_number": a.serial_number,
                "brand": a.brand,
                "model": a.model,
                "supplier_id": a.supplier_id,
                "supplier_name": a.supplier.name if a.supplier else None,
                "purchase_date": a.purchase_date,
                "purchase_cost": a.purchase_cost,
                "warranty_expiration": a.warranty_expiration,
                "status": a.status,
                "current_condition": a.current_condition,
                "location": a.location,
                "current_holder_id": a.current_holder_id,
                "current_holder_name": f"{a.current_holder.first_name} {a.current_holder.last_name}" if a.current_holder else None,
                "current_holder_email": a.current_holder.email if a.current_holder else None,
                "photo_url": a.photo_url,
                "invoice_reference": a.invoice_reference,
                "notes": a.notes,
                "created_at": a.created_at,
                "updated_at": a.updated_at,
                "assignments": assignments_list
            })

        return {"items": response_items, "total": total}

    @staticmethod
    async def get_asset_by_id(db: AsyncSession, asset_id: int) -> CompanyAsset:
        query = select(CompanyAsset).options(
            selectinload(CompanyAsset.supplier),
            selectinload(CompanyAsset.current_holder),
            selectinload(CompanyAsset.assignments).selectinload(AssetAssignment.user),
            selectinload(CompanyAsset.assignments).selectinload(AssetAssignment.assigned_by)
        ).where(CompanyAsset.id == asset_id)

        res = await db.execute(query)
        asset = res.scalars().first()
        if not asset:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activo fijo no encontrado.")
        return asset

    @staticmethod
    async def create_asset(db: AsyncSession, data: CompanyAssetCreate, current_user: User) -> CompanyAsset:
        # Validar código o autogenerar si viene vacío
        code = data.asset_code.strip() if data.asset_code and data.asset_code.strip() else ""
        if not code:
            code = await CompanyAssetService.generate_asset_code(db, data.category)
        else:
            existing = await db.execute(select(CompanyAsset).where(CompanyAsset.asset_code == code))
            if existing.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"La placa / código de activo '{code}' ya se encuentra registrada."
                )

        # Validar proveedor si viene
        if data.supplier_id:
            sup_res = await db.execute(select(InventorySupplier).where(InventorySupplier.id == data.supplier_id))
            if not sup_res.scalars().first():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El proveedor seleccionado no existe.")

        asset = CompanyAsset(
            asset_code=code,
            name=data.name.strip(),
            category=data.category or "TECNOLOGIA",
            serial_number=data.serial_number.strip() if data.serial_number else None,
            brand=data.brand.strip() if data.brand else None,
            model=data.model.strip() if data.model else None,
            supplier_id=data.supplier_id,
            purchase_date=data.purchase_date,
            purchase_cost=Decimal(str(data.purchase_cost or 0.0)),
            warranty_expiration=data.warranty_expiration,
            status=data.status or "AVAILABLE",
            current_condition=data.current_condition or "EXCELLENT",
            location=data.location.strip() if data.location else None,
            photo_url=data.photo_url.strip() if data.photo_url else None,
            invoice_reference=data.invoice_reference.strip() if data.invoice_reference else None,
            notes=data.notes.strip() if data.notes else None
        )

        db.add(asset)
        await db.flush()

        # Si se especificó un colaborador inicial para entrega inmediata
        if data.initial_holder_id:
            user_res = await db.execute(select(User).where(User.id == data.initial_holder_id))
            target_user = user_res.scalars().first()
            if target_user:
                asset.current_holder_id = target_user.id
                asset.status = "ASSIGNED"
                assignment = AssetAssignment(
                    asset_id=asset.id,
                    user_id=target_user.id,
                    assigned_by_id=current_user.id,
                    assigned_date=datetime.utcnow(),
                    condition_on_assignment=asset.current_condition,
                    assignment_notes=f"Asignación inicial al dar de alta el activo.",
                    is_current=True
                )
                db.add(assignment)

        await db.commit()
        await db.refresh(asset)
        return await CompanyAssetService.get_asset_by_id(db, asset.id)

    @staticmethod
    async def update_asset(db: AsyncSession, asset_id: int, data: CompanyAssetUpdate) -> CompanyAsset:
        asset = await CompanyAssetService.get_asset_by_id(db, asset_id)

        if data.name is not None:
            asset.name = data.name.strip()
        if data.category is not None:
            asset.category = data.category
        if data.serial_number is not None:
            asset.serial_number = data.serial_number.strip() if data.serial_number else None
        if data.brand is not None:
            asset.brand = data.brand.strip() if data.brand else None
        if data.model is not None:
            asset.model = data.model.strip() if data.model else None
        if data.supplier_id is not None:
            asset.supplier_id = data.supplier_id
        if data.purchase_date is not None:
            asset.purchase_date = data.purchase_date
        if data.purchase_cost is not None:
            asset.purchase_cost = Decimal(str(data.purchase_cost))
        if data.warranty_expiration is not None:
            asset.warranty_expiration = data.warranty_expiration
        if data.status is not None:
            asset.status = data.status
        if data.current_condition is not None:
            asset.current_condition = data.current_condition
        if data.location is not None:
            asset.location = data.location.strip() if data.location else None
        if data.photo_url is not None:
            asset.photo_url = data.photo_url.strip() if data.photo_url else None
        if data.invoice_reference is not None:
            asset.invoice_reference = data.invoice_reference.strip() if data.invoice_reference else None
        if data.notes is not None:
            asset.notes = data.notes.strip() if data.notes else None

        await db.commit()
        await db.refresh(asset)
        return asset

    @staticmethod
    async def assign_asset(
        db: AsyncSession,
        asset_id: int,
        data: AssetAssignmentCreate,
        current_user: User
    ) -> CompanyAsset:
        asset = await CompanyAssetService.get_asset_by_id(db, asset_id)

        # Validar usuario receptor
        target_res = await db.execute(select(User).where(User.id == data.user_id))
        target_user = target_res.scalars().first()
        if not target_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="El usuario receptor no existe.")

        # Cerrar asignación anterior si existía
        for asg in asset.assignments:
            if asg.is_current:
                asg.is_current = False
                asg.returned_date = datetime.utcnow()
                asg.condition_on_return = data.condition_on_assignment
                asg.return_notes = "Reasignación automática a nuevo colaborador."

        # Registrar nueva asignación
        new_asg = AssetAssignment(
            asset_id=asset.id,
            user_id=target_user.id,
            assigned_by_id=current_user.id,
            assigned_date=datetime.utcnow(),
            condition_on_assignment=data.condition_on_assignment,
            assignment_notes=data.assignment_notes,
            is_current=True
        )
        db.add(new_asg)

        asset.current_holder_id = target_user.id
        asset.status = "ASSIGNED"
        asset.current_condition = data.condition_on_assignment

        await db.commit()
        await db.refresh(asset)
        return await CompanyAssetService.get_asset_by_id(db, asset.id)

    @staticmethod
    async def return_asset(
        db: AsyncSession,
        asset_id: int,
        data: AssetReturnRequest,
        current_user: User
    ) -> CompanyAsset:
        asset = await CompanyAssetService.get_asset_by_id(db, asset_id)

        # Cerrar asignación actual
        found = False
        for asg in asset.assignments:
            if asg.is_current:
                asg.is_current = False
                asg.returned_date = datetime.utcnow()
                asg.condition_on_return = data.condition_on_return
                asg.return_notes = data.return_notes
                found = True

        asset.current_holder_id = None
        asset.status = data.new_status or "AVAILABLE"
        asset.current_condition = data.condition_on_return

        await db.commit()
        await db.refresh(asset)
        return await CompanyAssetService.get_asset_by_id(db, asset.id)

    @staticmethod
    async def delete_asset(db: AsyncSession, asset_id: int) -> Dict[str, Any]:
        asset = await CompanyAssetService.get_asset_by_id(db, asset_id)
        # En activos fijos, no se borran físicamente si tienen placa y contabilidad; se marcan como DECOMMISSIONED (Dado de baja)
        asset.status = "DECOMMISSIONED"
        asset.current_holder_id = None
        for asg in asset.assignments:
            if asg.is_current:
                asg.is_current = False
                asg.returned_date = datetime.utcnow()
                asg.return_notes = "Baja definitiva de activo fijo de la empresa."

        await db.commit()
        return {"message": "El activo ha sido dado de baja (desincorporado) satisfactoriamente."}

    @staticmethod
    async def get_stats(db: AsyncSession) -> Dict[str, Any]:
        counts_res = await db.execute(
            select(CompanyAsset.status, func.count(CompanyAsset.id)).group_by(CompanyAsset.status)
        )
        status_counts = dict(counts_res.all())

        val_res = await db.execute(
            select(func.coalesce(func.sum(CompanyAsset.purchase_cost), Decimal("0.00")))
            .where(CompanyAsset.status != "DECOMMISSIONED")
        )
        total_value = val_res.scalar() or Decimal("0.00")

        return {
            "total_assets": sum(status_counts.values()),
            "available_assets": status_counts.get("AVAILABLE", 0),
            "assigned_assets": status_counts.get("ASSIGNED", 0),
            "maintenance_assets": status_counts.get("IN_MAINTENANCE", 0),
            "damaged_assets": status_counts.get("DAMAGED", 0),
            "decommissioned_assets": status_counts.get("DECOMMISSIONED", 0),
            "total_asset_value": float(total_value)
        }
