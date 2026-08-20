from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.notification import (
    DeviceTokenRegisterRequest, 
    DeviceTokenUnregisterRequest, 
    SendPushNotificationRequest, 
    DeviceTokenResponse,
    AdminBroadcastNotificationRequest,
    AdminBroadcastLogResponse
)
from src.services.push_notification_service import PushNotificationService

router = APIRouter()

@router.post("/register-token", response_model=DeviceTokenResponse)
@router.post("/devices/register", response_model=DeviceTokenResponse)
@router.post("/devices", response_model=DeviceTokenResponse)
async def register_device_token(
    req: DeviceTokenRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra o actualiza un token de dispositivo FCM para el usuario autenticado (Web o Móvil Android/iOS).
    """
    return await PushNotificationService.register_token(
        db=db,
        user_id=current_user.id,
        token=req.token,
        device_type=req.device_type or "android"
    )

@router.post("/unregister-token")
@router.post("/devices/unregister")
async def unregister_device_token(
    req: DeviceTokenUnregisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Inactiva un token de dispositivo FCM (por ejemplo, al cerrar sesión en la app).
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

@router.post("/admin/send-broadcast", dependencies=[Depends(RequirePermission(["admin.users.manage", "admin.notifications.manage"]))])
async def send_admin_broadcast(
    req: AdminBroadcastNotificationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint administrativo para enviar comunicados o notificaciones masivas/segmentadas.
    """
    return await PushNotificationService.send_broadcast_notification(
        db=db,
        sender_id=current_user.id,
        title=req.title,
        message=req.message,
        type=req.type,
        target_audience=req.target_audience,
        target_role_id=req.target_role_id,
        target_user_ids=req.target_user_ids,
        link=req.link,
        send_push=req.send_push
    )

@router.get("/admin/broadcast-history", dependencies=[Depends(RequirePermission(["admin.users.manage", "admin.notifications.manage"]))])
async def get_admin_broadcast_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el historial de notificaciones masivas enviadas por la administración.
    """
    from sqlalchemy import select, desc
    from sqlalchemy.orm import selectinload
    from src.models.admin_notification import AdminBroadcastLog

    stmt = (
        select(AdminBroadcastLog)
        .options(selectinload(AdminBroadcastLog.sender))
        .order_by(desc(AdminBroadcastLog.created_at))
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()

    return [
        {
            "id": l.id,
            "sender_id": l.sender_id,
            "sender_name": l.sender.name if l.sender else "Administrador del Sistema",
            "title": l.title,
            "message": l.message,
            "type": l.type,
            "target_audience": l.target_audience,
            "target_role_name": l.target_role_name,
            "recipients_count": l.recipients_count,
            "link": l.link,
            "sent_push": l.sent_push,
            "created_at": l.created_at.isoformat() if l.created_at else None
        }
        for l in logs
    ]

@router.get("/admin/target-options", dependencies=[Depends(RequirePermission(["admin.users.manage", "admin.notifications.manage"]))])
async def get_admin_target_options(
    db: AsyncSession = Depends(get_db)
):
    """
    Retorna la lista de roles y usuarios activos para poblar los selectores de audiencia del admin.
    """
    from sqlalchemy import select
    from src.models.security import Role
    from src.models.user import User

    roles_res = await db.execute(select(Role).order_by(Role.name))
    roles = roles_res.scalars().all()

    users_res = await db.execute(
        select(User)
        .where(User.is_active == True)
        .order_by(User.name)
        .limit(300)
    )
    users = users_res.scalars().all()

    return {
        "roles": [{"id": r.id, "name": r.name, "description": r.description} for r in roles],
        "users": [{"id": u.id, "name": u.name, "email": u.email, "document_id": u.document_id} for u in users]
    }

