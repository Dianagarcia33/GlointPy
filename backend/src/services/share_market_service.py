import os
import shutil
from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, or_, and_

from src.models.share_market import SharePriceHistory, ShareIssuance, ShareListing, ShareTradeOrder
from src.models.investor import Investor
from src.models.package import Package
from src.models.user import User
from src.models.wallet import Wallet, WalletTransaction
from src.services.system_event_service import SystemEventService

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "share_receipts")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ShareMarketService:

    @staticmethod
    async def get_current_price(db: AsyncSession) -> float:
        """Obtiene el último precio oficial de la acción registrado en el historial."""
        result = await db.execute(
            select(SharePriceHistory)
            .order_by(SharePriceHistory.id.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if latest:
            return float(latest.new_price)
        return 50000.0  # Valor base inicial en COP

    @staticmethod
    async def update_official_price(db: AsyncSession, new_price: float, justification_notes: str, admin_id: int) -> SharePriceHistory:
        """Actualiza el precio oficial de la acción con nota/justificación obligatoria."""
        if not justification_notes or not justification_notes.strip() or len(justification_notes.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Es obligatorio ingresar un motivo o justificación detallada para cambiar el valor de la acción."
            )

        current_price = await ShareMarketService.get_current_price(db)
        diff = new_price - current_price
        pct = (diff / current_price * 100) if current_price > 0 else 0.0

        history = SharePriceHistory(
            previous_price=Decimal(str(current_price)),
            new_price=Decimal(str(new_price)),
            change_percentage=Decimal(str(round(pct, 2))),
            justification_notes=justification_notes.strip(),
            admin_id=admin_id
        )
        db.add(history)
        await db.commit()
        await db.refresh(history)
        return history

    @staticmethod
    async def get_price_history(db: AsyncSession) -> List[dict]:
        """Obtiene la bitácora histórica completa de variaciones de precio y notas."""
        result = await db.execute(
            select(SharePriceHistory)
            .options(selectinload(SharePriceHistory.admin))
            .order_by(SharePriceHistory.created_at.desc())
        )
        records = result.scalars().all()
        return [
            {
                "id": r.id,
                "previous_price": float(r.previous_price),
                "new_price": float(r.new_price),
                "change_percentage": float(r.change_percentage),
                "justification_notes": r.justification_notes,
                "admin_id": r.admin_id,
                "admin_name": r.admin.name if r.admin else "Administrador",
                "created_at": r.created_at
            }
            for r in records
        ]

    @staticmethod
    async def get_user_portfolio(db: AsyncSession, user_id: int) -> dict:
        """Calcula el balance y custodia de acciones del usuario."""
        # 1. Acciones obtenidas por paquetes en inversiones aprobadas/activas
        inv_result = await db.execute(
            select(Investor)
            .options(selectinload(Investor.package))
            .where(Investor.user_id == user_id)
        )
        investors = inv_result.scalars().all()
        shares_from_investments = sum(inv.package.granted_shares for inv in investors if inv.package and inv.package.granted_shares)

        # 2. Acciones compradas en el mercado completadas
        bought_result = await db.execute(
            select(func.coalesce(func.sum(ShareTradeOrder.shares_quantity), 0))
            .where(ShareTradeOrder.buyer_id == user_id, ShareTradeOrder.status == "completed")
        )
        shares_bought = int(bought_result.scalar_one() or 0)

        # 3. Acciones vendidas en el mercado completadas
        sold_result = await db.execute(
            select(func.coalesce(func.sum(ShareTradeOrder.shares_quantity), 0))
            .where(ShareTradeOrder.seller_id == user_id, ShareTradeOrder.status == "completed")
        )
        shares_sold = int(sold_result.scalar_one() or 0)

        total_shares_owned = shares_from_investments + shares_bought - shares_sold
        if total_shares_owned < 0:
            total_shares_owned = 0

        # 4. Acciones puestas en venta activa
        listings_result = await db.execute(
            select(ShareListing)
            .where(ShareListing.seller_id == user_id, ShareListing.status == "active")
        )
        my_listings = listings_result.scalars().all()
        shares_listed_active = sum(l.shares_available for l in my_listings)
        shares_locked_in_escrow = sum(l.shares_locked for l in my_listings)

        shares_available_for_sale = max(0, total_shares_owned - shares_listed_active - shares_locked_in_escrow)
        current_price = await ShareMarketService.get_current_price(db)

        # 5. Validación de la ventana de fechas del sistema
        sales_window_open = await SystemEventService.is_event_active(db, "shares_sale") or await SystemEventService.is_event_active(db, "venta_acciones")
        sales_message = "Ventana de venta de acciones abierta." if sales_window_open else "La ventana para poner acciones a la venta se encuentra cerrada según el calendario oficial."

        return {
            "total_shares_owned": total_shares_owned,
            "shares_available_for_sale": shares_available_for_sale,
            "shares_listed_active": shares_listed_active,
            "shares_locked_in_escrow": shares_locked_in_escrow,
            "current_share_price": current_price,
            "portfolio_market_value": round(total_shares_owned * current_price, 2),
            "sales_window_open": sales_window_open,
            "sales_window_message": sales_message
        }

    @staticmethod
    async def create_listing(db: AsyncSession, seller_id: int, shares_quantity: int, price_per_share: float) -> ShareListing:
        """Pone acciones a la venta de forma voluntaria dentro de la ventana de fechas permitida."""
        # 1. Verificar si la fecha de venta del sistema está activa
        is_active_window = await SystemEventService.is_event_active(db, "shares_sale") or await SystemEventService.is_event_active(db, "venta_acciones")
        if not is_active_window:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La venta de acciones solo está permitida durante las fechas programadas en el sistema. Actualmente la ventana está cerrada."
            )

        if shares_quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad de acciones debe ser mayor a 0.")
        if price_per_share <= 0:
            raise HTTPException(status_code=400, detail="El precio por acción debe ser mayor a 0.")

        # 2. Verificar que el usuario tenga suficientes acciones disponibles libres
        portfolio = await ShareMarketService.get_user_portfolio(db, seller_id)
        if portfolio["shares_available_for_sale"] < shares_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No dispones de suficientes acciones libres para vender. Disponibles: {portfolio['shares_available_for_sale']}, Solicitadas: {shares_quantity}."
            )

        listing = ShareListing(
            seller_id=seller_id,
            shares_total=shares_quantity,
            shares_available=shares_quantity,
            shares_locked=0,
            price_per_share=Decimal(str(price_per_share)),
            status="active"
        )
        db.add(listing)
        await db.commit()
        await db.refresh(listing)
        return listing

    @staticmethod
    async def cancel_listing(db: AsyncSession, listing_id: int, user_id: int) -> None:
        """Cancela una oferta de venta propia si no tiene compras pendientes en custodia."""
        result = await db.execute(select(ShareListing).where(ShareListing.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing:
            raise HTTPException(status_code=404, detail="Oferta no encontrada.")
        if listing.seller_id != user_id:
            raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta oferta.")
        if listing.shares_locked > 0:
            raise HTTPException(status_code=400, detail="No puedes cancelar la oferta porque tiene acciones retenidas en proceso de compra con excedente.")

        listing.status = "cancelled"
        await db.commit()

    @staticmethod
    async def get_active_listings(db: AsyncSession, current_user_id: Optional[int] = None) -> List[dict]:
        """Obtiene todas las ofertas de acciones activas en el mercado."""
        result = await db.execute(
            select(ShareListing)
            .options(selectinload(ShareListing.seller))
            .where(ShareListing.status == "active", ShareListing.shares_available > 0)
            .order_by(ShareListing.created_at.desc())
        )
        listings = result.scalars().all()
        return [
            {
                "id": l.id,
                "seller_id": l.seller_id,
                "seller_name": l.seller.name if l.seller else "Inversionista",
                "seller_email": l.seller.email if l.seller else None,
                "shares_total": l.shares_total,
                "shares_available": l.shares_available,
                "shares_locked": l.shares_locked,
                "price_per_share": float(l.price_per_share),
                "total_value": float(l.shares_available * l.price_per_share),
                "status": l.status,
                "created_at": l.created_at,
                "is_mine": l.seller_id == current_user_id
            }
            for l in listings
        ]

    @staticmethod
    async def buy_shares_instant(db: AsyncSession, buyer_id: int, listing_id: int, shares_quantity: int) -> ShareTradeOrder:
        """Compra inmediata en tiempo real con 100% de saldo en billetera."""
        if shares_quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0.")

        result = await db.execute(
            select(ShareListing)
            .options(selectinload(ShareListing.seller))
            .where(ShareListing.id == listing_id, ShareListing.status == "active")
        )
        listing = result.scalar_one_or_none()
        if not listing:
            raise HTTPException(status_code=404, detail="La oferta de acciones no está disponible o fue cerrada.")

        if listing.seller_id == buyer_id:
            raise HTTPException(status_code=400, detail="No puedes comprar tus propias acciones.")

        if listing.shares_available < shares_quantity:
            raise HTTPException(status_code=400, detail=f"Solo hay {listing.shares_available} acciones disponibles en esta oferta.")

        unit_price = float(listing.price_per_share)
        total_cost = unit_price * shares_quantity

        # Verificar saldo en billetera del comprador
        w_res = await db.execute(select(Wallet).where(Wallet.user_id == buyer_id))
        buyer_wallet = w_res.scalar_one_or_none()
        if not buyer_wallet or float(buyer_wallet.balance) < total_cost:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Saldo insuficiente en billetera. Requieres ${total_cost:,.0f} COP pero tienes ${(float(buyer_wallet.balance) if buyer_wallet else 0):,.0f} COP."
            )

        # 1. Débito al comprador
        buyer_wallet.balance = Decimal(str(float(buyer_wallet.balance) - total_cost))
        db.add(WalletTransaction(
            wallet_id=buyer_wallet.id,
            amount=Decimal(str(-total_cost)),
            type="share_purchase",
            description=f"Compra de {shares_quantity} acción(es) Gloint a ${unit_price:,.0f} COP",
            balance_after=buyer_wallet.balance
        ))

        # 2. Abono al vendedor
        s_res = await db.execute(select(Wallet).where(Wallet.user_id == listing.seller_id))
        seller_wallet = s_res.scalar_one_or_none()
        if not seller_wallet:
            seller_wallet = Wallet(user_id=listing.seller_id, balance=Decimal("0.00"), currency="COP")
            db.add(seller_wallet)
            await db.flush()

        seller_wallet.balance = Decimal(str(float(seller_wallet.balance) + total_cost))
        db.add(WalletTransaction(
            wallet_id=seller_wallet.id,
            amount=Decimal(str(total_cost)),
            type="share_sale",
            description=f"Venta de {shares_quantity} acción(es) Gloint a ${unit_price:,.0f} COP",
            balance_after=seller_wallet.balance
        ))

        # 3. Actualizar listing
        listing.shares_available -= shares_quantity
        if listing.shares_available == 0 and listing.shares_locked == 0:
            listing.status = "sold_out"

        # 4. Crear orden completada
        order = ShareTradeOrder(
            listing_id=listing.id,
            seller_id=listing.seller_id,
            buyer_id=buyer_id,
            shares_quantity=shares_quantity,
            price_per_share=Decimal(str(unit_price)),
            total_amount=Decimal(str(total_cost)),
            wallet_amount_used=Decimal(str(total_cost)),
            surplus_amount=Decimal("0.00"),
            payment_method="full_wallet",
            status="completed"
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def create_surplus_trade_order(
        db: AsyncSession,
        buyer_id: int,
        listing_id: int,
        shares_quantity: int,
        wallet_amount_used: float,
        surplus_amount: float,
        receipt_file: UploadFile
    ) -> ShareTradeOrder:
        """Crea una orden con excedente/transferencia bancaria, bloqueando acciones en custodia."""
        if shares_quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a 0.")

        result = await db.execute(
            select(ShareListing)
            .options(selectinload(ShareListing.seller))
            .where(ShareListing.id == listing_id, ShareListing.status == "active")
        )
        listing = result.scalar_one_or_none()
        if not listing:
            raise HTTPException(status_code=404, detail="La oferta no está disponible.")

        if listing.seller_id == buyer_id:
            raise HTTPException(status_code=400, detail="No puedes comprar tus propias acciones.")

        if listing.shares_available < shares_quantity:
            raise HTTPException(status_code=400, detail=f"Solo hay {listing.shares_available} acciones disponibles.")

        unit_price = float(listing.price_per_share)
        total_cost = unit_price * shares_quantity

        if round(wallet_amount_used + surplus_amount, 2) < round(total_cost, 2):
            raise HTTPException(status_code=400, detail="El saldo usado más el excedente no cubren el total de la compra.")

        # Guardar comprobante bancario
        ext = os.path.splitext(receipt_file.filename or "")[1]
        filename = f"receipt_{buyer_id}_{int(datetime.utcnow().timestamp())}{ext}"
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(receipt_file.file, buffer)

        db_receipt_url = f"/uploads/share_receipts/{filename}"

        # Si se usó parte del saldo de billetera, congelarlo / debitarlo temporalmente
        if wallet_amount_used > 0:
            w_res = await db.execute(select(Wallet).where(Wallet.user_id == buyer_id))
            buyer_wallet = w_res.scalar_one_or_none()
            if not buyer_wallet or float(buyer_wallet.balance) < wallet_amount_used:
                raise HTTPException(status_code=400, detail="Saldo insuficiente en billetera para cubrir la porción de saldo.")

            buyer_wallet.balance = Decimal(str(float(buyer_wallet.balance) - wallet_amount_used))
            db.add(WalletTransaction(
                wallet_id=buyer_wallet.id,
                amount=Decimal(str(-wallet_amount_used)),
                type="share_purchase_hold",
                description=f"Retención en custodia por compra de {shares_quantity} acción(es) (Pendiente aprobación)",
                balance_after=buyer_wallet.balance
            ))

        # Bloquear acciones en custodia (escrow)
        listing.shares_available -= shares_quantity
        listing.shares_locked += shares_quantity

        order = ShareTradeOrder(
            listing_id=listing.id,
            seller_id=listing.seller_id,
            buyer_id=buyer_id,
            shares_quantity=shares_quantity,
            price_per_share=Decimal(str(unit_price)),
            total_amount=Decimal(str(total_cost)),
            wallet_amount_used=Decimal(str(wallet_amount_used)),
            surplus_amount=Decimal(str(surplus_amount)),
            receipt_url=db_receipt_url,
            payment_method="surplus_bank_transfer",
            status="pending_admin_approval"
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def get_all_trade_orders(db: AsyncSession, status_filter: Optional[str] = None, user_id: Optional[int] = None) -> List[dict]:
        """Obtiene el historial o bandeja de órdenes de compra."""
        query = (
            select(ShareTradeOrder)
            .options(
                selectinload(ShareTradeOrder.seller),
                selectinload(ShareTradeOrder.buyer),
                selectinload(ShareTradeOrder.approver)
            )
            .order_by(ShareTradeOrder.created_at.desc())
        )
        if status_filter:
            query = query.where(ShareTradeOrder.status == status_filter)
        if user_id:
            query = query.where(or_(ShareTradeOrder.buyer_id == user_id, ShareTradeOrder.seller_id == user_id))

        result = await db.execute(query)
        orders = result.scalars().all()

        return [
            {
                "id": o.id,
                "listing_id": o.listing_id,
                "issuance_id": o.issuance_id,
                "seller_id": o.seller_id,
                "seller_name": o.seller.name if o.seller else "Gloint Oficial",
                "buyer_id": o.buyer_id,
                "buyer_name": o.buyer.name if o.buyer else "Usuario",
                "buyer_email": o.buyer.email if o.buyer else None,
                "buyer_phone": o.buyer.phone_number if o.buyer else None,
                "buyer_document": o.buyer.document_id if o.buyer else None,
                "shares_quantity": o.shares_quantity,
                "price_per_share": float(o.price_per_share),
                "total_amount": float(o.total_amount),
                "wallet_amount_used": float(o.wallet_amount_used),
                "surplus_amount": float(o.surplus_amount),
                "receipt_url": o.receipt_url,
                "payment_method": o.payment_method,
                "status": o.status,
                "admin_notes": o.admin_notes,
                "approved_by": o.approved_by,
                "approver_name": o.approver.name if o.approver else None,
                "approved_at": o.approved_at,
                "created_at": o.created_at
            }
            for o in orders
        ]

    @staticmethod
    async def admin_decide_trade(db: AsyncSession, order_id: int, admin_id: int, action: str, notes: Optional[str] = None) -> ShareTradeOrder:
        """Aprueba o rechaza una orden de compra con excedente pendiente de verificación."""
        result = await db.execute(
            select(ShareTradeOrder)
            .options(selectinload(ShareTradeOrder.listing))
            .where(ShareTradeOrder.id == order_id)
        )
        order = result.scalar_one_or_none()
        if not order:
            raise HTTPException(status_code=404, detail="Orden no encontrada.")
        if order.status != "pending_admin_approval":
            raise HTTPException(status_code=400, detail=f"La orden ya se encuentra en estado '{order.status}'.")

        listing = order.listing

        if action == "approve":
            # 1. Liberar acciones de custodia al comprador
            if listing:
                listing.shares_locked = max(0, listing.shares_locked - order.shares_quantity)
                if listing.shares_available == 0 and listing.shares_locked == 0:
                    listing.status = "sold_out"

            # 2. Acreditar monto total al vendedor
            if order.seller_id:
                s_res = await db.execute(select(Wallet).where(Wallet.user_id == order.seller_id))
                seller_wallet = s_res.scalar_one_or_none()
                if not seller_wallet:
                    seller_wallet = Wallet(user_id=order.seller_id, balance=Decimal("0.00"), currency="COP")
                    db.add(seller_wallet)
                    await db.flush()

                seller_wallet.balance = Decimal(str(float(seller_wallet.balance) + float(order.total_amount)))
                db.add(WalletTransaction(
                    wallet_id=seller_wallet.id,
                    amount=order.total_amount,
                    type="share_sale",
                    description=f"Venta de {order.shares_quantity} acción(es) Gloint (Aprobada por Admin)",
                    balance_after=seller_wallet.balance
                ))

            order.status = "completed"
            order.approved_by = admin_id
            order.approved_at = datetime.utcnow()
            order.admin_notes = notes

        elif action == "reject":
            # 1. Devolver acciones bloqueadas a disponibles en la oferta
            if listing:
                listing.shares_locked = max(0, listing.shares_locked - order.shares_quantity)
                listing.shares_available += order.shares_quantity

            # 2. Devolver saldo de billetera retenido al comprador si usó
            if float(order.wallet_amount_used) > 0:
                b_res = await db.execute(select(Wallet).where(Wallet.user_id == order.buyer_id))
                buyer_wallet = b_res.scalar_one_or_none()
                if buyer_wallet:
                    buyer_wallet.balance = Decimal(str(float(buyer_wallet.balance) + float(order.wallet_amount_used)))
                    db.add(WalletTransaction(
                        wallet_id=buyer_wallet.id,
                        amount=order.wallet_amount_used,
                        type="share_hold_refund",
                        description=f"Devolución de saldo retenido por orden de acciones rechazada #{order.id}",
                        balance_after=buyer_wallet.balance
                    ))

            order.status = "rejected"
            order.approved_by = admin_id
            order.approved_at = datetime.utcnow()
            order.admin_notes = notes or "Rechazado por verificación de comprobante"

        else:
            raise HTTPException(status_code=400, detail="Acción no válida. Usa 'approve' o 'reject'.")

        await db.commit()
        await db.refresh(order)
        return order

    # --- Emisión Corporativa de Acciones ---
    @staticmethod
    async def create_issuance(db: AsyncSession, admin_id: int, title: str, description: Optional[str], total_shares: int, price_per_share: float) -> ShareIssuance:
        """Crea una nueva emisión de acciones corporativas."""
        issuance = ShareIssuance(
            title=title,
            description=description,
            total_shares_issued=total_shares,
            available_shares=total_shares,
            price_per_share=Decimal(str(price_per_share)),
            created_by=admin_id,
            is_active=True
        )
        db.add(issuance)
        await db.commit()
        await db.refresh(issuance)
        return issuance

    @staticmethod
    async def get_issuances(db: AsyncSession) -> List[dict]:
        """Lista todas las emisiones corporativas de acciones."""
        result = await db.execute(
            select(ShareIssuance)
            .options(selectinload(ShareIssuance.creator))
            .order_by(ShareIssuance.created_at.desc())
        )
        issuances = result.scalars().all()
        return [
            {
                "id": i.id,
                "title": i.title,
                "description": i.description,
                "total_shares_issued": i.total_shares_issued,
                "available_shares": i.available_shares,
                "price_per_share": float(i.price_per_share),
                "is_active": i.is_active,
                "created_by": i.created_by,
                "creator_name": i.creator.name if i.creator else None,
                "created_at": i.created_at
            }
            for i in issuances
        ]
