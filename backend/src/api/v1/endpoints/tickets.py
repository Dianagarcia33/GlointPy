from fastapi import APIRouter, Depends, Form, File, UploadFile, HTTPException
from typing import Any, Optional
import httpx
from fastapi.responses import StreamingResponse
from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.ticket import TicketResponse
from src.services.ticket_service import TicketService

router = APIRouter()

@router.post("/", response_model=TicketResponse)
async def create_ticket(
    title: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    priority: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Crea un nuevo ticket en el sistema externo Glointtickeds utilizando los datos del usuario logueado.
    Permite subir una imagen opcional como evidencia.
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
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Responde a un ticket existente.
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
    return result
