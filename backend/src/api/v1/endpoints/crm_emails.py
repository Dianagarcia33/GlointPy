from typing import List, Optional
import os
import uuid
import re
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
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
    attachments: Optional[List[dict]] = None
    cc_emails: Optional[str] = None
    bcc_emails: Optional[str] = None

class BulkEmailActionSchema(BaseModel):
    action: str  # mark_read, mark_unread, star, unstar, archive, unarchive, trash, restore, delete_permanent
    email_ids: List[int]

class CreateLeadFromEmailSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    project_id: Optional[int] = None

@router.post("/upload-attachment", dependencies=[Depends(RequirePermission(["crm:inbox:send", "crm:leads:manage"]))])
async def upload_crm_email_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Sube un archivo o imagen adjunta para correos comerciales."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido.")
        
    target_dir = os.path.join("uploads", "email_attachments")
    os.makedirs(target_dir, exist_ok=True)
    
    safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', file.filename)
    unique_filename = f"{uuid.uuid4().hex[:10]}_{safe_name}"
    file_path = os.path.join(target_dir, unique_filename)
    
    content = await file.read()
    max_size = 15 * 1024 * 1024 # 15MB
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="El archivo excede el tamaño máximo permitido de 15MB.")
        
    with open(file_path, "wb") as f:
        f.write(content)
        
    return {
        "filename": file.filename,
        "file_url": f"/uploads/email_attachments/{unique_filename}",
        "content_type": file.content_type or "application/octet-stream",
        "size": len(content)
    }

@router.get("", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def get_crm_emails(
    folder: str = Query("inbox"),  # 'inbox', 'sent', 'starred', 'archived', 'trash'
    search: Optional[str] = Query(None),
    has_meeting: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de correos de la bandeja (inbox, sent, starred, archived, trash)."""
    return await CRMEmailService.get_user_emails(
        db, 
        user_id=current_user.id, 
        folder=folder, 
        search=search, 
        has_meeting=has_meeting
    )


@router.get("/counts", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def get_crm_email_counts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene los contadores de correos por carpeta en tiempo real."""
    return await CRMEmailService.get_folder_counts(db=db, user_id=current_user.id)


@router.get("/templates", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:inbox:send", "crm:view"]))])
async def get_email_templates(
    current_user: User = Depends(get_current_user)
):
    """Obtiene las plantillas de correo comerciales prediseñadas."""
    return CRMEmailService.get_email_templates()


@router.get("/leads/{lead_id}", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view", "crm:leads:manage"]))])
async def get_lead_emails(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la conversación por correo vinculada a un prospecto en específico."""
    return await CRMEmailService.get_lead_emails(db, lead_id=lead_id)


@router.post("/send", dependencies=[Depends(RequirePermission(["crm:inbox:send", "crm:leads:manage"]))])
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
        project_id=data.project_id,
        attachments=data.attachments,
        cc_emails=data.cc_emails,
        bcc_emails=data.bcc_emails
    )

    return {"message": "Correo enviado exitosamente", "data": result}


@router.post("/{email_id}/accept-meeting", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def accept_crm_meeting(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Acepta una reunión recibida en el correo, la agenda en cPanel CalDAV y registra la actividad."""
    try:
        return await CRMEmailService.accept_meeting(db=db, user=current_user, email_id=email_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al agendar reunión en cPanel: {str(e)}")


@router.post("/{email_id}/decline-meeting", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def decline_crm_meeting(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rechaza una invitación a reunión."""
    try:
        return await CRMEmailService.decline_meeting(db=db, user=current_user, email_id=email_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{email_id}/star", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def toggle_crm_email_star(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alterna el estado destacado (estrella) de un correo."""
    res = await CRMEmailService.toggle_star(db=db, email_id=email_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    return res


@router.post("/{email_id}/archive", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def toggle_crm_email_archive(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Archiva o desarchiva un correo."""
    res = await CRMEmailService.toggle_archive(db=db, email_id=email_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    return res


@router.post("/{email_id}/trash", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def move_crm_email_to_trash(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mueve un correo a la papelera."""
    res = await CRMEmailService.move_to_trash(db=db, email_id=email_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    return res


@router.post("/{email_id}/restore", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def restore_crm_email_from_trash(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Restaura un correo de la papelera."""
    res = await CRMEmailService.restore_from_trash(db=db, email_id=email_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    return res


@router.delete("/{email_id}", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def delete_crm_email_permanently(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Elimina definitivamente un correo."""
    ok = await CRMEmailService.delete_permanently(db=db, email_id=email_id, user_id=current_user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    return {"message": "Correo eliminado definitivamente"}


@router.delete("/trash/empty", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def empty_crm_email_trash(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Vacía todos los correos en la papelera."""
    count = await CRMEmailService.empty_trash(db=db, user_id=current_user.id)
    return {"message": "Papelera vaciada exitosamente", "count": count}


@router.post("/bulk", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def bulk_crm_email_action(
    data: BulkEmailActionSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Aplica acciones masivas (leído, no leído, destacar, archivar, papelera, eliminar)."""
    try:
        return await CRMEmailService.bulk_action(db=db, user_id=current_user.id, action=data.action, email_ids=data.email_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{email_id}/create-lead", dependencies=[Depends(RequirePermission(["crm:leads:manage", "crm:view"]))])
async def create_lead_from_crm_email(
    email_id: int,
    data: Optional[CreateLeadFromEmailSchema] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un prospecto en el CRM directamente a partir del remitente de un correo entrante."""
    try:
        return await CRMEmailService.create_lead_from_email(
            db=db,
            user=current_user,
            email_id=email_id,
            name=data.name if data else None,
            phone=data.phone if data else None,
            project_id=data.project_id if data else None
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{email_id}/read", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def mark_crm_email_as_read(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Marca un correo como leído."""
    res = await CRMEmailService.mark_email_read(db=db, email_id=email_id, user_id=current_user.id, is_read=True)
    if not res:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    return {"message": "Correo marcado como leído", **res}


@router.post("/{email_id}/toggle-read", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def toggle_crm_email_read(
    email_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alterna el estado de leído/no leído de un correo."""
    from src.models.crm_email import CRMEmail
    email_item = await db.get(CRMEmail, email_id)
    if not email_item or email_item.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Correo no encontrado")
    email_item.is_read = not email_item.is_read
    db.add(email_item)
    await db.commit()
    return {"id": email_item.id, "is_read": email_item.is_read}


@router.post("/read-all", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
async def mark_all_crm_emails_as_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Marca todos los correos recibidos como leídos."""
    updated = await CRMEmailService.mark_all_read(db=db, user_id=current_user.id)
    return {"message": "Todos los correos han sido marcados como leídos", "count": updated}


class SyncEmailSchema(BaseModel):
    imap_user: Optional[str] = None
    imap_pass: Optional[str] = None
    save_password: Optional[bool] = True

class EmailSettingsSchema(BaseModel):
    imap_password: Optional[str] = None

@router.get("/settings", dependencies=[Depends(RequirePermission(["crm:inbox:view", "crm:view"]))])
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
    has_saved = bool(current_user.imap_password) or bool(settings.IMAP_PASSWORD)
    db.add(current_user)
    await db.commit()
    return {
        "message": "Configuración de correo actualizada exitosamente",
        "has_saved_password": has_saved
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
