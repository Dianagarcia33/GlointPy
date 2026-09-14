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


def _format_datetime(dt: Optional[datetime]) -> Optional[str]:
    """Formatea la fecha a ISO-8601 con sufijo Z (UTC) para que el navegador la convierta a la hora local del usuario."""
    if not dt:
        return None
    s = dt.isoformat()
    if not s.endswith("Z") and "+" not in s:
        return s + "Z"
    return s


class CRMEmailService:
    @staticmethod
    async def get_user_emails(
        db: AsyncSession, 
        user_id: int, 
        folder: str = "inbox", 
        search: Optional[str] = None
    ) -> List[dict]:
        """Obtiene la lista de correos de la bandeja (inbox, sent, lead_id)."""
        stmt = (
            select(CRMEmail)
            .options(selectinload(CRMEmail.lead), selectinload(CRMEmail.project), selectinload(CRMEmail.user))
        )

        if user_id:
            stmt = stmt.where(CRMEmail.user_id == user_id)

        if folder == "inbox":
            stmt = stmt.where(
                and_(
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
                    or_(
                        CRMEmail.direction.in_(["outbound", "OUTBOUND", CRMEmailDirection.OUTBOUND]),
                        CRMEmail.status.in_([CRMEmailStatus.SENT, CRMEmailStatus.DELIVERED, "sent", "delivered"])
                    ),
                    CRMEmail.direction.notin_(["inbound", "INBOUND", CRMEmailDirection.INBOUND]),
                    CRMEmail.status.notin_([CRMEmailStatus.RECEIVED, "received"])
                )
            )

        if search:
            stmt = stmt.where(or_(
                CRMEmail.subject.ilike(f"%{search}%"),
                CRMEmail.recipient_email.ilike(f"%{search}%"),
                CRMEmail.sender_email.ilike(f"%{search}%")
            ))

        stmt = stmt.order_by(desc(CRMEmail.created_at))
        res = await db.execute(stmt)
        emails = res.scalars().all()

        return [
            {
                "id": e.id,
                "lead_id": e.lead_id,
                "lead_name": e.lead.name if e.lead else None,
                "project_id": e.project_id,
                "project_name": e.project.name if e.project else None,
                "user_id": e.user_id,
                "user_name": e.user.name if e.user else "Asesor",
                "direction": e.direction,
                "sender_email": e.sender_email,
                "recipient_email": e.recipient_email,
                "subject": e.subject,
                "body_html": e.body_html,
                "body_text": e.body_text,
                "status": e.status,
                "is_read": e.is_read,
                "attachments": _parse_attachments(e.attachments),
                "created_at": _format_datetime(e.created_at)
            }
            for e in emails
        ]

    @staticmethod
    async def get_lead_emails(db: AsyncSession, lead_id: int) -> List[dict]:
        """Obtiene el historial de correos de un prospecto en específico."""
        stmt = (
            select(CRMEmail)
            .options(selectinload(CRMEmail.user))
            .where(CRMEmail.lead_id == lead_id)
            .order_by(desc(CRMEmail.created_at))
        )
        res = await db.execute(stmt)
        emails = res.scalars().all()

        return [
            {
                "id": e.id,
                "lead_id": e.lead_id,
                "direction": e.direction,
                "sender_email": e.sender_email,
                "recipient_email": e.recipient_email,
                "user_name": e.user.name if e.user else "Asesor",
                "subject": e.subject,
                "body_html": e.body_html,
                "status": e.status,
                "attachments": _parse_attachments(e.attachments),
                "created_at": _format_datetime(e.created_at)
            }
            for e in emails
        ]

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
    async def send_crm_email(
        db: AsyncSession, 
        user: User, 
        recipient_email: str, 
        subject: str, 
        body_html: str,
        lead_id: Optional[int] = None,
        project_id: Optional[int] = None,
        attachments: Optional[List[dict]] = None
    ) -> dict:
        """Envía un correo comercial a través de Resend, guarda la copia en la BD y registra la actividad."""
        # Si no especifica lead_id pero el correo coincide con un lead
        if not lead_id:
            lead_res = await db.execute(select(CRMLead).where(CRMLead.email == recipient_email.strip()))
            found_lead = lead_res.scalars().first()
            if found_lead:
                lead_id = found_lead.id
                if not project_id:
                    project_id = found_lead.project_id

        # Enviar vía Resend API con Reply-To al correo corporativo del asesor y adjuntos
        success = EmailService.send_crm_custom_email(
            to_email=recipient_email.strip(),
            subject=subject.strip(),
            html_content=body_html,
            from_name=user.name,
            reply_to_email=user.email,
            attachments=attachments
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
            attachments=json.dumps(attachments) if attachments else None
        )
        db.add(email_record)
        await db.commit()
        await db.refresh(email_record)

        # Registrar automáticamente la actividad en el timeline del prospecto
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

        return {
            "id": email_record.id,
            "status": email_record.status,
            "subject": email_record.subject,
            "recipient_email": email_record.recipient_email,
            "attachments": attachments or [],
            "created_at": _format_datetime(email_record.created_at)
        }

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

                                is_attachment = ("attachment" in c_disp.lower()) or bool(filename)

                                # Si no es adjunto y es texto plano o HTML del mensaje principal
                                if not is_attachment and not filename and not cid:
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

                                # Es un archivo adjunto o una imagen (inline o adjunta)
                                payload = part.get_payload(decode=True)
                                if not payload:
                                    continue

                                if not filename:
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
                                        "content_type": c_type,
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
