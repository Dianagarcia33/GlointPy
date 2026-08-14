import httpx
import logging
from typing import Dict, Any
from fastapi import HTTPException
from src.core.config import settings
from src.schemas.ticket import TicketCreate

logger = logging.getLogger(__name__)

class TicketService:
    @classmethod
    async def create_ticket(
        cls, 
        user_id: str, 
        user_email: str, 
        user_name: str, 
        ticket_data: TicketCreate
    ) -> Dict[str, Any]:
        """
        Envía la creación de un ticket a la API externa de Glointtickeds.
        """
        url = settings.TICKEDS_API_URL
        headers = {
            "X-API-KEY": settings.TICKEDS_API_KEY,
            "Content-Type": "application/json"
        }
        
        payload = {
            "external_user_id": str(user_id),
            "external_user_email": user_email,
            "external_user_name": user_name,
            "title": ticket_data.title,
            "description": ticket_data.description,
            "category": ticket_data.category,
            "priority": ticket_data.priority
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as exc:
                error_detail = exc.response.text
                logger.error(f"HTTPStatusError al crear ticket: {error_detail}")
                raise HTTPException(
                    status_code=exc.response.status_code, 
                    detail=f"Error desde API externa de tickets: {error_detail}"
                )
            except Exception as e:
                logger.error(f"Excepción al crear ticket: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail="Error interno comunicándose con la API de tickets."
                )
