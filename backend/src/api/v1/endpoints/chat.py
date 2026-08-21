import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query, File, UploadFile, Form
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
    """Obtiene la lista de usuarios elegibles para iniciar un chat (excluye el rol de Inversionista)."""
    stmt = (
        select(User)
        .options(selectinload(User.roles))
        .where(User.id != current_user.id)
        .where(User.is_active == True)
        .order_by(User.name)
    )
    res = await db.execute(stmt)
    users = res.scalars().all()
    
    eligible_users = []
    for u in users:
        role_names = [r.name.lower() for r in (u.roles or [])]
        
        # Excluir si el usuario tiene únicamente roles de Inversionista / Investor
        is_investor = len(role_names) > 0 and all(
            any(inv_kw in r_name for inv_kw in ["inversionista", "investor"])
            for r_name in role_names
        )

        if not is_investor:
            eligible_users.append({
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "is_online": manager.is_user_online(u.id)
            })

    return eligible_users

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

    messages = await ChatService.get_room_messages(db, room_id, user_id=current_user.id)
    return messages


@router.post("/rooms/{room_id}/read", dependencies=[Depends(RequirePermission("chat:view"))])
async def mark_room_as_read(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Marca todos los mensajes de una sala como leídos."""
    await ChatService.mark_room_as_read(db, room_id, current_user.id)
    return {"message": "Mensajes marcados como leídos"}

@router.post("/upload", dependencies=[Depends(RequirePermission("chat:send"))])
@router.post("/upload-multiple", dependencies=[Depends(RequirePermission("chat:send"))])
async def upload_chat_file(
    room_id: int = Form(...),
    content: Optional[str] = Form(""),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sube uno o múltiples archivos adjuntos en el chat (PDF, Excel, Word, Imágenes, etc.) y los transmite en tiempo real."""
    is_part = await ChatService.is_participant(db, room_id, current_user.id)
    if not is_part and not PBACEngine.has_permission(current_user, "admin.chat.manage"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres participante de esta sala de chat"
        )

    # Recopilar todos los archivos enviados
    upload_list: List[UploadFile] = []
    if files:
        upload_list.extend([f for f in files if f and f.filename])
    if file and file.filename:
        upload_list.append(file)

    if not upload_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha proporcionado ningún archivo para subir"
        )

    # Crear carpeta de destino
    upload_dir = os.path.join("uploads", "chat")
    os.makedirs(upload_dir, exist_ok=True)

    saved_messages = []
    text_content = content.strip() if content else ""

    for index, current_file in enumerate(upload_list):
        # Generar nombre único de archivo
        file_ext = os.path.splitext(current_file.filename)[1] if current_file.filename else ""
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = os.path.join(upload_dir, unique_filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(current_file.file, buffer)

        file_url = f"/api/v1/uploads/chat/{unique_filename}"
        file_name = current_file.filename or "archivo_adjunto"
        file_type = (current_file.content_type or "application/octet-stream")[:250]

        # Si el usuario escribió un texto, asociarlo al primer archivo o poner título descriptivo
        if text_content and index == 0:
            msg_content = text_content
        else:
            msg_content = f"📎 Adjunto: {file_name}"

        saved_msg = await ChatService.save_message(
            db=db,
            room_id=room_id,
            sender_id=current_user.id,
            content=msg_content,
            file_url=file_url,
            file_name=file_name,
            file_type=file_type
        )

        # Broadcast en tiempo real a todos los clientes en la sala
        await manager.broadcast_to_room(room_id, saved_msg)
        saved_messages.append(saved_msg)

    # Retornar el primer mensaje o la lista completa
    if len(saved_messages) == 1:
        return saved_messages[0]
    return saved_messages



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

            try:
                async with async_session_maker() as db:
                    saved_msg = await ChatService.save_message(db, room_id, user.id, data_text)
                    await manager.broadcast_to_room(room_id, saved_msg)
            except Exception as msg_err:
                print(f"⚠️ Error procesando mensaje en sala {room_id}: {msg_err}")
                await websocket.send_json({"error": "No se pudo guardar el mensaje. Intenta nuevamente."})

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id, user.id)
    except Exception as e:
        print(f"⚠️ Conexión WebSocket cerrada: {e}")
        manager.disconnect(websocket, room_id, user.id)
