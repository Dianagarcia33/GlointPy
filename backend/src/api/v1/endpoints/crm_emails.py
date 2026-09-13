from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from src.core.database import get_db
from src.models.user import User
from src.core.pbac import PBACEngine
from src.api.dependencies.auth_deps import get_current_user, RequirePermission
from src.services.crm_email_service import CRMEmailService

router = APIRouter(prefix="/crm/emails", tags=["CRM Emails"])

class SendEmailSchema(BaseModel):
    recipient_email: str
    subject: str
    body_html: str
    lead_id: Optional[int] = None
    project_id: Optional[int] = None

@router.get("", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_crm_emails(
    folder: str = Query("inbox"),  # 'inbox', 'sent'
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de correos de la bandeja de entrada o enviados."""
    return await CRMEmailService.get_user_emails(db, user_id=current_user.id, folder=folder, search=search)


@router.get("/templates", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_email_templates(
    current_user: User = Depends(get_current_user)
):
    """Obtiene las plantillas de correo comerciales prediseñadas."""
    return CRMEmailService.get_email_templates()


@router.get("/leads/{lead_id}", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_lead_emails(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la conversación por correo vinculada a un prospecto en específico."""
    return await CRMEmailService.get_lead_emails(db, lead_id=lead_id)


@router.post("/send", dependencies=[Depends(RequirePermission("crm:leads:manage"))])
async def send_crm_email(
    data: SendEmailSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Envía un correo comercial a un cliente o prospecto y registra la copia en la BD y el timeline."""
    if not data.recipient_email.strip() or not data.subject.strip() or not data.body_html.strip():
        raise HTTPException(status_code=400, detail="Destinatario, asunto y cuerpo del mensaje son obligatorios.")

    result = await CRMEmailService.send_crm_email(
        db=db,
        user=current_user,
        recipient_email=data.recipient_email,
        subject=data.subject,
        body_html=data.body_html,
        lead_id=data.lead_id,
        project_id=data.project_id
    )

    return {"message": "Correo enviado exitosamente", "data": result}


class SyncEmailSchema(BaseModel):
    imap_user: Optional[str] = None
    imap_pass: Optional[str] = None
    save_password: Optional[bool] = True

class EmailSettingsSchema(BaseModel):
    imap_password: Optional[str] = None

@router.get("/settings", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_email_settings(
    current_user: User = Depends(get_current_user)
):
    """Retorna si el usuario tiene contraseña de correo guardada para sincronización automática."""
    from src.core.config import settings
    has_pass = bool(current_user.imap_password) or bool(settings.IMAP_PASSWORD)
    return {
        "has_saved_password": has_pass,
        "email": current_user.email,
        "host": settings.IMAP_HOST,
        "port": settings.IMAP_PORT
    }

@router.post("/settings", dependencies=[Depends(RequirePermission("crm:view"))])
async def update_email_settings(
    data: EmailSettingsSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Guarda o borra la contraseña de correo institucional del usuario."""
    from src.core.config import settings
    if data.imap_password and data.imap_password.strip():
        current_user.imap_password = data.imap_password.strip()
    else:
        current_user.imap_password = None
    db.add(current_user)
    await db.commit()
    return {
        "message": "Configuración de correo actualizada exitosamente",
        "has_saved_password": bool(current_user.imap_password) or bool(settings.IMAP_PASSWORD)
    }

@router.post("/sync", dependencies=[Depends(RequirePermission("crm:view"))])
async def sync_imap_emails(
    data: Optional[SyncEmailSchema] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Sincroniza la bandeja de entrada de cPanel (host81.latinoamericahosting.com:993) para importar respuestas."""
    return await CRMEmailService.sync_imap_emails(
        db=db,
        user=current_user,
        imap_user=data.imap_user if data else None,
        imap_pass=data.imap_pass if data else None,
        save_password=data.save_password if data and data.save_password is not None else True
    )
