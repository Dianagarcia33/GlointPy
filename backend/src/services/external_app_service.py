import secrets
import hashlib
import json
import hmac
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, and_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
import httpx

from src.models.external_app import ExternalApp, ExternalPaymentOrder, ExternalPaymentStatus
from src.models.wallet import Wallet, WalletTransaction
from src.models.user import User
from src.schemas.external_app import (
    ExternalAppCreate,
    ExternalAppUpdate,
    CreatePaymentIntentRequest
)

class ExternalAppService:
    
    @staticmethod
    def _generate_api_key() -> Tuple[str, str, str]:
        """
        Generates client_id, plain_api_key, and its sha256 hash.
        """
        client_id = f"glt_app_{secrets.token_hex(8)}"
        raw_secret = secrets.token_urlsafe(32)
        api_key = f"glt_live_{raw_secret}"
        api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        webhook_secret = f"glt_whsec_{secrets.token_hex(16)}"
        return client_id, api_key, api_key_hash, webhook_secret

    @staticmethod
    def _hash_api_key(api_key: str) -> str:
        return hashlib.sha256(api_key.strip().encode()).hexdigest()

    @staticmethod
    async def create_app(db: AsyncSession, app_in: ExternalAppCreate, creator_id: int) -> Tuple[ExternalApp, str]:
        client_id, api_key, api_key_hash, webhook_secret = ExternalAppService._generate_api_key()
        
        new_app = ExternalApp(
            name=app_in.name,
            description=app_in.description,
            client_id=client_id,
            api_key_hash=api_key_hash,
            webhook_url=app_in.webhook_url,
            webhook_secret=webhook_secret,
            redirect_urls=app_in.redirect_urls,
            is_active=app_in.is_active,
            created_by=creator_id
        )
        db.add(new_app)
        await db.commit()
        await db.refresh(new_app)
        return new_app, api_key

    @staticmethod
    async def get_all_apps(db: AsyncSession) -> List[dict]:
        query = select(ExternalApp).order_by(desc(ExternalApp.created_at))
        res = await db.execute(query)
        apps = res.scalars().all()
        
        result = []
        for app in apps:
            # Aggregate stats
            stats_query = select(
                func.count(ExternalPaymentOrder.id),
                func.sum(ExternalPaymentOrder.amount)
            ).where(
                and_(
                    ExternalPaymentOrder.app_id == app.id,
                    ExternalPaymentOrder.status == ExternalPaymentStatus.COMPLETED
                )
            )
            stats_res = await db.execute(stats_query)
            count, volume = stats_res.first() or (0, 0.0)

            result.append({
                "id": app.id,
                "name": app.name,
                "description": app.description,
                "client_id": app.client_id,
                "webhook_url": app.webhook_url,
                "webhook_secret": app.webhook_secret,
                "redirect_urls": app.redirect_urls,
                "is_active": app.is_active,
                "created_by": app.created_by,
                "created_at": app.created_at,
                "updated_at": app.updated_at,
                "total_orders": int(count or 0),
                "total_volume_processed": float(volume or 0.0)
            })
        return result

    @staticmethod
    async def get_app_by_id(db: AsyncSession, app_id: int) -> ExternalApp:
        res = await db.execute(select(ExternalApp).where(ExternalApp.id == app_id))
        app = res.scalars().first()
        if not app:
            raise HTTPException(status_code=404, detail="Aplicación externa no encontrada")
        return app

    @staticmethod
    async def update_app(db: AsyncSession, app_id: int, app_in: ExternalAppUpdate) -> ExternalApp:
        app = await ExternalAppService.get_app_by_id(db, app_id)
        if app_in.name is not None:
            app.name = app_in.name
        if app_in.description is not None:
            app.description = app_in.description
        if app_in.webhook_url is not None:
            app.webhook_url = app_in.webhook_url
        if app_in.redirect_urls is not None:
            app.redirect_urls = app_in.redirect_urls
        if app_in.is_active is not None:
            app.is_active = app_in.is_active
            
        await db.commit()
        await db.refresh(app)
        return app

    @staticmethod
    async def regenerate_api_key(db: AsyncSession, app_id: int) -> Tuple[ExternalApp, str]:
        app = await ExternalAppService.get_app_by_id(db, app_id)
        _, api_key, api_key_hash, webhook_secret = ExternalAppService._generate_api_key()
        app.api_key_hash = api_key_hash
        app.webhook_secret = webhook_secret
        await db.commit()
        await db.refresh(app)
        return app, api_key

    @staticmethod
    async def delete_app(db: AsyncSession, app_id: int) -> dict:
        app = await ExternalAppService.get_app_by_id(db, app_id)
        await db.delete(app)
        await db.commit()
        return {"message": "Aplicación externa eliminada exitosamente"}

    @staticmethod
    async def authenticate_api_key(db: AsyncSession, api_key: str) -> ExternalApp:
        if not api_key:
            raise HTTPException(status_code=401, detail="API Key requerida en cabecera Authorization o X-API-Key")
        
        # Clean api_key if sent as Bearer
        if api_key.startswith("Bearer "):
            api_key = api_key.replace("Bearer ", "").strip()

        key_hash = ExternalAppService._hash_api_key(api_key)
        res = await db.execute(select(ExternalApp).where(ExternalApp.api_key_hash == key_hash))
        app = res.scalars().first()
        
        if not app or not app.is_active:
            raise HTTPException(status_code=401, detail="API Key inválida o aplicación desactivada")
        return app

    # ==========================
    # PAYMENT FLOWS & CHECKOUT
    # ==========================

    @staticmethod
    async def create_payment_intent(
        db: AsyncSession, 
        app: ExternalApp, 
        req: CreatePaymentIntentRequest,
        base_checkout_url: str = ""
    ) -> dict:
        if req.amount <= 0:
            raise HTTPException(status_code=400, detail="El monto de pago debe ser mayor a cero")

        token = f"glt_pay_{secrets.token_urlsafe(24)}"
        expires_at = datetime.utcnow() + timedelta(minutes=req.expires_in_minutes or 60)
        
        metadata_str = json.dumps(req.metadata or {}) if req.metadata else None

        order = ExternalPaymentOrder(
            payment_token=token,
            app_id=app.id,
            order_reference=req.order_reference,
            amount=req.amount,
            currency="COP",
            description=req.description or f"Pago en {app.name}",
            redirect_url=req.redirect_url,
            metadata_json=metadata_str,
            status=ExternalPaymentStatus.PENDING,
            expires_at=expires_at
        )
        db.add(order)
        await db.commit()
        await db.refresh(order)

        checkout_url = f"{base_checkout_url}/pay/checkout?token={token}" if base_checkout_url else f"/pay/checkout?token={token}"

        return {
            "payment_token": token,
            "checkout_url": checkout_url,
            "order_reference": order.order_reference,
            "amount": float(order.amount),
            "currency": order.currency,
            "expires_at": order.expires_at
        }

    @staticmethod
    async def get_order_by_token(db: AsyncSession, token: str) -> ExternalPaymentOrder:
        res = await db.execute(
            select(ExternalPaymentOrder)
            .options(selectinload(ExternalPaymentOrder.app), selectinload(ExternalPaymentOrder.user))
            .where(ExternalPaymentOrder.payment_token == token)
        )
        order = res.scalars().first()
        if not order:
            raise HTTPException(status_code=404, detail="Orden de pago no encontrada o token inválido")
        
        # Check expiration
        if order.status == ExternalPaymentStatus.PENDING and order.expires_at and order.expires_at < datetime.utcnow():
            order.status = ExternalPaymentStatus.EXPIRED
            await db.commit()
            
        return order

    @staticmethod
    async def confirm_payment_with_wallet(
        db: AsyncSession, 
        token: str, 
        user_id: int
    ) -> dict:
        order = await ExternalAppService.get_order_by_token(db, token)
        
        if order.status != ExternalPaymentStatus.PENDING:
            raise HTTPException(
                status_code=400, 
                detail=f"Esta orden de pago ya no está pendiente (Estado: {order.status.value})"
            )
            
        # 1. Fetch User and Wallet
        user_res = await db.execute(
            select(User).options(selectinload(User.wallet)).where(User.id == user_id)
        )
        user = user_res.scalars().first()
        if not user or not user.wallet:
            raise HTTPException(status_code=400, detail="El usuario no tiene una billetera activa configurada")

        wallet = user.wallet
        current_balance = float(wallet.balance or 0.0)
        pay_amount = float(order.amount)

        # 2. Check sufficient balance
        if current_balance < pay_amount:
            raise HTTPException(
                status_code=400, 
                detail=f"Saldo insuficiente en tu billetera. Saldo disponible: ${current_balance:,.0f} COP, Total a pagar: ${pay_amount:,.0f} COP"
            )

        # 3. Debit Wallet
        new_balance = current_balance - pay_amount
        wallet.balance = new_balance

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            amount=-pay_amount,
            type="external_payment",
            reference_type="external_app",
            reference_id=order.app_id,
            description=f"Pago en {order.app.name} - Ref: {order.order_reference}",
            balance_after=new_balance
        )
        db.add(transaction)

        # 4. Mark Order as COMPLETED
        order.user_id = user.id
        order.status = ExternalPaymentStatus.COMPLETED
        order.completed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(order)

        # 5. Trigger Async Webhook (non-blocking)
        if order.app.webhook_url:
            import asyncio
            asyncio.create_task(ExternalAppService._dispatch_webhook(order.id))

        return {
            "status": "success",
            "message": f"Pago de ${pay_amount:,.0f} COP completado exitosamente con saldo Gloint",
            "payment_token": order.payment_token,
            "order_reference": order.order_reference,
            "app_name": order.app.name,
            "amount_paid": pay_amount,
            "new_wallet_balance": new_balance,
            "redirect_url": order.redirect_url
        }

    @staticmethod
    async def _dispatch_webhook(order_id: int):
        """
        Envía notificación HTTP POST a la URL de webhook configurada por el comercio.
        """
        from src.core.database import async_session_maker
        async with async_session_maker() as db:
            res = await db.execute(
                select(ExternalPaymentOrder)
                .options(selectinload(ExternalPaymentOrder.app), selectinload(ExternalPaymentOrder.user))
                .where(ExternalPaymentOrder.id == order_id)
            )
            order = res.scalars().first()
            if not order or not order.app.webhook_url:
                return

            payload = {
                "event": "payment.completed",
                "payment_token": order.payment_token,
                "order_reference": order.order_reference,
                "amount": float(order.amount),
                "currency": order.currency,
                "status": order.status.value,
                "description": order.description,
                "user_id": order.user_id,
                "user_name": order.user.name if order.user else None,
                "metadata": json.loads(order.metadata_json) if order.metadata_json else {},
                "completed_at": order.completed_at.isoformat() if order.completed_at else None
            }

            payload_bytes = json.dumps(payload, sort_keys=True).encode()
            secret = order.app.webhook_secret or "gloint_secret"
            signature = hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()

            headers = {
                "Content-Type": "application/json",
                "X-Gloint-Signature": signature,
                "User-Agent": "Gloint-Webhook/1.0"
            }

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(order.app.webhook_url, content=payload_bytes, headers=headers)
                    order.webhook_status = "sent" if resp.status_code < 400 else "failed"
                    order.webhook_attempts += 1
                    order.webhook_response = f"HTTP {resp.status_code}: {resp.text[:500]}"
            except Exception as e:
                order.webhook_status = "failed"
                order.webhook_attempts += 1
                order.webhook_response = f"Error: {str(e)[:500]}"

            await db.commit()

    @staticmethod
    async def get_all_orders(db: AsyncSession, limit: int = 100) -> List[dict]:
        query = (
            select(ExternalPaymentOrder)
            .options(selectinload(ExternalPaymentOrder.app), selectinload(ExternalPaymentOrder.user))
            .order_by(desc(ExternalPaymentOrder.created_at))
            .limit(limit)
        )
        res = await db.execute(query)
        orders = res.scalars().all()

        return [
            {
                "id": o.id,
                "payment_token": o.payment_token,
                "app_id": o.app_id,
                "app_name": o.app.name if o.app else "N/A",
                "user_id": o.user_id,
                "user_name": o.user.name if o.user else "Anónimo / No logueado",
                "order_reference": o.order_reference,
                "amount": float(o.amount),
                "currency": o.currency,
                "description": o.description,
                "status": o.status.value,
                "redirect_url": o.redirect_url,
                "webhook_status": o.webhook_status,
                "created_at": o.created_at,
                "completed_at": o.completed_at
            }
            for o in orders
        ]
