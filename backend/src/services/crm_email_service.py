import json
import os
import uuid
import re
import mimetypes
from datetime import datetime
from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc, or_, and_

from src.models.crm_email import CRMEmail, CRMEmailDirection, CRMEmailStatus
from src.models.crm import CRMLead, CRMProject, CRMActivity, CRMActivityType
from src.models.user import User
from src.services.email_service import EmailService

def _parse_attachments(att_raw: Optional[str]) -> List[dict]:
    if not att_raw:
        return []
    try:
        data = json.loads(att_raw)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _parse_calendar_event(email_rec: CRMEmail) -> Optional[dict]:
    """Extrae la información estructurada de reunión / invitación desde calendar_event o attachments .ics."""
    cal_raw = getattr(email_rec, "calendar_event", None)
    if cal_raw:
        try:
            data = json.loads(cal_raw)
            if isinstance(data, dict):
                return data
        except Exception:
            pass

    # Fallback inteligente: si calendar_event está vacío pero hay un archivo .ics en adjuntos
    try:
        att_list = _parse_attachments(email_rec.attachments)
        for att in att_list:
            fname = (att.get("filename") or "").lower()
            ctype = (att.get("content_type") or "").lower()
            if fname.endswith(".ics") or "calendar" in ctype:
                file_url = att.get("file_url", "")
                clean_path = file_url.lstrip("/")
                if clean_path.startswith("api/v1/uploads/"):
                    clean_path = clean_path.replace("api/v1/uploads/", "uploads/")
                local_path = os.path.abspath(clean_path)
                if os.path.exists(local_path):
                    with open(local_path, "r", encoding="utf-8", errors="ignore") as f:
                        ics_text = f.read()
                    from src.services.crm_calendar_service import parse_vevent_ics
                    events = parse_vevent_ics(ics_text)
                    if events:
                        ev = events[0]
                        return {
                            "uid": ev.get("uid"),
                            "title": ev.get("title") or email_rec.subject or "Invitación a Reunión",
                            "start": ev.get("start"),
                            "end": ev.get("end"),
                            "description": ev.get("description") or "",
                            "location": ev.get("location") or "",
                            "url": ev.get("url"),
                            "organizer": ev.get("organizer"),
                            "attendees": ev.get("attendees") or [],
                            "status": ev.get("status") or "CONFIRMED",
                            "user_response": "pending",
                            "accepted_at": None,
                            "declined_at": None,
                            "calendar_uid": None
                        }
    except Exception as e:
        print(f"Error parsing fallback calendar event: {e}")

    # Fallback si en el cuerpo del correo hay un bloque VCALENDAR
    if email_rec.body_html and "BEGIN:VCALENDAR" in email_rec.body_html:
        try:
            from src.services.crm_calendar_service import parse_vevent_ics
            events = parse_vevent_ics(email_rec.body_html)
            if events:
                ev = events[0]
                return {
                    "uid": ev.get("uid"),
                    "title": ev.get("title") or email_rec.subject or "Invitación a Reunión",
                    "start": ev.get("start"),
                    "end": ev.get("end"),
                    "description": ev.get("description") or "",
                    "location": ev.get("location") or "",
                    "url": ev.get("url"),
                    "organizer": ev.get("organizer"),
                    "attendees": ev.get("attendees") or [],
                    "status": ev.get("status") or "CONFIRMED",
                    "user_response": "pending",
                    "accepted_at": None,
                    "declined_at": None,
                    "calendar_uid": None
                }
        except Exception:
            pass

    return None


