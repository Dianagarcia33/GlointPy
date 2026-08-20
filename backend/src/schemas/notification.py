from pydantic import BaseModel, Field, model_validator
from typing import Optional, Dict, Any
from datetime import datetime

class DeviceTokenRegisterRequest(BaseModel):
    token: Optional[str] = Field(None, description="FCM Token string")
    fcm_token: Optional[str] = Field(None, description="Alias para FCM Token string")
    device_type: Optional[str] = Field("android", description="Device type: 'android', 'ios', 'web'")
    platform: Optional[str] = Field(None, description="Alias para device_type")

    @model_validator(mode='before')
    @classmethod
    def unify_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            final_token = data.get('token') or data.get('fcm_token') or data.get('device_token')
            final_type = data.get('device_type') or data.get('platform') or 'android'
            if not final_token:
                raise ValueError("Campo 'token' o 'fcm_token' es requerido")
            data['token'] = final_token
            data['device_type'] = final_type
        return data

class DeviceTokenUnregisterRequest(BaseModel):
    token: Optional[str] = Field(None, description="FCM Token string to deactivate")
    fcm_token: Optional[str] = Field(None, description="Alias para FCM Token string")

    @model_validator(mode='before')
    @classmethod
    def unify_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            final_token = data.get('token') or data.get('fcm_token') or data.get('device_token')
            if not final_token:
                raise ValueError("Campo 'token' o 'fcm_token' es requerido")
            data['token'] = final_token
        return data

class DeviceTokenResponse(BaseModel):
    id: int
    user_id: int
    token: str
    device_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SendPushNotificationRequest(BaseModel):
    user_id: int = Field(..., description="User ID to receive the notification")
    title: str = Field(..., description="Notification Title")
    body: str = Field(..., description="Notification Message Body")
    data: Optional[Dict[str, str]] = Field(None, description="Optional payload key-value data")

class UserNotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserNotificationListResponse(BaseModel):
    notifications: list[UserNotificationResponse]
    unread_count: int

class AdminBroadcastNotificationRequest(BaseModel):
    title: str = Field(..., description="Título del comunicado o actualización")
    message: str = Field(..., description="Contenido de la notificación")
    type: str = Field("sistema", description="'sistema', 'anuncio', 'mantenimiento', 'alerta'")
    target_audience: str = Field("all", description="'all', 'role', 'specific_users'")
    target_role_id: Optional[int] = Field(None, description="ID del rol si target_audience es 'role'")
    target_user_ids: Optional[list[int]] = Field(None, description="Lista de IDs de usuarios si target_audience es 'specific_users'")
    link: Optional[str] = Field(None, description="Enlace interno o externo opcional")
    send_push: bool = Field(True, description="Enviar también alerta Push via Firebase")

class AdminBroadcastLogResponse(BaseModel):
    id: int
    sender_id: Optional[int] = None
    sender_name: Optional[str] = None
    title: str
    message: str
    type: str
    target_audience: str
    target_role_name: Optional[str] = None
    recipients_count: int
    link: Optional[str] = None
    sent_push: bool
    created_at: datetime

    class Config:
        from_attributes = True

