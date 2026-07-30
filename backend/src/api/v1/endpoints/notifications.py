from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.notification import DeviceTokenRegisterRequest, DeviceTokenUnregisterRequest, SendPushNotificationRequest, DeviceTokenResponse
from src.services.push_notification_service import PushNotificationService

router = APIRouter()

@router.post("/register-token", response_model=DeviceTokenResponse)
async def register_device_token(
    req: DeviceTokenRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra o actualiza un token de dispositivo FCM para el usuario autenticado.
    """
    return await PushNotificationService.register_token(
        db=db,
        user_id=current_user.id,
        token=req.token,
        device_type=req.device_type or "web"
    )

@router.post("/unregister-token")
async def unregister_device_token(
    req: DeviceTokenUnregisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Inactiva un token de dispositivo FCM (por ejemplo, al cerrar sesión).
    """
    success = await PushNotificationService.unregister_token(db=db, token=req.token)
    return {"success": success, "message": "Token de dispositivo inactivado correctamente." if success else "Token no encontrado."}

@router.post("/send-test", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def send_test_notification(
    req: SendPushNotificationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint administrativo para probar el envío de una notificación Push a un usuario.
    """
    return await PushNotificationService.send_push_to_user(
        db=db,
        user_id=req.user_id,
        title=req.title,
        body=req.body,
        data=req.data
    )
