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

from src.models.share_market import SharePriceHistory, ShareIssuance, ShareListing, ShareTradeOrder, UserShare, ShareMovement
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
        """Obtiene el precio oficial y real de la acción más reciente."""
        # 1. Consultar el último registro en la bitácora histórica de precios
        hist_result = await db.execute(
            select(SharePriceHistory)
            .order_by(SharePriceHistory.created_at.desc(), SharePriceHistory.id.desc())
            .limit(1)
        )
        latest_hist = hist_result.scalar_one_or_none()

        # 2. Consultar la última emisión corporativa registrada
        iss_result = await db.execute(
            select(ShareIssuance)
            .order_by(ShareIssuance.created_at.desc(), ShareIssuance.id.desc())
            .limit(1)
        )
        latest_iss = iss_result.scalar_one_or_none()

        # Comparar cuál es más reciente entre historial y emisión
        if latest_hist and latest_iss:
            if latest_hist.created_at >= latest_iss.created_at:
                return float(latest_hist.new_price)
            else:
                return float(latest_iss.price_per_share)
        elif latest_hist and latest_hist.new_price is not None and float(latest_hist.new_price) > 0:
            return float(latest_hist.new_price)
        elif latest_iss and latest_iss.price_per_share is not None and float(latest_iss.price_per_share) > 0:
            return float(latest_iss.price_per_share)

        # 3. Si no hay emisiones ni historial, verificar en paquetes activos la relación precio/acción
        pkg_result = await db.execute(
            select(Package)
            .where(Package.is_active == True, Package.granted_shares > 0)
            .order_by(Package.value.asc())
        )
        packages = pkg_result.scalars().all()
        if packages:
            valid_prices = [float(p.value) / p.granted_shares for p in packages if p.granted_shares > 0]
            if valid_prices and valid_prices[0] > 0:
                return float(valid_prices[0])

        return 50000.0  # Valor base inicial como último recurso


    @staticmethod
    async def get_current_available_shares(db: AsyncSession) -> int:
        """Obtiene la cantidad total de acciones disponibles registradas por el admin."""
        # 1. Suma de acciones disponibles de las emisiones activas creadas por el admin
        iss_result = await db.execute(
            select(func.coalesce(func.sum(ShareIssuance.available_shares), 0))
            .where(ShareIssuance.is_active == True)
        )
        total_from_iss = int(iss_result.scalar_one() or 0)
        if total_from_iss > 0:
            return total_from_iss

        # 2. Historial si no hay en emisiones
        result = await db.execute(
            select(SharePriceHistory)
            .order_by(SharePriceHistory.id.desc())
            .limit(1)
        )
        latest = result.scalar_one_or_none()
        if latest and getattr(latest, 'new_available_shares', None) is not None and int(latest.new_available_shares) > 0:
            return int(latest.new_available_shares)

        return 0

    @staticmethod
    async def update_official_price(
        db: AsyncSession, 
        new_price: float, 
        justification_notes: str, 
        admin_id: int,
        available_shares: Optional[int] = None
    ) -> SharePriceHistory:
        """Actualiza el precio oficial y la cantidad de acciones disponibles con trazabilidad obligatoria."""
        if not justification_notes or not justification_notes.strip() or len(justification_notes.strip()) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Es obligatorio ingresar un motivo o justificación detallada para registrar el cambio en la bitácora."
            )

        current_price = await ShareMarketService.get_current_price(db)
        current_available_shares = await ShareMarketService.get_current_available_shares(db)
        
        diff = new_price - current_price
        pct = (diff / current_price * 100) if current_price > 0 else 0.0

        new_shares = available_shares if available_shares is not None else current_available_shares

        history = SharePriceHistory(
            previous_price=Decimal(str(current_price)),
            new_price=Decimal(str(new_price)),
            change_percentage=Decimal(str(round(pct, 2))),
            previous_available_shares=current_available_shares,
            new_available_shares=new_shares,
            justification_notes=justification_notes.strip(),
            admin_id=admin_id
        )
        db.add(history)
        await db.commit()
        await db.refresh(history)
        return history

    @staticmethod
    async def get_price_history(db: AsyncSession) -> List[dict]:
        """Obtiene la bitácora histórica completa de variaciones de precio, cantidad disponible y notas."""
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
                "previous_available_shares": int(getattr(r, 'previous_available_shares', 0) or 0),
                "new_available_shares": int(getattr(r, 'new_available_shares', 0) or 0),
                "justification_notes": r.justification_notes,
                "admin_id": r.admin_id,
                "admin_name": r.admin.name if r.admin else "Administrador",
                "created_at": r.created_at
            }
            for r in records
        ]

    @staticmethod
    async def get_or_create_user_shares(db: AsyncSession, user_id: int) -> UserShare:
        """Obtiene o inicializa la cuenta de acciones de un usuario."""
        res = await db.execute(select(UserShare).where(UserShare.user_id == user_id))
        acc = res.scalar_one_or_none()
        if not acc:
            acc = UserShare(user_id=user_id, total_shares=0, available_shares=0, locked_shares=0)
            db.add(acc)
            await db.flush()
        return acc

    @staticmethod
    async def record_share_movement(
        db: AsyncSession,
        user_id: int,
        movement_type: str,
        quantity: int,
        description: str,
        investor_id: Optional[int] = None,
        package_id: Optional[int] = None,
        trade_order_id: Optional[int] = None,
        listing_id: Optional[int] = None,
        created_at: Optional[datetime] = None
    ) -> ShareMovement:
        """Registra una transacción inmutable en el Libro Mayor de Acciones y actualiza el balance consolidado."""
        account = await ShareMarketService.get_or_create_user_shares(db, user_id)
        balance_before = account.total_shares
        qty = abs(quantity)

        if movement_type in ["package_grant", "market_buy"]:
            account.total_shares += qty
            account.available_shares += qty
        elif movement_type == "market_sell":
            # Al venderse, se descuentan de las acciones que estaban en custodia (locked_shares)
            deduct_locked = min(account.locked_shares, qty)
            account.locked_shares -= deduct_locked
            rem = qty - deduct_locked
            account.available_shares = max(0, account.available_shares - rem)
            account.total_shares = max(0, account.total_shares - qty)
        elif movement_type == "listing_lock":
            # Retención por publicación de oferta: pasa de disponible a bloqueado
            account.available_shares = max(0, account.available_shares - qty)
            account.locked_shares += qty
        elif movement_type == "listing_unlock":
            # Desbloqueo por cancelación de oferta o rechazo: pasa de bloqueado a disponible
            account.locked_shares = max(0, account.locked_shares - qty)
            account.available_shares += qty
        elif movement_type == "admin_adjustment":
            account.total_shares = max(0, account.total_shares + quantity)
            account.available_shares = max(0, account.available_shares + quantity)

        balance_after = account.total_shares

        db.add(account)
        movement = ShareMovement(
            user_id=user_id,
            movement_type=movement_type,
            shares_quantity=quantity,
            balance_before=balance_before,
            balance_after=balance_after,
            investor_id=investor_id,
            package_id=package_id,
            trade_order_id=trade_order_id,
            listing_id=listing_id,
            description=description,
            created_at=created_at or datetime.utcnow()
        )
        db.add(movement)
        await db.flush()
        return movement

    @staticmethod
    async def sync_legacy_shares_for_user(db: AsyncSession, user_id: int) -> int:
        """Sincroniza retroactivamente contratos de inversión y órdenes previas que no tengan movimiento en el ledger. Retorna la cantidad de acciones acreditadas."""
        credited_shares = 0
        current_price = await ShareMarketService.get_current_price(db)

        # 1. Contratos de inversión con paquetes que otorgan acciones
        inv_result = await db.execute(
            select(Investor)
            .options(selectinload(Investor.package))
            .where(Investor.user_id == user_id)
        )
        investors = inv_result.scalars().all()

        for inv in investors:
            shares_to_grant = inv.package.granted_shares if (inv.package and inv.package.granted_shares and inv.package.granted_shares > 0) else 0

            if shares_to_grant > 0:
                acq_date = inv.start_date or inv.created_at or datetime.utcnow()

                # Comprobar movimientos previos de paquete para este contrato
                chk = await db.execute(
                    select(ShareMovement)
                    .where(
                        ShareMovement.user_id == user_id, 
                        ShareMovement.investor_id == inv.id,
                        ShareMovement.movement_type == "package_grant"
                    )
                    .order_by(ShareMovement.id.asc())
                )
                existing_movements = chk.scalars().all()
                total_current_pkg_shares = sum(m.shares_quantity for m in existing_movements)

                if total_current_pkg_shares != shares_to_grant or not existing_movements:
                    # Reemplazar movimientos incorrectos o desactualizados por el valor exacto del paquete
                    for old_m in existing_movements:
                        await db.delete(old_m)
                    await db.flush()

                    pkg_val = f"${inv.package.value:,.0f} COP" if (inv.package and inv.package.value) else ""
                    desc = f"Otorgamiento de {shares_to_grant} acciones por adquisición de Paquete ({pkg_val}) - Contrato #{inv.assigned_code or inv.id}"
                    new_m = ShareMovement(
                        user_id=user_id,
                        movement_type="package_grant",
                        shares_quantity=shares_to_grant,
                        balance_before=0,
                        balance_after=0,
                        investor_id=inv.id,
                        package_id=inv.package_id,
                        description=desc,
                        created_at=acq_date
                    )
                    db.add(new_m)
                    await db.flush()
                    credited_shares += shares_to_grant
                else:
                    # Si ya coincide la cantidad, asegurar fecha de adquisición en el movimiento
                    first_m = existing_movements[0]
                    if acq_date and first_m.created_at != acq_date:
                        first_m.created_at = acq_date

        # 2. Sincronizar compras completadas previas en mercado si no fueron registradas
        b_orders = await db.execute(
            select(ShareTradeOrder)
            .where(ShareTradeOrder.buyer_id == user_id, ShareTradeOrder.status == "completed")
        )
        for bo in b_orders.scalars().all():
            order_date = bo.created_at or bo.updated_at or datetime.utcnow()
            chk_bo = await db.execute(
                select(ShareMovement).where(ShareMovement.user_id == user_id, ShareMovement.trade_order_id == bo.id)
            )
            existing_bo_sm = chk_bo.scalars().first()
            if not existing_bo_sm:
                await ShareMarketService.record_share_movement(
                    db=db,
                    user_id=user_id,
                    movement_type="market_buy",
                    quantity=bo.shares_quantity,
                    description=f"Compra de {bo.shares_quantity} acción(es) en mercado (Orden #{bo.id})",
                    trade_order_id=bo.id,
                    listing_id=bo.listing_id,
                    created_at=order_date
                )
                credited_shares += bo.shares_quantity
            else:
                if order_date and existing_bo_sm.created_at != order_date:
                    existing_bo_sm.created_at = order_date

        # 3. Sincronizar ventas completadas previas en mercado si no fueron registradas
        s_orders = await db.execute(
            select(ShareTradeOrder)
            .where(ShareTradeOrder.seller_id == user_id, ShareTradeOrder.status == "completed")
        )
        for so in s_orders.scalars().all():
            order_date = so.created_at or so.updated_at or datetime.utcnow()
            chk_so = await db.execute(
                select(ShareMovement).where(
                    ShareMovement.user_id == user_id, 
                    ShareMovement.trade_order_id == so.id, 
                    ShareMovement.movement_type == "market_sell"
                )
            )
            existing_so_sm = chk_so.scalars().first()
            if not existing_so_sm:
                await ShareMarketService.record_share_movement(
                    db=db,
                    user_id=user_id,
                    movement_type="market_sell",
                    quantity=-so.shares_quantity,
                    description=f"Venta de {so.shares_quantity} acción(es) en mercado (Orden #{so.id})",
                    trade_order_id=so.id,
                    listing_id=so.listing_id,
                    created_at=order_date
                )
            else:
                if order_date and existing_so_sm.created_at != order_date:
                    existing_so_sm.created_at = order_date

        # 4. Recalibrar saldo inmutable de share_movements y user_shares
        all_movs_res = await db.execute(
            select(ShareMovement)
            .where(ShareMovement.user_id == user_id)
            .order_by(ShareMovement.created_at.asc(), ShareMovement.id.asc())
        )
        all_movs = all_movs_res.scalars().all()

        running_balance = 0
        for m in all_movs:
            m.balance_before = running_balance
            if m.movement_type in ["package_grant", "market_buy", "admin_adjustment"]:
                running_balance += m.shares_quantity
            elif m.movement_type == "market_sell":
                running_balance = max(0, running_balance - abs(m.shares_quantity))
            m.balance_after = running_balance
            db.add(m)

        # 5. Asegurar que las ofertas de venta activas tengan sus acciones en locked_shares
        l_res = await db.execute(
            select(ShareListing)
            .where(ShareListing.seller_id == user_id, ShareListing.status == "active")
        )
        active_listings = l_res.scalars().all()
        total_listed = sum(l.shares_available for l in active_listings)
        total_in_escrow = sum(l.shares_locked for l in active_listings)
        
        account = await ShareMarketService.get_or_create_user_shares(db, user_id)
        account.total_shares = max(0, running_balance)
        target_locked = total_listed + total_in_escrow
        account.locked_shares = min(account.total_shares, target_locked)
        account.available_shares = max(0, account.total_shares - account.locked_shares)
        db.add(account)

        await db.commit()
        return credited_shares

    @staticmethod
    async def get_user_portfolio(db: AsyncSession, user_id: int) -> dict:
        """Calcula el balance y custodia de acciones del usuario desde la cuenta consolidada user_shares."""
        await ShareMarketService.sync_legacy_shares_for_user(db, user_id)
        account = await ShareMarketService.get_or_create_user_shares(db, user_id)

        current_price = await ShareMarketService.get_current_price(db)
        sales_window_open = await SystemEventService.is_event_active(db, "shares_sale") or await SystemEventService.is_event_active(db, "venta_acciones")
        sales_message = "Ventana de venta de acciones abierta." if sales_window_open else "La ventana para poner acciones a la venta se encuentra cerrada según el calendario oficial."

        return {
            "total_shares_owned": account.total_shares,
            "shares_available_for_sale": account.available_shares,
            "shares_listed_active": account.locked_shares,
            "shares_locked_in_escrow": account.locked_shares,
            "current_share_price": current_price,
            "portfolio_market_value": round(account.total_shares * current_price, 2),
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

        # 2. Verificar que el usuario tenga suficientes acciones disponibles libres en su cuenta
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
        await db.flush()

        # 3. Retener acciones en custodia y asentar en el libro mayor de movimientos
        await ShareMarketService.record_share_movement(
            db=db,
            user_id=seller_id,
            movement_type="listing_lock",
            quantity=shares_quantity,
            description=f"Retención de {shares_quantity} acción(es) por publicación de oferta #{listing.id} a ${price_per_share:,.0f} COP",
            listing_id=listing.id
        )

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

        # Liberar acciones retenidas de vuelta a disponibles
        if listing.shares_available > 0:
            await ShareMarketService.record_share_movement(
                db=db,
                user_id=user_id,
                movement_type="listing_unlock",
                quantity=listing.shares_available,
                description=f"Liberación de {listing.shares_available} acción(es) a saldo disponible por retiro de oferta #{listing.id}",
                listing_id=listing.id
            )

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
        await db.flush()

        # 5. Asentar movimientos en el libro mayor
        # Vendedor: salida de acciones
        await ShareMarketService.record_share_movement(
            db=db,
            user_id=listing.seller_id,
            movement_type="market_sell",
            quantity=-shares_quantity,
            description=f"Venta de {shares_quantity} acción(es) en mercado (Orden #{order.id})",
            trade_order_id=order.id,
            listing_id=listing.id
        )

        # Comprador: entrada de acciones
        await ShareMarketService.record_share_movement(
            db=db,
            user_id=buyer_id,
            movement_type="market_buy",
            quantity=shares_quantity,
            description=f"Compra instantánea de {shares_quantity} acción(es) a ${unit_price:,.0f} COP (Orden #{order.id})",
            trade_order_id=order.id,
            listing_id=listing.id
        )

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

            # 3. Asentar movimientos en el libro mayor
            if order.seller_id:
                await ShareMarketService.record_share_movement(
                    db=db,
                    user_id=order.seller_id,
                    movement_type="market_sell",
                    quantity=-order.shares_quantity,
                    description=f"Venta de {order.shares_quantity} acción(es) (Orden #{order.id} aprobada por Admin)",
                    trade_order_id=order.id,
                    listing_id=order.listing_id
                )

            await ShareMarketService.record_share_movement(
                db=db,
                user_id=order.buyer_id,
                movement_type="market_buy",
                quantity=order.shares_quantity,
                description=f"Compra de {order.shares_quantity} acción(es) aprobada por Admin (Orden #{order.id})",
                trade_order_id=order.id,
                listing_id=order.listing_id
            )

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

            # 3. Registrar desbloqueo en vendedor si aplica
            if order.seller_id:
                await ShareMarketService.record_share_movement(
                    db=db,
                    user_id=order.seller_id,
                    movement_type="listing_unlock",
                    quantity=order.shares_quantity,
                    description=f"Desbloqueo de {order.shares_quantity} acción(es) devueltas a disponible por rechazo de compra #{order.id}",
                    trade_order_id=order.id,
                    listing_id=order.listing_id
                )

        else:
            raise HTTPException(status_code=400, detail="Acción no válida. Usa 'approve' o 'reject'.")

        await db.commit()
        await db.refresh(order)
        return order

    @staticmethod
    async def create_issuance(db: AsyncSession, admin_id: int, title: str, description: Optional[str], total_shares: int, price_per_share: float) -> ShareIssuance:
        """Crea una nueva emisión de acciones corporativas y la sincroniza con el stock y la bitácora del fondo."""
        # 1. Obtener precio y stock ANTES de crear la nueva emisión
        previous_price = await ShareMarketService.get_current_price(db)
        current_available_shares = await ShareMarketService.get_current_available_shares(db)
        new_total_shares = current_available_shares + total_shares

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
        await db.flush()

        desc_info = f" - {description}" if description else ""
        justification = f"Emisión de Acciones #{issuance.id}: '{title}'{desc_info}. Stock emitido: {total_shares} acciones a ${price_per_share:,.0f} COP."

        diff = price_per_share - previous_price
        pct = (diff / previous_price * 100) if previous_price > 0 else 0.0

        history = SharePriceHistory(
            previous_price=Decimal(str(previous_price)),
            new_price=Decimal(str(price_per_share)),
            change_percentage=Decimal(str(round(pct, 2))),
            previous_available_shares=current_available_shares,
            new_available_shares=new_total_shares,
            justification_notes=justification,
            admin_id=admin_id
        )
        db.add(history)

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

    @staticmethod
    async def get_user_movements(db: AsyncSession, user_id: int) -> List[dict]:
        """Obtiene el extracto cronológico inmutable de movimientos de acciones del usuario."""
        # Asegurar sincronización inicial
        await ShareMarketService.sync_legacy_shares_for_user(db, user_id)
        
        result = await db.execute(
            select(ShareMovement)
            .options(
                selectinload(ShareMovement.investor),
                selectinload(ShareMovement.package)
            )
            .where(ShareMovement.user_id == user_id)
            .order_by(ShareMovement.created_at.desc(), ShareMovement.id.desc())
        )
        movements = result.scalars().all()
        return [
            {
                "id": m.id,
                "user_id": m.user_id,
                "movement_type": m.movement_type,
                "shares_quantity": m.shares_quantity,
                "balance_before": m.balance_before,
                "balance_after": m.balance_after,
                "investor_id": m.investor_id,
                "investor_code": m.investor.assigned_code if m.investor else None,
                "package_id": m.package_id,
                "package_value": float(m.package.value) if m.package and m.package.value else None,
                "trade_order_id": m.trade_order_id,
                "listing_id": m.listing_id,
                "description": m.description,
                "created_at": m.created_at
            }
            for m in movements
        ]

    @staticmethod
    async def sync_all_users_legacy_shares(db: AsyncSession) -> dict:
        """Sincroniza retroactivamente a todos los usuarios del sistema que tengan contratos de inversión u órdenes."""
        inv_res = await db.execute(select(Investor.user_id).distinct())
        user_ids = set([uid for uid in inv_res.scalars().all() if uid is not None])

        orders_res = await db.execute(
            select(ShareTradeOrder.buyer_id)
            .where(ShareTradeOrder.status == "completed")
            .distinct()
        )
        for b_uid in orders_res.scalars().all():
            if b_uid:
                user_ids.add(b_uid)

        orders_s_res = await db.execute(
            select(ShareTradeOrder.seller_id)
            .where(ShareTradeOrder.status == "completed")
            .distinct()
        )
        for s_uid in orders_s_res.scalars().all():
            if s_uid:
                user_ids.add(s_uid)

        synced_count = 0
        total_shares_credited = 0
        updated_users = []
        for uid in user_ids:
            credited = await ShareMarketService.sync_legacy_shares_for_user(db, uid)
            if credited > 0:
                total_shares_credited += credited
                user_res = await db.execute(select(User.name, User.email).where(User.id == uid))
                u_row = user_res.first()
                updated_users.append({
                    "user_id": uid,
                    "user_name": u_row[0] if u_row and u_row[0] else f"Usuario #{uid}",
                    "user_email": u_row[1] if u_row and u_row[1] else "",
                    "shares_credited": credited
                })
            synced_count += 1

        await db.commit()
        return {
            "status": "success",
            "users_synced": synced_count,
            "synced_users_count": synced_count,
            "total_shares_credited": total_shares_credited,
            "updated_users": updated_users
        }

    @staticmethod
    async def manual_share_grant(
        db: AsyncSession,
        user_id: int,
        quantity: int,
        reason: str,
        admin_id: int,
        custom_date: Optional[datetime] = None
    ) -> ShareMovement:
        """Asigna acciones a un usuario de manera manual por decisión administrativa con registro en el ledger."""
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="La cantidad de acciones a otorgar debe ser mayor a 0.")

        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado.")

        acq_date = custom_date or datetime.utcnow()
        clean_reason = reason.strip()
        desc = f"Asignación manual de {quantity} acción(es) por administración: {clean_reason}"

        movement = await ShareMarketService.record_share_movement(
            db=db,
            user_id=user_id,
            movement_type="admin_adjustment",
            quantity=quantity,
            description=desc,
            created_at=acq_date
        )

        await db.commit()
        return movement
