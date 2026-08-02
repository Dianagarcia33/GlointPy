import os
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from src.models.device_token import UserDeviceToken

logger = logging.getLogger(__name__)

# Intento de inicialización de Firebase Admin SDK
_firebase_initialized = False
try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json")
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase Admin SDK inicializado correctamente.")
    else:
        logger.warning(f"Archivo de credenciales de Firebase '{cred_path}' no encontrado. Notificaciones FCM operarán en modo registro/simulación.")
except Exception as e:
    logger.warning(f"Firebase Admin SDK no disponible o no configurado aún: {e}")


class PushNotificationService:

    @staticmethod
    async def register_token(db: AsyncSession, user_id: int, token: str, device_type: str = "web") -> UserDeviceToken:
        """
        Registra o reactiva un token de dispositivo FCM para un usuario.
        """
        result = await db.execute(select(UserDeviceToken).where(UserDeviceToken.token == token))
        existing_token = result.scalars().first()

        if existing_token:
            existing_token.user_id = user_id
            existing_token.device_type = device_type
            existing_token.is_active = True
            existing_token.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing_token)
            return existing_token
        else:
            new_token = UserDeviceToken(
                user_id=user_id,
                token=token,
                device_type=device_type,
                is_active=True
            )
            db.add(new_token)
            await db.commit()
            await db.refresh(new_token)
            return new_token

    @staticmethod
    async def unregister_token(db: AsyncSession, token: str) -> bool:
        """
        Desactiva un token de dispositivo FCM.
        """
        result = await db.execute(select(UserDeviceToken).where(UserDeviceToken.token == token))
        existing_token = result.scalars().first()

        if existing_token:
            existing_token.is_active = False
            existing_token.updated_at = datetime.utcnow()
            await db.commit()
            return True
        return False

    @staticmethod
    async def send_push_to_user(
        db: AsyncSession, 
        user_id: int, 
        title: str, 
        body: str, 
        data: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Envía una notificación Push a todos los dispositivos activos del usuario.
        """
        result = await db.execute(
            select(UserDeviceToken).where(
                UserDeviceToken.user_id == user_id,
                UserDeviceToken.is_active == True
            )
        )
        active_tokens = result.scalars().all()

        if not active_tokens:
            return {
                "success": False,
                "sent_count": 0,
                "message": f"El usuario {user_id} no tiene dispositivos con tokens activos."
            }

        tokens_list = [t.token for t in active_tokens]
        sent_success = 0
        failed_count = 0

        global _firebase_initialized
        if _firebase_initialized:
            try:
                from firebase_admin import messaging
                multicast_message = messaging.MulticastMessage(
                    notification=messaging.Notification(title=title, body=body),
                    data=data or {},
                    tokens=tokens_list
                )
                response = messaging.send_each_for_multicast(multicast_message)
                sent_success = response.success_count
                failed_count = response.failure_count
                logger.info(f"Push enviado a usuario {user_id}: {sent_success} exitosos, {failed_count} fallidos.")
            except Exception as err:
                logger.error(f"Error al enviar push vía FCM: {err}")
                failed_count = len(tokens_list)
        else:
            # Modo Simulación cuando aún no se ha colocado el JSON de credenciales de Firebase en el servidor
            sent_success = len(tokens_list)
            logger.info(f"[SIMULACIÓN PUSH] Título: '{title}', Mensaje: '{body}', Destinatarios: {len(tokens_list)} tokens del usuario {user_id}")

        return {
            "success": True,
            "total_devices": len(tokens_list),
            "sent_count": sent_success,
            "failed_count": failed_count,
            "firebase_enabled": _firebase_initialized
        }

    @staticmethod
    async def create_and_send_notification(
        db: AsyncSession,
        user_id: int,
        title: str,
        message: str,
        type: str = "sistema",
        link: Optional[str] = None
    ) -> UserNotification:
        """
        Crea un registro de notificación in-app para el usuario en la BD y envía alerta Push.
        """
        from src.models.user_notification import UserNotification
        
        notif = UserNotification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            link=link,
            is_read=False
        )
        db.add(notif)
        await db.commit()
        await db.refresh(notif)

        # Transmitir Push en segundo plano si aplica
        try:
            await PushNotificationService.send_push_to_user(
                db=db,
                user_id=user_id,
                title=title,
                body=message,
                data={"link": link or "", "type": type}
            )
        except Exception as err:
            logger.warning(f"Push no entregado a usuario {user_id}: {err}")

        return notif
