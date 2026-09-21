from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user, RequirePermission
from src.models.user import User
from src.services.crm_calendar_service import CRMCalendarService

router = APIRouter()


class SyncCalendarRequest(BaseModel):
    imap_password: Optional[str] = None
    save_password: bool = True


class CreateCalendarEventRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    start_datetime: str = Field(..., description="ISO 8601 string, ej: 2026-09-15T10:00:00")
    end_datetime: str = Field(..., description="ISO 8601 string, ej: 2026-09-15T11:00:00")
    description: Optional[str] = None
    location: Optional[str] = None
    lead_id: Optional[int] = None
    imap_password: Optional[str] = None


@router.get("/events", dependencies=[Depends(RequirePermission(["crm:calendar:view", "crm:view"]))])
async def get_calendar_events(
    start_date: Optional[str] = Query(None, description="Fecha de inicio mínima (ISO)"),
    end_date: Optional[str] = Query(None, description="Fecha fin máxima (ISO)"),
    imap_password: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los eventos del calendario cPanel (CalDAV) del usuario autenticado.
    """
    try:
        data = await CRMCalendarService.get_events(
            user=current_user,
            start_date=start_date,
            end_date=end_date,
            password_override=imap_password
        )
        return data
    except Exception as e:
        print(f"[Calendar Endpoint Error] {e}")
        return {
            "events": [],
            "count": 0,
            "needs_password": True,
            "message": str(e)
        }


@router.post("/sync", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:calendar:view", "crm:view"]))])
async def sync_calendar(
    payload: SyncCalendarRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Prueba la conexión CalDAV y sincroniza los eventos.
    Si save_password es True y las credenciales son válidas, guarda la contraseña en el usuario.
    """
    try:
        # Si se envió contraseña para guardar
        if payload.imap_password and payload.save_password and current_user.imap_password != payload.imap_password:
            current_user.imap_password = payload.imap_password
            db.add(current_user)
            await db.commit()
            await db.refresh(current_user)

        data = await CRMCalendarService.get_events(
            user=current_user,
            password_override=payload.imap_password
        )
        
        return {
            "success": not data.get("needs_password", False),
            "data": data,
            "has_saved_password": bool(current_user.imap_password)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/events", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:leads:manage", "crm:view"]))])
async def create_calendar_event(
    payload: CreateCalendarEventRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Crea una nueva cita o reunión directamente en cPanel vía CalDAV.
    Si se especifica un lead_id, también registra la actividad en el timeline del prospecto.
    """
    try:
        res = await CRMCalendarService.create_event(
            user=current_user,
            db=db,
            title=payload.title,
            start_datetime=payload.start_datetime,
            end_datetime=payload.end_datetime,
            description=payload.description,
            location=payload.location,
            lead_id=payload.lead_id,
            password_override=payload.imap_password
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/events/{event_uid}", dependencies=[Depends(RequirePermission(["crm:calendar:manage", "crm:leads:manage", "crm:view"]))])
async def delete_calendar_event(
    event_uid: str,
    calendar_url: Optional[str] = Query(None),
    imap_password: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina una cita en cPanel vía CalDAV DELETE.
    """
    try:
        res = await CRMCalendarService.delete_event(
            user=current_user,
            event_uid=event_uid,
            calendar_url=calendar_url,
            password_override=imap_password
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
