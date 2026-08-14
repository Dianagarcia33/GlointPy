from fastapi import APIRouter, Depends, Form, File, UploadFile
from typing import Any, Optional
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
