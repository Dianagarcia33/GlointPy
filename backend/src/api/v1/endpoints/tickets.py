from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Body
from typing import Any, Optional
import httpx
from fastapi.responses import Response
from urllib.parse import urlparse
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.ticket import TicketResponse, normalize_ticket_priority, DEFAULT_TICKET_PRIORITY
from src.services.ticket_service import TicketService
from src.services.push_notification_service import PushNotificationService

router = APIRouter()

@router.post("/", response_model=TicketResponse)
async def create_ticket(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form(DEFAULT_TICKET_PRIORITY),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Crea un nuevo ticket en el sistema externo Glointtickeds utilizando los datos del usuario logueado.
    Permite subir una imagen opcional como evidencia y envía confirmación por notificación.
    """
    try:
        priority = normalize_ticket_priority(priority)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    attachment_url = None
    if file:
        attachment_url = await TicketService.upload_attachment(file)

    result = await TicketService.create_ticket(
        user_id=str(current_user.id),
        user_email=current_user.email,
        user_name=current_user.name,
        title=title,
        description=description,
        category=category,
        priority=priority,
        attachment_url=attachment_url
    )
    
    # Enviar notificación in-app y push al usuario
    try:
        t_num = result.get("ticket_number") or (result.get("data", {}) if isinstance(result.get("data"), dict) else {}).get("ticket_number", "")
        notif_msg = f"Tu ticket #{t_num} '{title}' ha sido radicado con éxito." if t_num else f"Tu ticket '{title}' ha sido radicado con éxito."
        await PushNotificationService.create_and_send_notification(
            db=db,
            user_id=current_user.id,
            title="Ticket Creado Exitosamente",
            message=notif_msg,
            type="ticket",
            link="/dashboard/tickets"
        )
    except Exception as e:
        print(f"Notice: No se pudo enviar notificación de ticket: {e}")

    return TicketResponse(
        status="success",
        message="Ticket creado exitosamente",
        data=result
    )

@router.get("/my-tickets")
async def get_my_tickets(current_user: User = Depends(get_current_user)) -> Any:
    """
    Obtiene todos los tickets creados por el usuario logueado.
    """
    return await TicketService.get_user_tickets(user_id=str(current_user.id))

# Servidores desde los que la app de tickets entrega las imágenes (el proxy solo atiende estos)
TICKET_IMAGE_HOSTS = {"161.35.107.122", "tickeds.glointech.com.co"}
TICKET_IMAGE_PATHS = ("/uploads/", "/api/v1/uploads/")


def _clean_ticket_image_url(url: str) -> str:
    """Repara URLs guardadas con el servidor duplicado ("http://IPhttp://dominio/...") quedándose con la última."""
    last = url.rfind("http://")
    last_https = url.rfind("https://")
    start = max(last, last_https)
    return url[start:] if start > 0 else url


@router.get("/image-proxy")
async def proxy_ticket_image(url: str, current_user: User = Depends(get_current_user)):
    """
    Proxy interno para evitar errores de Mixed Content (HTTPS -> HTTP) en el frontend
    al cargar imágenes desde el sistema externo de tickets.
    """
    url = _clean_ticket_image_url(url)
    parsed = urlparse(url)
    # Se valida el host exacto (startswith dejaría pasar "161.35.107.122.otro.com")
    if parsed.scheme not in ("http", "https") or parsed.hostname not in TICKET_IMAGE_HOSTS:
        raise HTTPException(status_code=403, detail="No autorizado para hacer proxy de esta URL")
    # Solo la carpeta de archivos: con la llave, cualquier otra ruta del host (p. ej. el listado de tickets)
    # quedaría expuesta. ".." se rechaza para no salir de esa carpeta.
    if not parsed.path.startswith(TICKET_IMAGE_PATHS) or ".." in parsed.path:
        raise HTTPException(status_code=403, detail="No autorizado para hacer proxy de esta URL")

    # Los archivos se descargan sin llave: no se envía X-API-KEY (así el proxy no expone nada más del host)
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.get(url)
        except httpx.HTTPError:
            raise HTTPException(status_code=502, detail="No se pudo obtener la imagen del sistema de tickets.")
    if r.status_code != 200:
        raise HTTPException(status_code=404 if r.status_code == 404 else 502, detail="Imagen no disponible.")
    return Response(content=r.content, media_type=r.headers.get("Content-Type", "image/jpeg"))

@router.get("/{ticket_number}")
async def get_ticket(ticket_number: str, current_user: User = Depends(get_current_user)) -> Any:
    """
    Obtiene el detalle de un ticket específico por su número.
    """
    return await TicketService.get_ticket_by_number(ticket_number)

@router.post("/{ticket_number}/comments")
async def add_ticket_comment(
    ticket_number: str,
    content: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Responde a un ticket existente y despacha notificación en tiempo real.
    """
    attachment_url = None
    if file:
        attachment_url = await TicketService.upload_attachment(file)

    result = await TicketService.add_ticket_comment(
        ticket_number=ticket_number,
        content=content,
        external_user_name=current_user.name,
        attachment_url=attachment_url
    )

    # Disparar notificación al destinatario correspondiente
    try:
        ticket_info = await TicketService.get_ticket_by_number(ticket_number)
        owner_id_str = ticket_info.get("external_user_id") if isinstance(ticket_info, dict) else None
        
        if owner_id_str and str(owner_id_str).isdigit():
            owner_id = int(owner_id_str)
            # Si quien respondió no es el creador del ticket (ej: agente o soporte), notificar al creador
            if owner_id != current_user.id:
                await PushNotificationService.create_and_send_notification(
                    db=db,
                    user_id=owner_id,
                    title=f"Nueva Respuesta en Ticket #{ticket_number}",
                    message=f"{current_user.name}: {content[:90]}...",
                    type="ticket",
                    link="/dashboard/tickets"
                )
    except Exception as notif_err:
        print(f"Notice: Error despachando notificación de comentario: {notif_err}")

    return result

@router.post("/webhook")
async def ticket_webhook(
    payload: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook opcional para recibir eventos del sistema externo de soporte (cambios de estado, nuevas respuestas de agentes).
    """
    event = payload.get("event") or "ticket_updated"
    ticket_number = payload.get("ticket_number") or payload.get("id")
    user_id_str = payload.get("external_user_id") or payload.get("user_id")
    title = payload.get("title", "Actualización de Ticket")
    message = payload.get("message", f"Tu ticket #{ticket_number} tiene una nueva actualización.")

    if user_id_str and str(user_id_str).isdigit():
        target_user_id = int(user_id_str)
        try:
            await PushNotificationService.create_and_send_notification(
                db=db,
                user_id=target_user_id,
                title=title,
                message=message,
                type="ticket",
                link="/dashboard/tickets"
            )
        except Exception as e:
            print(f"Error procesando webhook de ticket: {e}")

    return {"status": "ok"}

