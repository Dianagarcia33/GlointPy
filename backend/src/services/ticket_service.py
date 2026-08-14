import httpx
import logging
from typing import Dict, Any, Optional
from fastapi import HTTPException, UploadFile
from src.core.config import settings

logger = logging.getLogger(__name__)

class TicketService:
    @classmethod
    async def upload_attachment(cls, file: UploadFile) -> str:
        """Sube un archivo a la API de Glointtickeds y devuelve la URL completa."""
        url = settings.TICKEDS_API_UPLOAD_URL
        files = {"file": (file.filename, file.file, file.content_type)}
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, files=files)
                response.raise_for_status()
                data = response.json()
                # Construir la URL completa
                return "https://tickeds.glointech.com.co" + data["url"]
            except httpx.HTTPStatusError as exc:
                logger.error(f"HTTPStatusError al subir archivo: {exc.response.text}")
                raise HTTPException(
                    status_code=exc.response.status_code, 
                    detail="Error subiendo el archivo al sistema de tickets."
                )
            except Exception as e:
                logger.error(f"Excepción al subir archivo: {str(e)}")
                raise HTTPException(
                    status_code=500, 
                    detail="Error interno al subir el archivo."
                )

    @classmethod
    async def create_ticket(
        cls, 
        user_id: str, 
        user_email: str, 
        user_name: str, 
        title: str,
        description: str,
        category: str,
        priority: str,
        attachment_url: Optional[str] = None
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
            "title": title,
            "description": description,
            "category": category,
            "priority": priority
        }
        
        if attachment_url:
            payload["attachment_url"] = attachment_url

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
