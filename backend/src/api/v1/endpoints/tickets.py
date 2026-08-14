from fastapi import APIRouter, Depends
from typing import Any
from src.api.deps import get_current_user
from src.models.user import User
from src.schemas.ticket import TicketCreate, TicketResponse
from src.services.ticket_service import TicketService

router = APIRouter()

@router.post("/", response_model=TicketResponse)
async def create_ticket(
    ticket_in: TicketCreate,
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Crea un nuevo ticket en el sistema externo Glointtickeds utilizando los datos del usuario logueado.
    """
    result = await TicketService.create_ticket(
        user_id=str(current_user.id),
        user_email=current_user.email,
        user_name=current_user.name,
        ticket_data=ticket_in
    )
    
    return TicketResponse(
        status="success",
        message="Ticket creado exitosamente",
        data=result
    )
