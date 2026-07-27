from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from jose import jwt, JWTError

from src.core.database import get_db, async_session_maker
from src.core.config import settings
from src.models.user import User
from src.models.security import Role
from src.core.pbac import PBACEngine
from src.api.dependencies.auth_deps import get_current_user, RequirePermission
from src.services.chat_service import ChatService, manager

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.get("/rooms", dependencies=[Depends(RequirePermission("chat:view"))])
async def get_user_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de salas de chat activas del usuario actual."""
    rooms = await ChatService.get_user_rooms(db, current_user.id)
    return rooms

@router.get("/users", dependencies=[Depends(RequirePermission("chat:view"))])
async def get_chat_eligible_users(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de usuarios elegibles para iniciar un chat."""
    stmt = (
        select(User)
        .where(User.id != current_user.id)
        .where(User.is_active == True)
        .order_by(User.name)
    )
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "is_online": manager.is_user_online(u.id)
        }
        for u in users
    ]

@router.post("/rooms/direct", dependencies=[Depends(RequirePermission("chat:send"))])
async def get_or_create_direct_room(
    target_user_id: int = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea o retorna la sala directa entre el usuario actual y el destinatario."""
    if target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No puedes iniciar un chat directo contigo mismo"
        )
    
    target = await db.get(User, target_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    room = await ChatService.get_or_create_direct_room(db, current_user.id, target_user_id)
    return {"room_id": room.id}

@router.get("/rooms/{room_id}/messages", dependencies=[Depends(RequirePermission("chat:view"))])
async def get_room_messages(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el historial de mensajes de la sala especificada."""
    is_part = await ChatService.is_participant(db, room_id, current_user.id)
    if not is_part and not PBACEngine.has_permission(current_user, "admin.chat.manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres participante de esta sala de chat"
        )

    messages = await ChatService.get_room_messages(db, room_id)
    return messages


@router.websocket("/ws/{room_id}")
async def websocket_chat_endpoint(
    websocket: WebSocket,
    room_id: int,
    token: str = Query(...)
):
    """Endpoint en tiempo real para transmisión de mensajes mediante WebSockets con guardas PBAC."""
    await websocket.accept()

    # 1. Autenticar JWT desde query token
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido")
            return
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token inválido")
        return

    # 2. Cargar usuario con sus roles y permisos precargados (evita lazy-loading asíncrono)
    async with async_session_maker() as db:
        user_res = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(User.id == int(user_id))
        )
        user = user_res.scalars().first()

        if not user or not user.is_active or not PBACEngine.has_permission(user, "chat:view"):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Acceso denegado: permiso chat:view requerido")
            return

        # Verificar membresía de sala (o permiso admin)
        is_part = await ChatService.is_participant(db, room_id, user.id)
        if not is_part and not PBACEngine.has_permission(user, "admin.chat.manage"):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="No eres participante de esta sala")
            return

    # 3. Registrar cliente en el manager
    if room_id not in manager.room_connections:
        manager.room_connections[room_id] = set()
    manager.room_connections[room_id].add(websocket)

    if user.id not in manager.user_connections:
        manager.user_connections[user.id] = set()
    manager.user_connections[user.id].add(websocket)

    try:
        while True:
            data_text = await websocket.receive_text()
            if not data_text.strip():
                continue

            if not PBACEngine.has_permission(user, "chat:send"):
                await websocket.send_json({
                    "error": "No tienes permiso para enviar mensajes (chat:send)"
                })
                continue

            async with async_session_maker() as db:
                saved_msg = await ChatService.save_message(db, room_id, user.id, data_text)
                await manager.broadcast_to_room(room_id, saved_msg)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, user.id)
    except Exception as e:
        manager.disconnect(websocket, room_id, user.id)
