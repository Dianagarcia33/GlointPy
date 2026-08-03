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

@router.get("/my-notifications", response_model=dict)
async def get_my_notifications(
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene las notificaciones in-app recibidas por el usuario logueado.
    """
    from sqlalchemy import select, func, desc
    from src.models.user_notification import UserNotification
    
    stmt = (
        select(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .order_by(desc(UserNotification.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    notifications = res.scalars().all()

    unread_stmt = (
        select(func.count(UserNotification.id))
        .where(UserNotification.user_id == current_user.id)
        .where(UserNotification.is_read == False)
    )
    unread_res = await db.execute(unread_stmt)
    unread_count = unread_res.scalar() or 0

    return {
        "notifications": [
            {
                "id": n.id,
                "user_id": n.user_id,
                "title": n.title,
                "message": n.message,
                "type": n.type,
                "is_read": n.is_read,
                "link": n.link,
                "created_at": n.created_at.isoformat() if n.created_at else None
            }
            for n in notifications
        ],
        "unread_count": unread_count
    }

@router.post("/mark-read/{notification_id}")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca una notificación específica como leída.
    """
    from sqlalchemy import select
    from src.models.user_notification import UserNotification
    
    result = await db.execute(
        select(UserNotification).where(
            UserNotification.id == notification_id,
            UserNotification.user_id == current_user.id
        )
    )
    notif = result.scalars().first()
    if notif:
        notif.is_read = True
        await db.commit()
        return {"success": True}
    return {"success": False, "message": "Notificación no encontrada."}

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Marca todas las notificaciones del usuario como leídas.
    """
    from sqlalchemy import update
    from src.models.user_notification import UserNotification
    
    await db.execute(
        update(UserNotification)
        .where(UserNotification.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"success": True}