def _format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Formatea la fecha a ISO-8601 con sufijo Z (UTC) para que el navegador la convierta a la hora local del usuario."""
    if not dt:
        return None
    s = dt.isoformat()
    if not s.endswith("Z") and "+" not in s:
        return s + "Z"
    return s


def _email_to_dict(e: CRMEmail) -> dict:
    """Serializa un objeto CRMEmail a un diccionario completo para el cliente frontend."""
    return {
        "id": e.id,
        "lead_id": e.lead_id,
        "lead_name": e.lead.name if getattr(e, "lead", None) else None,
        "project_id": e.project_id,
        "project_name": e.project.name if getattr(e, "project", None) else None,
        "user_id": e.user_id,
        "user_name": e.user.name if getattr(e, "user", None) else "Asesor",
        "direction": e.direction,
        "sender_email": e.sender_email,
        "recipient_email": e.recipient_email,
        "subject": e.subject,
        "body_html": e.body_html,
        "body_text": e.body_text,
        "status": e.status,
        "is_read": bool(e.is_read),
        "is_starred": bool(getattr(e, "is_starred", False)),
        "is_archived": bool(getattr(e, "is_archived", False)),
        "is_deleted": bool(getattr(e, "is_deleted", False)),
        "calendar_event": _parse_calendar_event(e),
        "cc_emails": getattr(e, "cc_emails", None),
        "bcc_emails": getattr(e, "bcc_emails", None),
        "attachments": _parse_attachments(e.attachments),
        "created_at": _format_datetime(e.created_at)
    }


class CRMEmailService:
    @staticmethod
    async def get_user_emails(
        db: AsyncSession, 
        user_id: int, 
        folder: str = "inbox", 
        search: Optional[str] = None,
        has_meeting: Optional[bool] = None
    ) -> List[dict]:
        """Obtiene la lista de correos de la bandeja (inbox, sent, starred, archived, trash)."""
        stmt = (
            select(CRMEmail)
            .options(selectinload(CRMEmail.lead), selectinload(CRMEmail.project), selectinload(CRMEmail.user))
        )

        if user_id:
            stmt = stmt.where(CRMEmail.user_id == user_id)

        if folder == "inbox":
            stmt = stmt.where(
                and_(
                    CRMEmail.is_deleted == False,
                    CRMEmail.is_archived == False,
                    or_(
                        CRMEmail.direction.in_(["inbound", "INBOUND", CRMEmailDirection.INBOUND]),
                        CRMEmail.status.in_([CRMEmailStatus.RECEIVED, "received"])
                    ),
                    CRMEmail.direction.notin_(["outbound", "OUTBOUND", CRMEmailDirection.OUTBOUND]),
                    CRMEmail.status.notin_([CRMEmailStatus.SENT, CRMEmailStatus.DELIVERED, "sent", "delivered"])
                )
            )
        elif folder == "sent":
            stmt = stmt.where(
                and_(
                    CRMEmail.is_deleted == False,
                    CRMEmail.is_archived == False,
                    or_(
                        CRMEmail.direction.in_(["outbound", "OUTBOUND", CRMEmailDirection.OUTBOUND]),
                        CRMEmail.status.in_([CRMEmailStatus.SENT, CRMEmailStatus.DELIVERED, "sent", "delivered"])
                    ),
                    CRMEmail.direction.notin_(["inbound", "INBOUND", CRMEmailDirection.INBOUND]),
                    CRMEmail.status.notin_([CRMEmailStatus.RECEIVED, "received"])
                )
            )
        elif folder == "starred":
            stmt = stmt.where(
                and_(
                    CRMEmail.is_deleted == False,
                    CRMEmail.is_starred == True
                )
            )
        elif folder == "archived":
            stmt = stmt.where(
                and_(
                    CRMEmail.is_deleted == False,
                    CRMEmail.is_archived == True
                )
            )
        elif folder == "trash":
            stmt = stmt.where(
                CRMEmail.is_deleted == True
            )

        if search:
            stmt = stmt.where(or_(
                CRMEmail.subject.ilike(f"%{search}%"),
                CRMEmail.recipient_email.ilike(f"%{search}%"),
                CRMEmail.sender_email.ilike(f"%{search}%")
            ))

        if has_meeting:
            stmt = stmt.where(or_(
                CRMEmail.calendar_event.isnot(None),
                CRMEmail.attachments.ilike("%ics%")
            ))

        stmt = stmt.order_by(desc(CRMEmail.created_at))
        res = await db.execute(stmt)
        emails = res.scalars().all()

        return [_email_to_dict(e) for e in emails]

    @staticmethod
    async def get_folder_counts(db: AsyncSession, user_id: int) -> dict:
        """Calcula el número de correos por cada carpeta para insignias en tiempo real."""
        from sqlalchemy import func

        inbound_base = and_(
            CRMEmail.user_id == user_id,
            CRMEmail.is_deleted == False,
            CRMEmail.is_archived == False,
            or_(
                CRMEmail.direction.in_(["inbound", "INBOUND", CRMEmailDirection.INBOUND]),
                CRMEmail.status.in_([CRMEmailStatus.RECEIVED, "received"])
            ),
            CRMEmail.direction.notin_(["outbound", "OUTBOUND", CRMEmailDirection.OUTBOUND]),
            CRMEmail.status.notin_([CRMEmailStatus.SENT, CRMEmailStatus.DELIVERED, "sent", "delivered"])
        )

        inbox_count = (await db.execute(select(func.count(CRMEmail.id)).where(inbound_base))).scalar() or 0
        unread_inbox_count = (await db.execute(select(func.count(CRMEmail.id)).where(and_(inbound_base, CRMEmail.is_read == False)))).scalar() or 0

        starred_count = (await db.execute(select(func.count(CRMEmail.id)).where(
            and_(CRMEmail.user_id == user_id, CRMEmail.is_deleted == False, CRMEmail.is_starred == True)
        ))).scalar() or 0

        sent_base = and_(
            CRMEmail.user_id == user_id,
            CRMEmail.is_deleted == False,
            CRMEmail.is_archived == False,
            or_(
                CRMEmail.direction.in_(["outbound", "OUTBOUND", CRMEmailDirection.OUTBOUND]),
                CRMEmail.status.in_([CRMEmailStatus.SENT, CRMEmailStatus.DELIVERED, "sent", "delivered"])
            ),
            CRMEmail.direction.notin_(["inbound", "INBOUND", CRMEmailDirection.INBOUND]),
            CRMEmail.status.notin_([CRMEmailStatus.RECEIVED, "received"])
        )
        sent_count = (await db.execute(select(func.count(CRMEmail.id)).where(sent_base))).scalar() or 0

        archived_count = (await db.execute(select(func.count(CRMEmail.id)).where(
            and_(CRMEmail.user_id == user_id, CRMEmail.is_deleted == False, CRMEmail.is_archived == True)
        ))).scalar() or 0

        trash_count = (await db.execute(select(func.count(CRMEmail.id)).where(
            and_(CRMEmail.user_id == user_id, CRMEmail.is_deleted == True)
        ))).scalar() or 0

        return {
            "inbox": inbox_count,
            "unread_inbox": unread_inbox_count,
            "starred": starred_count,
            "sent": sent_count,
            "archived": archived_count,
            "trash": trash_count
        }

    @staticmethod
    async def get_lead_emails(db: AsyncSession, lead_id: int) -> List[dict]:
        """Obtiene el historial de correos de un prospecto en específico."""
        stmt = (
            select(CRMEmail)
            .options(selectinload(CRMEmail.user), selectinload(CRMEmail.lead), selectinload(CRMEmail.project))
            .where(and_(CRMEmail.lead_id == lead_id, CRMEmail.is_deleted == False))
            .order_by(desc(CRMEmail.created_at))
        )
        res = await db.execute(stmt)
        emails = res.scalars().all()

        return [_email_to_dict(e) for e in emails]

    @staticmethod
    async def mark_email_read(db: AsyncSession, email_id: int, user_id: Optional[int] = None, is_read: bool = True) -> Optional[dict]:
        """Marca un correo específico como leído o no leído."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec:
            return None
        if user_id is not None and email_rec.user_id != user_id:
            return None
        email_rec.is_read = is_read
        db.add(email_rec)
        await db.commit()
        return {"id": email_rec.id, "is_read": email_rec.is_read}

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: int) -> int:
        """Marca todos los correos recibidos del usuario como leídos."""
        from sqlalchemy import update
        stmt = (
            update(CRMEmail)
            .where(
                and_(
                    CRMEmail.user_id == user_id,
                    CRMEmail.is_deleted == False,
                    or_(
                        CRMEmail.direction.in_(["inbound", "INBOUND", CRMEmailDirection.INBOUND]),
                        CRMEmail.status.in_([CRMEmailStatus.RECEIVED, "received"])
                    ),
                    CRMEmail.is_read == False
                )
            )
            .values(is_read=True)
        )
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount

    @staticmethod
    async def toggle_star(db: AsyncSession, email_id: int, user_id: int) -> Optional[dict]:
        """Alterna el estado de destacado/estrella de un correo."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user_id:
            return None
        email_rec.is_starred = not bool(email_rec.is_starred)
        db.add(email_rec)
        await db.commit()
        return {"id": email_rec.id, "is_starred": email_rec.is_starred}

    @staticmethod
    async def toggle_archive(db: AsyncSession, email_id: int, user_id: int) -> Optional[dict]:
        """Archiva o desarchiva un correo."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user_id:
            return None
        email_rec.is_archived = not bool(email_rec.is_archived)
        db.add(email_rec)
        await db.commit()
        return {"id": email_rec.id, "is_archived": email_rec.is_archived}

    @staticmethod
    async def move_to_trash(db: AsyncSession, email_id: int, user_id: int) -> Optional[dict]:
        """Mueve un correo a la papelera."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user_id:
            return None
        email_rec.is_deleted = True
        db.add(email_rec)
        await db.commit()
        return {"id": email_rec.id, "is_deleted": True}

    @staticmethod
    async def restore_from_trash(db: AsyncSession, email_id: int, user_id: int) -> Optional[dict]:
        """Restaura un correo de la papelera a su bandeja correspondiente."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user_id:
            return None
        email_rec.is_deleted = False
        db.add(email_rec)
        await db.commit()
        return {"id": email_rec.id, "is_deleted": False}

    @staticmethod
    async def delete_permanently(db: AsyncSession, email_id: int, user_id: int) -> bool:
        """Elimina definitivamente un correo de la base de datos."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user_id:
            return False
        await db.delete(email_rec)
        await db.commit()
        return True

    @staticmethod
    async def empty_trash(db: AsyncSession, user_id: int) -> int:
        """Vacía todos los correos en la papelera del usuario."""
        from sqlalchemy import delete
        stmt = delete(CRMEmail).where(and_(CRMEmail.user_id == user_id, CRMEmail.is_deleted == True))
        res = await db.execute(stmt)
        await db.commit()
        return res.rowcount

    @staticmethod
    async def bulk_action(db: AsyncSession, user_id: int, action: str, email_ids: List[int]) -> dict:
        """Aplica acciones masivas a una lista de correos."""
        from sqlalchemy import update, delete
        if not email_ids:
            return {"affected": 0, "action": action}

        base_cond = and_(CRMEmail.user_id == user_id, CRMEmail.id.in_(email_ids))

        if action == "mark_read":
            stmt = update(CRMEmail).where(base_cond).values(is_read=True)
            res = await db.execute(stmt)
        elif action == "mark_unread":
            stmt = update(CRMEmail).where(base_cond).values(is_read=False)
            res = await db.execute(stmt)
        elif action == "star":
            stmt = update(CRMEmail).where(base_cond).values(is_starred=True)
            res = await db.execute(stmt)
        elif action == "unstar":
            stmt = update(CRMEmail).where(base_cond).values(is_starred=False)
            res = await db.execute(stmt)
        elif action == "archive":
            stmt = update(CRMEmail).where(base_cond).values(is_archived=True, is_deleted=False)
            res = await db.execute(stmt)
        elif action == "unarchive":
            stmt = update(CRMEmail).where(base_cond).values(is_archived=False)
            res = await db.execute(stmt)
        elif action == "trash":
            stmt = update(CRMEmail).where(base_cond).values(is_deleted=True)
            res = await db.execute(stmt)
        elif action == "restore":
            stmt = update(CRMEmail).where(base_cond).values(is_deleted=False)
            res = await db.execute(stmt)
        elif action == "delete_permanent":
            stmt = delete(CRMEmail).where(base_cond)
            res = await db.execute(stmt)
        else:
            raise ValueError(f"Acción no soportada: {action}")

        await db.commit()
        return {"affected": res.rowcount, "action": action}

    @staticmethod
    async def accept_meeting(db: AsyncSession, user: User, email_id: int) -> dict:
        """
        Acepta una invitación a reunión contenida en el correo:
        1. Agenda la cita directamente en el Calendario CalDAV de cPanel.
        2. Registra la actividad en el prospecto CRM si está vinculado.
        3. Actualiza el estado de la invitación a 'accepted' en la BD.
        4. Opcionalmente despacha un correo de confirmación RSVP al organizador.
        """
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user.id:
            raise ValueError("Correo no encontrado o sin permisos.")

        cal_event = _parse_calendar_event(email_rec)
        if not cal_event:
            raise ValueError("Este correo no contiene ninguna invitación o evento de calendario detectable.")

        # 1. Crear evento en el Calendario CalDAV de cPanel usando CRMCalendarService
        from src.services.crm_calendar_service import CRMCalendarService
        cal_res = await CRMCalendarService.create_event(
            user=user,
            db=db,
            title=cal_event.get("title") or "Reunión Aceptada",
            start_datetime=cal_event.get("start"),
            end_datetime=cal_event.get("end"),
            description=cal_event.get("description", ""),
            location=cal_event.get("location") or cal_event.get("url") or "",
            lead_id=email_rec.lead_id
        )

        # 2. Actualizar estado de respuesta en calendar_event
        cal_event["user_response"] = "accepted"
        cal_event["accepted_at"] = datetime.utcnow().isoformat()
        cal_event["calendar_uid"] = cal_res.get("uid")
        email_rec.calendar_event = json.dumps(cal_event)
        db.add(email_rec)
        await db.commit()
        await db.refresh(email_rec)

        # 3. Notificar al organizador por correo (RSVP)
        organizer_email = None
        if cal_event.get("organizer") and isinstance(cal_event["organizer"], dict):
            organizer_email = cal_event["organizer"].get("email")
        elif email_rec.sender_email and email_rec.sender_email != user.email:
            organizer_email = email_rec.sender_email

        if organizer_email and organizer_email.lower() != user.email.lower():
            try:
                EmailService.send_crm_custom_email(
                    to_email=organizer_email,
                    subject=f"✓ Aceptada: {cal_event.get('title')}",
                    html_content=f"""
                    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                        <h3 style="color: #059669; margin-top: 0; font-size: 18px;">✓ Invitación a Reunión Aceptada</h3>
                        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                            <strong>{user.name}</strong> ({user.email}) ha aceptado la reunión comercial:
                        </p>
                        <div style="background-color: #f8fafc; padding: 14px 18px; border-radius: 12px; border-left: 4px solid #059669; margin: 18px 0;">
                            <p style="margin: 4px 0; font-weight: bold; color: #0f172a; font-size: 15px;">{cal_event.get('title')}</p>
                            <p style="margin: 4px 0; font-size: 13px; color: #64748b;">📅 Fecha/Hora: {cal_event.get('start')} a {cal_event.get('end')}</p>
                            {f'<p style="margin: 4px 0; font-size: 13px; color: #64748b;">📍 Lugar: {cal_event.get("location")}</p>' if cal_event.get("location") else ''}
                        </div>
                        <p style="font-size: 12px; color: #94a3b8; margin: 0;">Confirmación automática generada por GlointPy CRM</p>
                    </div>
                    """,
                    from_name=user.name,
                    reply_to_email=user.email
                )
            except Exception as rsvp_err:
                print(f"Error enviando RSVP confirmation: {rsvp_err}")

        return {
            "success": True,
            "message": f"¡Reunión '{cal_event.get('title')}' aceptada y agendada exitosamente en tu Calendario cPanel!",
            "calendar_event": cal_event
        }

    @staticmethod
    async def decline_meeting(db: AsyncSession, user: User, email_id: int) -> dict:
        """Rechaza una invitación a reunión y la retira del Calendario cPanel si estaba agendada."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user.id:
            raise ValueError("Correo no encontrado o sin permisos.")

        cal_event = _parse_calendar_event(email_rec)
        if not cal_event:
            raise ValueError("Este correo no contiene ninguna invitación o evento de calendario detectable.")

        # Si estaba previamente agendada en cPanel, removerla
        if cal_event.get("calendar_uid"):
            try:
                from src.services.crm_calendar_service import CRMCalendarService
                await CRMCalendarService.delete_event(user=user, event_uid=cal_event["calendar_uid"])
            except Exception as del_err:
                print(f"Error eliminando evento de CalDAV al rechazar: {del_err}")

        cal_event["user_response"] = "declined"
        cal_event["declined_at"] = datetime.utcnow().isoformat()
        cal_event["calendar_uid"] = None
        email_rec.calendar_event = json.dumps(cal_event)
        db.add(email_rec)
        await db.commit()
        await db.refresh(email_rec)

        return {
            "success": True,
            "message": f"Invitación a la reunión '{cal_event.get('title')}' rechazada.",
            "calendar_event": cal_event
        }

    @staticmethod
    async def create_lead_from_email(
        db: AsyncSession, 
        user: User, 
        email_id: int, 
        name: Optional[str] = None, 
        phone: Optional[str] = None, 
        project_id: Optional[int] = None
    ) -> dict:
        """Crea un nuevo prospecto en el CRM a partir del remitente de un correo entrante."""
        email_rec = await db.get(CRMEmail, email_id)
        if not email_rec or email_rec.user_id != user.id:
            raise ValueError("Correo no encontrado o sin permisos.")

        if email_rec.lead_id:
            lead = await db.get(CRMLead, email_rec.lead_id)
            if lead:
                return {"success": True, "lead_id": lead.id, "lead_name": lead.name, "already_existed": True}

        if not project_id:
            p_res = await db.execute(select(CRMProject).where(CRMProject.status == "activo").limit(1))
            active_proj = p_res.scalars().first()
            if not active_proj:
                p_res_any = await db.execute(select(CRMProject).limit(1))
                active_proj = p_res_any.scalars().first()
            project_id = active_proj.id if active_proj else 1

        clean_email = email_rec.sender_email.strip().lower()
        lead_name = name.strip() if name and name.strip() else clean_email.split("@")[0].replace(".", " ").title()

        new_lead = CRMLead(
            project_id=project_id,
            name=lead_name,
            email=clean_email,
            phone=phone.strip() if phone else None,
            assigned_to=user.id,
            stage="lead_entrante",
            source="email_inbound"
        )
        db.add(new_lead)
        await db.commit()
        await db.refresh(new_lead)

        email_rec.lead_id = new_lead.id
        email_rec.project_id = project_id
        db.add(email_rec)

        activity = CRMActivity(
            lead_id=new_lead.id,
            user_id=user.id,
            type=CRMActivityType.NOTA,
            title=f"👤 Prospecto creado desde correo: {email_rec.subject[:50]}",
            description=f"Prospecto registrado a partir de mensaje recibido de {clean_email}."
        )
        db.add(activity)
        await db.commit()

        return {
            "success": True,
            "lead_id": new_lead.id,
            "lead_name": new_lead.name,
            "message": f"Prospecto '{new_lead.name}' creado y vinculado exitosamente."
        }

    @staticmethod
    async def send_crm_email(
        db: AsyncSession, 
        user: User, 
        recipient_email: str, 
        subject: str, 
        body_html: str,
        lead_id: Optional[int] = None,
        project_id: Optional[int] = None,
        attachments: Optional[List[dict]] = None,
        cc_emails: Optional[str] = None,
        bcc_emails: Optional[str] = None
    ) -> dict:
        """Envía un correo comercial a través de Resend, guarda la copia en la BD y registra la actividad."""
        if not lead_id:
            lead_res = await db.execute(select(CRMLead).where(CRMLead.email == recipient_email.strip()))
            found_lead = lead_res.scalars().first()
            if found_lead:
                lead_id = found_lead.id
                if not project_id:
                    project_id = found_lead.project_id

        cc_list = [c.strip() for c in cc_emails.replace(";", ",").split(",") if c.strip()] if cc_emails else None
        bcc_list = [b.strip() for b in bcc_emails.replace(";", ",").split(",") if b.strip()] if bcc_emails else None

        # Enviar vía Resend API con Reply-To al correo corporativo del asesor, adjuntos, CC y BCC
        success = EmailService.send_crm_custom_email(
            to_email=recipient_email.strip(),
            subject=subject.strip(),
            html_content=body_html,
            from_name=user.name,
            reply_to_email=user.email,
            attachments=attachments,
            cc=cc_list,
            bcc=bcc_list
        )

        email_record = CRMEmail(
            lead_id=lead_id,
            project_id=project_id,
            user_id=user.id,
            direction=CRMEmailDirection.OUTBOUND,
            sender_email=user.email,
            recipient_email=recipient_email.strip(),
            subject=subject.strip(),
            body_html=body_html,
            status=CRMEmailStatus.SENT if success else CRMEmailStatus.FAILED,
            is_read=True,
            is_starred=False,
            is_archived=False,
            is_deleted=False,
            cc_emails=cc_emails.strip() if cc_emails else None,
            bcc_emails=bcc_emails.strip() if bcc_emails else None,
            attachments=json.dumps(attachments) if attachments else None
        )
        db.add(email_record)
        await db.commit()
        await db.refresh(email_record)

        if lead_id:
            att_suffix = f" ({len(attachments)} adjunto{'s' if len(attachments) > 1 else ''})" if attachments else ""
            activity = CRMActivity(
                lead_id=lead_id,
                user_id=user.id,
                type=CRMActivityType.NOTA,
                title=f"📧 Correo enviado: {subject[:60]}{att_suffix}",
                description=f"Enviado a {recipient_email}. Asesor: {user.name}"
            )
            db.add(activity)
            await db.commit()

        return _email_to_dict(email_record)

    @staticmethod
    def get_email_templates() -> List[dict]:
        """Plantillas comerciales prediseñadas para agilizar envíos."""
        return [
            {
                "id": "presentacion",
                "name": " Presentación de Proyecto & Modelo Gloint",
                "subject": "Oportunidad de Inversión y Rentabilidad - Gloint International Partners",
                "body_html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Estimado/a cliente,</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Es un gusto saludarte. Te compartimos la información y el dossier digital del proyecto de inversión en Gloint International Partners.
                    </p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Nuestros proyectos ofrecen esquemas de rentabilidad fija y variable garantizada con respaldo en activos reales de alta valorización.
                    </p>
                    <div style="margin: 24px 0; text-align: center;">
                        <a href="https://pruebas.gloint.com.co" style="background-color: #f97316; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block;">
                            Ver Dossier & Proyectos
                        </a>
                    </div>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Quedo a tu disposición para programar una breve llamada de asesoría personalizada.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        GLOINT International Partners • Equipo Comercial
                    </p>
                </div>
                """
            },
            {
                "id": "seguimiento",
                "name": "📞 Seguimiento a Propuesta Comercial",
                "subject": "Seguimiento a tu propuesta de inversión en Gloint",
                "body_html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
                    <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Hola,</h2>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Espero que estés teniendo un excelente día. Hacemos seguimiento a la propuesta de inversión que conversamos recientemente.
                    </p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        ¿Tienes alguna inquietud adicional sobre el plan de rendimientos o los términos del contrato?
                    </p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.6;">
                        Si deseas coordinar una llamada o reunión presencial, solo respóndeme a este correo o escríbeme por WhatsApp.
                    </p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        GLOINT International Partners • Equipo Comercial
                    </p>
                </div>
                """
            }
        ]

    @staticmethod
    async def sync_imap_emails(
        db: AsyncSession, 
        user: User, 
        imap_user: Optional[str] = None, 
        imap_pass: Optional[str] = None,
        save_password: bool = True
    ) -> dict:
        """Sincroniza la bandeja de entrada de cPanel buscando respuestas y nuevos correos."""
        import imaplib
        import email
        from email.header import decode_header
        from email.utils import parseaddr, parsedate_to_datetime
        import datetime as dt_module
        from src.core.config import settings

        host = settings.IMAP_HOST or "host81.latinoamericahosting.com"
        port = settings.IMAP_PORT or 993
        username = (imap_user or settings.IMAP_USER or user.email or "").strip()
        password = imap_pass or user.imap_password or settings.IMAP_PASSWORD

        if not password:
            return {
                "synced_count": 0,
                "needs_password": True,
                "has_saved_password": False,
                "message": f"Servidor cPanel IMAP ({host}:{port}) listo. Ingresa la contraseña de la cuenta para sincronizar automáticamente."
            }

        def decode_mime_string(header_val) -> str:
            if not header_val:
                return ""
            try:
                decoded_parts = decode_header(header_val)
                res = []
                for part_bytes, enc in decoded_parts:
                    if isinstance(part_bytes, bytes):
                        res.append(part_bytes.decode(enc or "utf-8", errors="ignore"))
                    else:
                        res.append(str(part_bytes))
                return "".join(res).strip()
            except Exception:
                return str(header_val).strip()

        synced_count = 0
        try:
            # Conexión SSL segura a cPanel
            mail = imaplib.IMAP4_SSL(host, port)
            mail.login(username, password)
            mail.select("INBOX")

            # Si el inicio de sesión fue exitoso y se envió una contraseña para guardar
            if imap_pass and save_password and user.imap_password != imap_pass:
                user.imap_password = imap_pass
                db.add(user)
                await db.commit()

            # Buscar correos en la bandeja de entrada
            status, messages = mail.search(None, "ALL")
            if status != "OK" or not messages or not messages[0]:
                mail.logout()
                return {
                    "synced_count": 0,
                    "message": "Bandeja vacía.",
                    "has_saved_password": bool(user.imap_password or settings.IMAP_PASSWORD)
                }

            raw_ids = messages[0].split()
            num_ids = []
            for item in raw_ids:
                try:
                    num_ids.append(int(item))
                except (ValueError, TypeError):
                    pass

            num_ids.sort()
            # Inspeccionar hasta los 60 correos más recientes de la bandeja
            recent_ids = num_ids[-60:] if len(num_ids) > 60 else num_ids

            for e_id in reversed(recent_ids):
                try:
                    res, msg_data = mail.fetch(str(e_id), "(RFC822 FLAGS)")
                    if res != "OK" or not msg_data:
                        continue

                    for response_part in msg_data:
                        if not isinstance(response_part, tuple):
                            continue

                        # Detectar si el correo fue leído en cPanel (bandera \Seen)
                        flags_str = response_part[0].decode("utf-8", errors="ignore") if isinstance(response_part[0], bytes) else str(response_part[0])
                        is_seen_in_cpanel = "\\seen" in flags_str.lower()

                        msg = email.message_from_bytes(response_part[1])

                        # Extraer asunto de manera segura y completa
                        subject = decode_mime_string(msg.get("Subject")) or "(Sin asunto)"

                        # Extraer remitente con estándar RFC 2822
                        from_header = msg.get("From", "")
                        _, sender_email = parseaddr(from_header)
                        if not sender_email:
                            match = re.search(r'[\w\.-]+@[\w\.-]+', str(from_header))
                            sender_email = match.group(0) if match else str(from_header).strip()
                        sender_email = sender_email.strip().lower()

                        if not sender_email:
                            continue

                        # Ignorar correos salientes propios
                        if sender_email == username.lower():
                            continue

                        # Extraer destinatario
                        to_header = msg.get("To", "")
                        _, to_email = parseaddr(to_header)
                        recipient_email = to_email.strip().lower() if to_email else username.lower()

                        # Extraer y normalizar fecha real del correo a UTC
                        date_header = msg.get("Date")
                        msg_date = None
                        if date_header:
                            try:
                                parsed_dt = parsedate_to_datetime(date_header)
                                if parsed_dt.tzinfo:
                                    msg_date = parsed_dt.astimezone(dt_module.timezone.utc).replace(tzinfo=None)
                                else:
                                    msg_date = parsed_dt
                            except Exception:
                                msg_date = None

                        # Extraer cuerpo del mensaje, imágenes inline y archivos adjuntos
                        body_html = ""
                        body_text = ""
                        attachments = []
                        cid_map = {}
                        detected_calendar_event = None

                        if msg.is_multipart():
                            for part in msg.walk():
                                if part.get_content_maintype() == "multipart":
                                    continue

                                c_type = part.get_content_type()
                                c_disp = str(part.get("Content-Disposition") or "")
                                filename = part.get_filename()
                                cid = part.get("Content-ID")

                                if filename:
                                    filename = decode_mime_string(filename)

                                is_calendar = (c_type == "text/calendar") or (filename and filename.lower().endswith(".ics")) or ("calendar" in c_disp.lower())
                                is_attachment = ("attachment" in c_disp.lower()) or bool(filename) or is_calendar

                                # Si no es adjunto y es texto plano o HTML del mensaje principal
                                if not is_attachment and not filename and not cid and not is_calendar:
                                    if c_type == "text/html" and not body_html:
                                        try:
                                            body_html = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="ignore")
                                        except Exception:
                                            body_html = part.get_payload(decode=True).decode(errors="ignore")
                                        continue
                                    elif c_type == "text/plain" and not body_text:
                                        try:
                                            body_text = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="ignore")
                                        except Exception:
                                            body_text = part.get_payload(decode=True).decode(errors="ignore")
                                        continue

                                # Es un archivo adjunto, evento de calendario o una imagen (inline o adjunta)
                                payload = part.get_payload(decode=True)
                                if not payload:
                                    continue

                                # Si es un archivo o parte de calendario .ics, parsearlo para widget de reunión
                                if is_calendar and not detected_calendar_event:
                                    try:
                                        ics_text = payload.decode(part.get_content_charset() or "utf-8", errors="ignore") if isinstance(payload, bytes) else str(payload)
                                        from src.services.crm_calendar_service import parse_vevent_ics
                                        cal_evs = parse_vevent_ics(ics_text)
                                        if cal_evs:
                                            ev = cal_evs[0]
                                            detected_calendar_event = {
                                                "uid": ev.get("uid"),
                                                "title": ev.get("title") or subject or "Invitación a Reunión",
                                                "start": ev.get("start"),
                                                "end": ev.get("end"),
                                                "description": ev.get("description") or "",
                                                "location": ev.get("location") or "",
                                                "url": ev.get("url"),
                                                "organizer": ev.get("organizer"),
                                                "attendees": ev.get("attendees") or [],
                                                "status": ev.get("status") or "CONFIRMED",
                                                "user_response": "pending",
                                                "accepted_at": None,
                                                "declined_at": None,
                                                "calendar_uid": None
                                            }
                                    except Exception as cal_err:
                                        print(f"Error parseando VEVENT en IMAP part: {cal_err}")

                                if not filename:
                                    if is_calendar:
                                        filename = f"invitacion_{uuid.uuid4().hex[:6]}.ics"
                                    else:
                                        ext = mimetypes.guess_extension(c_type) or ".bin"
                                        filename = f"adjunto_{uuid.uuid4().hex[:6]}{ext}"

                                safe_fname = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
                                unique_name = f"{uuid.uuid4().hex[:10]}_{safe_fname}"
                                target_dir = os.path.join("uploads", "email_attachments")
                                os.makedirs(target_dir, exist_ok=True)
                                target_path = os.path.join(target_dir, unique_name)

                                try:
                                    with open(target_path, "wb") as f:
                                        f.write(payload)

                                    file_rel_url = f"/uploads/email_attachments/{unique_name}"

                                    if cid:
                                        clean_cid = cid.strip("<>").strip()
                                        cid_map[clean_cid] = f"/api/v1{file_rel_url}"

                                    attachments.append({
                                        "filename": filename,
                                        "file_url": file_rel_url,
                                        "content_type": c_type or "text/calendar" if is_calendar else "application/octet-stream",
                                        "size": len(payload)
                                    })
                                except Exception as save_err:
                                    print(f"Error guardando adjunto {filename}: {save_err}")

                            if not body_html and body_text:
                                body_html = f"<pre style='font-family: sans-serif; white-space: pre-wrap;'>{body_text}</pre>"
                        else:
                            c_type = msg.get_content_type()
                            raw_payload = msg.get_payload(decode=True)
                            if raw_payload:
                                if c_type == "text/html":
                                    try:
                                        body_html = raw_payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
                                    except Exception:
                                        body_html = raw_payload.decode(errors="ignore")
                                elif c_type == "text/calendar" or b"BEGIN:VCALENDAR" in raw_payload:
                                    try:
                                        ics_text = raw_payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
                                        from src.services.crm_calendar_service import parse_vevent_ics
                                        cal_evs = parse_vevent_ics(ics_text)
                                        if cal_evs:
                                            ev = cal_evs[0]
                                            detected_calendar_event = {
                                                "uid": ev.get("uid"),
                                                "title": ev.get("title") or subject or "Invitación a Reunión",
                                                "start": ev.get("start"),
                                                "end": ev.get("end"),
                                                "description": ev.get("description") or "",
                                                "location": ev.get("location") or "",
                                                "url": ev.get("url"),
                                                "organizer": ev.get("organizer"),
                                                "attendees": ev.get("attendees") or [],
                                                "status": ev.get("status") or "CONFIRMED",
                                                "user_response": "pending",
                                                "accepted_at": None,
                                                "declined_at": None,
                                                "calendar_uid": None
                                            }
                                    except Exception as cal_err:
                                        print(f"Error parseando VEVENT en correo simple: {cal_err}")
                                else:
                                    try:
                                        body_text = raw_payload.decode(msg.get_content_charset() or "utf-8", errors="ignore")
                                    except Exception:
                                        body_text = raw_payload.decode(errors="ignore")
                                    body_html = f"<pre style='font-family: sans-serif; white-space: pre-wrap;'>{body_text}</pre>"

                        # Reemplazar URLs de imágenes inline cid:... con la ruta servible del backend
                        if body_html and cid_map:
                            for cid_val, local_url in cid_map.items():
                                body_html = re.sub(rf'cid:{re.escape(cid_val)}', local_url, body_html, flags=re.IGNORECASE)

                        # Deduplicación inteligente:
                        # Buscar correos existentes de este usuario con el mismo remitente y asunto
                        existing_records = (await db.execute(
                            select(CRMEmail).where(
                                and_(
                                    CRMEmail.user_id == user.id,
                                    CRMEmail.sender_email == sender_email,
                                    CRMEmail.subject == subject,
                                    CRMEmail.direction == CRMEmailDirection.INBOUND
                                )
                            )
                        )).scalars().all()

                        matched_record = None
                        clean_body_snippet = (body_text or re.sub(r'<[^>]+>', ' ', body_html)).strip()[:140]
                        for ex in existing_records:
                            # 1. Si la fecha del correo coincide dentro de un margen razonable (120s)
                            if msg_date and ex.created_at and abs((ex.created_at - msg_date).total_seconds()) < 120:
                                matched_record = ex
                                break
                            # 2. Si el cuerpo de texto o contenido es idéntico
                            ex_snippet = (ex.body_text or re.sub(r'<[^>]+>', ' ', ex.body_html or '')).strip()[:140]
                            if clean_body_snippet and ex_snippet and clean_body_snippet == ex_snippet:
                                matched_record = ex
                                break

                        if matched_record:
                            needs_update = False
                            # Si fue leído desde el gestor de correos de cPanel, actualizarlo en el CRM
                            if is_seen_in_cpanel and not matched_record.is_read:
                                matched_record.is_read = True
                                needs_update = True
                            # Si tenía la fecha del servidor en vez de la fecha real del correo, corregirla
                            if msg_date and matched_record.created_at != msg_date:
                                matched_record.created_at = msg_date
                                needs_update = True
                            # Si se detectó un evento de reunión y no estaba guardado
                            if detected_calendar_event and not matched_record.calendar_event:
                                matched_record.calendar_event = json.dumps(detected_calendar_event)
                                needs_update = True
                            if needs_update:
                                db.add(matched_record)
                                await db.commit()
                            continue

                        # Vincular con Prospecto CRM si existe
                        lead_res = await db.execute(select(CRMLead).where(CRMLead.email == sender_email.lower()))
                        lead = lead_res.scalars().first()

                        email_rec = CRMEmail(
                            lead_id=lead.id if lead else None,
                            project_id=lead.project_id if lead else None,
                            user_id=user.id,
                            direction=CRMEmailDirection.INBOUND,
                            sender_email=sender_email,
                            recipient_email=recipient_email,
                            subject=subject,
                            body_html=body_html or "<p>(Sin contenido)</p>",
                            body_text=body_text or None,
                            status=CRMEmailStatus.RECEIVED,
                            is_read=is_seen_in_cpanel,
                            is_starred=False,
                            is_archived=False,
                            is_deleted=False,
                            calendar_event=json.dumps(detected_calendar_event) if detected_calendar_event else None,
                            attachments=json.dumps(attachments) if attachments else None,
                            created_at=msg_date or datetime.utcnow()
                        )
                        db.add(email_rec)
                        await db.commit()
                        synced_count += 1

                        # Registrar en timeline de actividades del lead
                        if lead:
                            att_suffix = f" ({len(attachments)} adjunto{'s' if len(attachments) > 1 else ''})" if attachments else ""
                            activity = CRMActivity(
                                lead_id=lead.id,
                                user_id=user.id,
                                type=CRMActivityType.NOTA,
                                title=f"📩 Correo recibido de {lead.name}: {subject[:50]}{att_suffix}",
                                description=f"Recibido desde {sender_email}"
                            )
                            db.add(activity)
                            await db.commit()

                except Exception as email_err:
                    print(f"Error procesando correo individual ID {e_id}: {email_err}")
                    await db.rollback()
                    continue

            mail.logout()
        except Exception as e:
            print(f"Error al sincronizar IMAP cPanel: {e}")
            is_auth_err = "AUTHENTICATIONFAILED" in str(e).upper() or "LOGIN FAILED" in str(e).upper()
            return {
                "synced_count": synced_count, 
                "error": str(e),
                "needs_password": is_auth_err,
                "has_saved_password": bool(user.imap_password or settings.IMAP_PASSWORD)
            }

        return {
            "synced_count": synced_count,
            "has_saved_password": bool(user.imap_password or settings.IMAP_PASSWORD),
            "needs_password": False,
            "message": f"Sincronización exitosa con cPanel ({host}). {synced_count} nuevos correos importados." if synced_count > 0 else "Bandeja actualizada. No hay correos nuevos."
        }
