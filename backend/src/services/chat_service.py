import json
import logging
from typing import Dict, Set, List, Optional
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_, func, desc

from src.models.chat import ChatRoom, ChatParticipant, ChatMessage
from src.models.user import User

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Gestiona conexiones activas de WebSockets por sala de chat y por usuario."""
    def __init__(self):
        # room_id -> set of WebSockets
        self.room_connections: Dict[int, Set[WebSocket]] = {}
        # user_id -> set of WebSockets (para notificaciones globales o presencia)
        self.user_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: int, user_id: int):
        await websocket.accept()
        
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        self.room_connections[room_id].add(websocket)

        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)

    def disconnect(self, websocket: WebSocket, room_id: int, user_id: int):
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(websocket)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]

        if user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def broadcast_to_room(self, room_id: int, message_data: dict):
        """Envía un mensaje JSON a todos los sockets conectados a una sala especifica."""
        if room_id in self.room_connections:
            to_remove = set()
            for connection in self.room_connections[room_id]:
                try:
                    await connection.send_text(json.dumps(message_data))
                except Exception:
                    to_remove.add(connection)
            for dead in to_remove:
                self.room_connections[room_id].discard(dead)

    async def send_to_user(self, user_id: int, message_data: dict):
        """Envía un mensaje JSON a todos los sockets conectados del usuario."""
        if user_id in self.user_connections:
            to_remove = set()
            for connection in self.user_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message_data))
                except Exception:
                    to_remove.add(connection)
            for dead in to_remove:
                self.user_connections[user_id].discard(dead)

    def is_user_online(self, user_id: int) -> bool:
        return user_id in self.user_connections and len(self.user_connections[user_id]) > 0


# Instancia global del ConnectionManager
manager = ConnectionManager()


class ChatService:
    @staticmethod
    async def get_or_create_direct_room(db: AsyncSession, user_id1: int, user_id2: int) -> ChatRoom:
        """Busca o crea una sala de chat directa entre dos usuarios."""
        # Buscar sala directa donde ambos participen
        stmt = (
            select(ChatRoom)
            .join(ChatParticipant)
            .where(ChatRoom.type == "direct")
            .where(ChatParticipant.user_id.in_([user_id1, user_id2]))
            .group_by(ChatRoom.id)
            .having(func.count(ChatParticipant.user_id.distinct()) == 2)
        )
        res = await db.execute(stmt)
        existing_room = res.scalars().first()

        if existing_room:
            return existing_room

        # Crear nueva sala directa
        new_room = ChatRoom(type="direct", is_active=True)
        db.add(new_room)
        await db.flush()

        p1 = ChatParticipant(room_id=new_room.id, user_id=user_id1)
        p2 = ChatParticipant(room_id=new_room.id, user_id=user_id2)
        db.add_all([p1, p2])
        await db.commit()
        await db.refresh(new_room)
        return new_room

    @staticmethod
    async def get_user_rooms(db: AsyncSession, user_id: int) -> List[dict]:
        """Obtiene la lista de salas de chat activas en las que participa el usuario."""
        stmt = (
            select(ChatRoom)
            .join(ChatParticipant)
            .options(
                selectinload(ChatRoom.participants).selectinload(ChatParticipant.user),
                selectinload(ChatRoom.messages)
            )
            .where(ChatParticipant.user_id == user_id)
            .where(ChatRoom.is_active == True)
        )
        res = await db.execute(stmt)
        rooms = res.scalars().unique().all()

        rooms_data = []
        for room in rooms:
            # Obtener el último mensaje
            msg_stmt = (
                select(ChatMessage)
                .options(selectinload(ChatMessage.sender))
                .where(ChatMessage.room_id == room.id)
                .order_by(desc(ChatMessage.created_at))
                .limit(1)
            )
            msg_res = await db.execute(msg_stmt)
            last_msg = msg_res.scalars().first()

            # Obtener contadores no leídos
            unread_stmt = (
                select(func.count(ChatMessage.id))
                .where(ChatMessage.room_id == room.id)
                .where(ChatMessage.sender_id != user_id)
                .where(ChatMessage.is_read == False)
            )
            unread_res = await db.execute(unread_stmt)
            unread_count = unread_res.scalar() or 0

            # Identificar el otro participante si es un chat directo
            other_participant = None
            for p in room.participants:
                if p.user_id != user_id:
                    other_participant = {
                        "id": p.user.id,
                        "name": p.user.name,
                        "email": p.user.email,
                        "is_online": manager.is_user_online(p.user.id)
                    }
                    break

            rooms_data.append({
                "id": room.id,
                "name": room.name or (other_participant["name"] if other_participant else "Chat"),
                "type": room.type,
                "other_participant": other_participant,
                "unread_count": unread_count,
                "last_message": {
                    "id": last_msg.id,
                    "content": last_msg.content,
                    "sender_id": last_msg.sender_id,
                    "sender_name": last_msg.sender.name if last_msg.sender else "Desconocido",
                    "file_url": getattr(last_msg, "file_url", None),
                    "file_name": getattr(last_msg, "file_name", None),
                    "file_type": getattr(last_msg, "file_type", None),
                    "created_at": last_msg.created_at.isoformat() if last_msg.created_at else None,
                    "is_read": last_msg.is_read
                } if last_msg else None
            })

        return rooms_data

    @staticmethod
    async def get_room_messages(db: AsyncSession, room_id: int, user_id: Optional[int] = None, limit: int = 50) -> List[dict]:
        """Obtiene el historial de mensajes de una sala de chat y marca como leídos los mensajes recibidos."""
        if user_id:
            from sqlalchemy import update
            await db.execute(
                update(ChatMessage)
                .where(and_(ChatMessage.room_id == room_id, ChatMessage.sender_id != user_id, ChatMessage.is_read == False))
                .values(is_read=True)
            )
            await db.commit()

        stmt = (
            select(ChatMessage)
            .options(selectinload(ChatMessage.sender))
            .where(ChatMessage.room_id == room_id)
            .order_by(desc(ChatMessage.created_at))
            .limit(limit)
        )
        res = await db.execute(stmt)
        messages = list(reversed(res.scalars().all()))

        return [
            {
                "id": m.id,
                "room_id": m.room_id,
                "sender_id": m.sender_id,
                "sender_name": m.sender.name if m.sender else "Usuario",
                "content": m.content,
                "file_url": getattr(m, "file_url", None),
                "file_name": getattr(m, "file_name", None),
                "file_type": getattr(m, "file_type", None),
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]

    @staticmethod
    async def mark_room_as_read(db: AsyncSession, room_id: int, user_id: int) -> bool:
        """Marcar todos los mensajes recibidos de una sala como leídos por el usuario."""
        from sqlalchemy import update
        await db.execute(
            update(ChatMessage)
            .where(and_(ChatMessage.room_id == room_id, ChatMessage.sender_id != user_id, ChatMessage.is_read == False))
            .values(is_read=True)
        )
        await db.commit()
        return True

    @staticmethod
    async def save_message(
        db: AsyncSession, 
        room_id: int, 
        sender_id: int, 
        content: str,
        file_url: Optional[str] = None,
        file_name: Optional[str] = None,
        file_type: Optional[str] = None
    ) -> dict:
        """Guarda un mensaje en MySQL y lo prepara para retransmisión por WebSockets."""
        msg = ChatMessage(
            room_id=room_id,
            sender_id=sender_id,
            content=content,
            file_url=file_url,
            file_name=file_name,
            file_type=file_type,
            is_read=False
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)

        # Cargar sender
        res = await db.execute(select(User).where(User.id == sender_id))
        sender = res.scalars().first()

        from datetime import datetime
        created_at_val = msg.created_at.isoformat() if msg.created_at else datetime.utcnow().isoformat()

        payload = {
            "type": "new_message",
            "id": msg.id,
            "room_id": room_id,
            "sender_id": sender_id,
            "sender_name": sender.name if sender else "Usuario",
            "content": content,
            "file_url": file_url,
            "file_name": file_name,
            "file_type": file_type,
            "is_read": False,
            "created_at": created_at_val
        }

        # Obtener los demás participantes de la sala para enviarles la notificación Push y evento in-app
        try:
            part_res = await db.execute(
                select(ChatParticipant.user_id)
                .where(and_(ChatParticipant.room_id == room_id, ChatParticipant.user_id != sender_id))
            )
            recipient_ids = part_res.scalars().all()

            if recipient_ids:
                from src.services.push_notification_service import PushNotificationService
                sender_name = sender.name if sender else "Nuevo mensaje"
                preview_body = content if content else (f"📎 {file_name}" if file_name else "Nuevo archivo adjunto")
                if len(preview_body) > 100:
                    preview_body = preview_body[:97] + "..."

                for r_id in recipient_ids:
                    # Enviar evento por WebSocket directo al usuario si está conectado en otra vista
                    await manager.send_to_user(r_id, {
                        "type": "chat_notification",
                        "room_id": room_id,
                        "message": payload
                    })

                    # Transmitir alerta Push a sus dispositivos
                    try:
                        await PushNotificationService.send_push_to_user(
                            db=db,
                            user_id=r_id,
                            title=f"💬 {sender_name}",
                            body=preview_body,
                            data={
                                "type": "chat",
                                "room_id": str(room_id),
                                "sender_id": str(sender_id),
                                "link": f"/dashboard/chat?room={room_id}"
                            }
                        )
                    except Exception as push_err:
                        logger.warning(f"Error enviando push de chat a usuario {r_id}: {push_err}")
        except Exception as err:
            logger.warning(f"Error procesando alertas para sala de chat {room_id}: {err}")

        return payload

    @staticmethod
    async def is_participant(db: AsyncSession, room_id: int, user_id: int) -> bool:
        """Verifica si un usuario es participante de una sala de chat."""
        stmt = (
            select(ChatParticipant)
            .where(and_(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id))
        )
        res = await db.execute(stmt)
        return res.scalars().first() is not None
