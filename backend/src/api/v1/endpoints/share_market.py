from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.share_market import (
    SharePriceUpdate,
    SharePriceHistoryOut,
    ShareIssuanceCreate,
    ShareIssuanceOut,
    ShareListingCreate,
    ShareListingOut,
    ShareTradeOrderOut,
    AdminTradeDecision,
    ShareUserPortfolioOut
)
from src.services.share_market_service import ShareMarketService

router = APIRouter()

# ==========================================================
# ENDPOINTS PARA INVERSIONISTAS (MERCADO & PORTAFOLIO)
# ==========================================================

@router.get("/portfolio", response_model=ShareUserPortfolioOut)
async def get_my_share_portfolio(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene el portafolio, balance de custodia y estado de la ventana de venta del usuario."""
    return await ShareMarketService.get_user_portfolio(db, current_user.id)

@router.get("/price-history", response_model=List[SharePriceHistoryOut])
async def get_share_price_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene la bitácora histórica de valorizaciones y notas de la acción."""
    return await ShareMarketService.get_price_history(db)

@router.get("/listings", response_model=List[ShareListingOut])
async def get_market_listings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene todas las ofertas de venta de acciones disponibles en el mercado."""
    return await ShareMarketService.get_active_listings(db, current_user.id)

@router.post("/listings", response_model=ShareListingOut)
async def create_share_listing(
    payload: ShareListingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Publica acciones a la venta de forma voluntaria dentro de la ventana de fechas permitida."""
    listing = await ShareMarketService.create_listing(
        db=db,
        seller_id=current_user.id,
        shares_quantity=payload.shares_quantity,
        price_per_share=payload.price_per_share
    )
    return {
        "id": listing.id,
        "seller_id": listing.seller_id,
        "seller_name": current_user.name,
        "seller_email": current_user.email,
        "shares_total": listing.shares_total,
        "shares_available": listing.shares_available,
        "shares_locked": listing.shares_locked,
        "price_per_share": float(listing.price_per_share),
        "total_value": float(listing.shares_available * listing.price_per_share),
        "status": listing.status,
        "created_at": listing.created_at,
        "is_mine": True
    }

@router.delete("/listings/{listing_id}")
async def cancel_share_listing(
    listing_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancela una oferta propia de venta de acciones."""
    await ShareMarketService.cancel_listing(db, listing_id, current_user.id)
    return {"message": "Oferta cancelada exitosamente."}

@router.post("/buy-instant", response_model=ShareTradeOrderOut)
async def buy_shares_instant(
    listing_id: int = Form(...),
    shares_quantity: int = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Compra acciones en tiempo real utilizando 100% saldo disponible de la billetera."""
    return await ShareMarketService.buy_shares_instant(
        db=db,
        buyer_id=current_user.id,
        listing_id=listing_id,
        shares_quantity=shares_quantity
    )

@router.post("/buy-surplus", response_model=ShareTradeOrderOut)
async def buy_shares_with_surplus(
    listing_id: int = Form(...),
    shares_quantity: int = Form(...),
    wallet_amount_used: float = Form(0.0),
    surplus_amount: float = Form(...),
    receipt: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea una orden de compra con excedente/transferencia bancaria, reteniendo las acciones en custodia hasta aprobación de un Admin."""
    return await ShareMarketService.create_surplus_trade_order(
        db=db,
        buyer_id=current_user.id,
        listing_id=listing_id,
        shares_quantity=shares_quantity,
        wallet_amount_used=wallet_amount_used,
        surplus_amount=surplus_amount,
        receipt_file=receipt
    )

@router.get("/my-orders", response_model=List[ShareTradeOrderOut])
async def get_my_trade_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Obtiene el historial de compras y ventas de acciones del usuario."""
    return await ShareMarketService.get_all_trade_orders(db, user_id=current_user.id)


# ==========================================================
# ENDPOINTS ADMINISTRATIVOS (VALORACIÓN, EMISIÓN Y AUDITORÍA)
# ==========================================================

@router.post("/admin/price", response_model=SharePriceHistoryOut, dependencies=[Depends(RequirePermission("admin.shares.manage"))])
async def update_official_share_price(
    payload: SharePriceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza el precio oficial de la acción. Requiere obligatoriamente motivo/justificación."""
    record = await ShareMarketService.update_official_price(
        db=db,
        new_price=payload.new_price,
        justification_notes=payload.justification_notes,
        admin_id=current_user.id
    )
    return {
        "id": record.id,
        "previous_price": float(record.previous_price),
        "new_price": float(record.new_price),
        "change_percentage": float(record.change_percentage),
        "justification_notes": record.justification_notes,
        "admin_id": record.admin_id,
        "admin_name": current_user.name,
        "created_at": record.created_at
    }

@router.get("/admin/pending-orders", response_model=List[ShareTradeOrderOut], dependencies=[Depends(RequirePermission("admin.shares.manage"))])
async def get_pending_surplus_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bandeja de compras de acciones con excedente pendientes de verificación por el Administrador."""
    return await ShareMarketService.get_all_trade_orders(db, status_filter="pending_admin_approval")

@router.post("/admin/orders/{order_id}/decide", response_model=ShareTradeOrderOut, dependencies=[Depends(RequirePermission("admin.shares.manage"))])
async def decide_pending_trade_order(
    order_id: int,
    payload: AdminTradeDecision,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Aprueba o rechaza una orden de compra con comprobante bancario."""
    return await ShareMarketService.admin_decide_trade(
        db=db,
        order_id=order_id,
        admin_id=current_user.id,
        action=payload.action,
        notes=payload.notes
    )

@router.get("/admin/all-orders", response_model=List[ShareTradeOrderOut], dependencies=[Depends(RequirePermission("admin.shares.manage"))])
async def get_all_admin_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Auditoría y libro mayor de todas las compraventas de acciones."""
    return await ShareMarketService.get_all_trade_orders(db)

@router.post("/admin/issuances", response_model=ShareIssuanceOut, dependencies=[Depends(RequirePermission("admin.shares.manage"))])
async def create_share_issuance(
    payload: ShareIssuanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Emite un nuevo lote corporativo de acciones."""
    issuance = await ShareMarketService.create_issuance(
        db=db,
        admin_id=current_user.id,
        title=payload.title,
        description=payload.description,
        total_shares=payload.total_shares_issued,
        price_per_share=payload.price_per_share
    )
    return {
        "id": issuance.id,
        "title": issuance.title,
        "description": issuance.description,
        "total_shares_issued": issuance.total_shares_issued,
        "available_shares": issuance.available_shares,
        "price_per_share": float(issuance.price_per_share),
        "is_active": issuance.is_active,
        "created_by": issuance.created_by,
        "creator_name": current_user.name,
        "created_at": issuance.created_at
    }

@router.get("/admin/issuances", response_model=List[ShareIssuanceOut], dependencies=[Depends(RequirePermission("admin.shares.manage"))])
async def get_share_issuances(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lista las emisiones corporativas de acciones."""
    return await ShareMarketService.get_issuances(db)
