from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException, Body
from typing import Any, Optional
import httpx
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.ticket import TicketResponse
from src.services.ticket_service import TicketService
from src.services.push_notification_service import PushNotificationService

router = APIRouter()

@router.post("/", response_model=TicketResponse)
async def create_ticket(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Any:
    """
    Crea un nuevo ticket en el sistema externo Glointtickeds utilizando los datos del usuario logueado.
    Permite subir una imagen opcional como evidencia y envía confirmación por notificación.
    """
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

@router.get("/image-proxy")
async def proxy_ticket_image(url: str):
    """
    Proxy interno para evitar errores de Mixed Content (HTTPS -> HTTP) en el frontend
    al cargar imágenes desde el sistema externo de tickets.
    """
    if not url.startswith("http://161.35.107.122"):
        raise HTTPException(status_code=403, detail="No autorizado para hacer proxy de esta URL")
        
    client = httpx.AsyncClient()
    req = client.build_request("GET", url)
    r = await client.send(req, stream=True)
    return StreamingResponse(r.aiter_raw(), media_type=r.headers.get("Content-Type", "image/jpeg"))

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

