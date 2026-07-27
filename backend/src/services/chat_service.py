import json
from typing import Dict, Set, List, Optional
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import or_, and_, func, desc

from src.models.chat import ChatRoom, ChatParticipant, ChatMessage
from src.models.user import User

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
                    "created_at": last_msg.created_at.isoformat() if last_msg.created_at else None,
                    "is_read": last_msg.is_read
                } if last_msg else None
            })

        return rooms_data

    @staticmethod
    async def get_room_messages(db: AsyncSession, room_id: int, limit: int = 50) -> List[dict]:
        """Obtiene el historial de mensajes de una sala de chat."""
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
                "is_read": m.is_read,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in messages
        ]

    @staticmethod
    async def save_message(db: AsyncSession, room_id: int, sender_id: int, content: str) -> dict:
        """Guarda un mensaje en MySQL y lo prepara para retransmisión por WebSockets."""
        msg = ChatMessage(
            room_id=room_id,
            sender_id=sender_id,
            content=content,
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

        return {
            "type": "new_message",
            "id": msg.id,
            "room_id": room_id,
            "sender_id": sender_id,
            "sender_name": sender.name if sender else "Usuario",
            "content": content,
            "is_read": False,
            "created_at": created_at_val
        }

    @staticmethod
    async def is_participant(db: AsyncSession, room_id: int, user_id: int) -> bool:
        """Verifica si un usuario es participante de una sala de chat."""
        stmt = (
            select(ChatParticipant)
            .where(and_(ChatParticipant.room_id == room_id, ChatParticipant.user_id == user_id))
        )
        res = await db.execute(stmt)
        return res.scalars().first() is not None
