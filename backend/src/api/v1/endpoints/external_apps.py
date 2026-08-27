from fastapi import APIRouter, Depends, HTTPException, Header, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from src.core.database import get_db
from src.api.deps import RequirePermission, get_current_user
from src.models.user import User
from src.schemas.external_app import (
    ExternalAppCreate,
    ExternalAppUpdate,
    ExternalAppResponse,
    ExternalAppCreatedResponse,
    CreatePaymentIntentRequest,
    CreatePaymentIntentResponse,
    CheckoutOrderInfoResponse,
    ConfirmPaymentRequest,
    ExternalPaymentOrderResponse
)
from src.services.external_app_service import ExternalAppService

router = APIRouter()

# ==============================================================================
# 1. ADMIN ENDPOINTS: Gestión de Apps Externas y Órdenes
# ==============================================================================

@router.get("/admin/external-apps", response_model=List[ExternalAppResponse], dependencies=[Depends(RequirePermission(["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]))])
async def list_external_apps(
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todas las aplicaciones externas registradas con sus estadísticas de volumen y órdenes.
    """
    return await ExternalAppService.get_all_apps(db)

@router.post("/admin/external-apps", response_model=ExternalAppCreatedResponse, dependencies=[Depends(RequirePermission(["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]))])
async def create_external_app(
    app_in: ExternalAppCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva aplicación externa y genera su client_id y API Key secreta.
    """
    app, api_key = await ExternalAppService.create_app(db, app_in, current_user.id)
    return {
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
        "api_key": api_key,
        "total_orders": 0,
        "total_volume_processed": 0.0
    }

@router.put("/admin/external-apps/{app_id}", response_model=ExternalAppResponse, dependencies=[Depends(RequirePermission(["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]))])
async def update_external_app(
    app_id: int,
    app_in: ExternalAppUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza la configuración de una aplicación externa.
    """
    app = await ExternalAppService.update_app(db, app_id, app_in)
    return app

@router.post("/admin/external-apps/{app_id}/regenerate-key", dependencies=[Depends(RequirePermission(["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]))])
async def regenerate_api_key(
    app_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Regenera la API Key y el Webhook Secret de una aplicación externa.
    """
    app, api_key = await ExternalAppService.regenerate_api_key(db, app_id)
    return {
        "app_id": app.id,
        "name": app.name,
        "client_id": app.client_id,
        "api_key": api_key,
        "webhook_secret": app.webhook_secret,
        "message": "Nueva API Key generada exitosamente. Guárdala en un lugar seguro ya que no volverá a mostrarse."
    }

@router.delete("/admin/external-apps/{app_id}", dependencies=[Depends(RequirePermission(["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]))])
async def delete_external_app(
    app_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina una aplicación externa registrada.
    """
    return await ExternalAppService.delete_app(db, app_id)

@router.get("/admin/external-apps/orders/all", response_model=List[ExternalPaymentOrderResponse], dependencies=[Depends(RequirePermission(["admin.external_apps.manage", "admin.roles.manage", "admin.users.manage"]))])
async def list_all_external_orders(
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """
    Historial global de todas las órdenes y cobros procesados por apps externas.
    """
    return await ExternalAppService.get_all_orders(db, limit)


# ==============================================================================
# 2. MERCHANT PUBLIC API: Endpoints para Apps Externas (Autenticación por API Key)
# ==============================================================================

@router.post("/external-pay/payments", response_model=CreatePaymentIntentResponse)
async def create_payment_intent(
    req_body: CreatePaymentIntentRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint para que comercios y apps externas generen una orden de cobro con saldo Gloint.
    Requiere enviar API Key en encabezado `X-API-Key` o `Authorization: Bearer <API_KEY>`.
    """
    api_key = x_api_key or authorization
    if not api_key:
        raise HTTPException(status_code=401, detail="Se requiere X-API-Key o Authorization Bearer")
        
    app = await ExternalAppService.authenticate_api_key(db, api_key)
    
    # Extract request origin for checkout link
    origin = request.headers.get("origin") or str(request.base_url).rstrip("/")
    # Replace backend port if localhost
    if "8000" in origin:
        origin = origin.replace("8000", "5173")

    return await ExternalAppService.create_payment_intent(db, app, req_body, origin)

@router.get("/external-pay/payments/{token}")
async def get_payment_status(
    token: str,
    authorization: Optional[str] = Header(None),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al comercio consultar el estado actual de una orden de pago.
    """
    api_key = x_api_key or authorization
    if not api_key:
        raise HTTPException(status_code=401, detail="Se requiere X-API-Key o Authorization Bearer")
        
    await ExternalAppService.authenticate_api_key(db, api_key)
    order = await ExternalAppService.get_order_by_token(db, token)
    
    return {
        "payment_token": order.payment_token,
        "order_reference": order.order_reference,
        "amount": float(order.amount),
        "currency": order.currency,
        "status": order.status.value,
        "description": order.description,
        "completed_at": order.completed_at
    }


# ==============================================================================
# 3. CHECKOUT INTERACTIVO: Endpoints para la pantalla de pago (/pay/checkout)
# ==============================================================================

@router.get("/checkout/order-info", response_model=CheckoutOrderInfoResponse)
async def get_checkout_order_info(
    token: str = Query(..., description="Token de pago glt_pay_..."),
    db: AsyncSession = Depends(get_db)
):
    """
    Devuelve la información pública de la orden de cobro para mostrar en la interfaz de Checkout.
    """
    order = await ExternalAppService.get_order_by_token(db, token)
    return {
        "payment_token": order.payment_token,
        "app_name": order.app.name if order.app else "Comercio Aliado",
        "app_client_id": order.app.client_id if order.app else "",
        "order_reference": order.order_reference,
        "amount": float(order.amount),
        "currency": order.currency,
        "description": order.description,
        "status": order.status.value,
        "redirect_url": order.redirect_url,
        "expires_at": order.expires_at
    }

@router.post("/checkout/confirm")
async def confirm_checkout_payment(
    confirm_in: ConfirmPaymentRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta el pago de la orden debitando el saldo de la billetera del usuario autenticado en Gloint.
    """
    return await ExternalAppService.confirm_payment_with_wallet(
        db=db,
        token=confirm_in.payment_token,
        user_id=current_user.id
    )
