from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import desc, or_, and_

from src.models.crm_email import CRMEmail, CRMEmailDirection, CRMEmailStatus
from src.models.crm import CRMLead, CRMProject, CRMActivity, CRMActivityType
from src.models.user import User
from src.services.email_service import EmailService

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

        if folder == "inbox":
            stmt = stmt.where(CRMEmail.direction == CRMEmailDirection.INBOUND)
        elif folder == "sent":
            stmt = stmt.where(and_(CRMEmail.direction == CRMEmailDirection.OUTBOUND, CRMEmail.user_id == user_id))

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
                "status": e.status,
                "is_read": e.is_read,
                "created_at": e.created_at.isoformat() if e.created_at else None
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
                "created_at": e.created_at.isoformat() if e.created_at else None
            }
            for e in emails
        ]

    @staticmethod
    async def send_crm_email(
        db: AsyncSession, 
        user: User, 
        recipient_email: str, 
        subject: str, 
        body_html: str,
        lead_id: Optional[int] = None,
        project_id: Optional[int] = None
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

        # Enviar vía Resend API con Reply-To al correo corporativo del asesor
        success = EmailService.send_crm_custom_email(
            to_email=recipient_email.strip(),
            subject=subject.strip(),
            html_content=body_html,
            from_name=user.name,
            reply_to_email=user.email
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
            is_read=True
        )
        db.add(email_record)
        await db.commit()
        await db.refresh(email_record)

        # Registrar automáticamente la actividad en el timeline del prospecto
        if lead_id:
            activity = CRMActivity(
                lead_id=lead_id,
                user_id=user.id,
                type=CRMActivityType.NOTA,
                title=f"📧 Correo enviado: {subject[:60]}",
                description=f"Enviado a {recipient_email}. Asesor: {user.name}"
            )
            db.add(activity)
            await db.commit()

        return {
            "id": email_record.id,
            "status": email_record.status,
            "subject": email_record.subject,
            "recipient_email": email_record.recipient_email,
            "created_at": email_record.created_at.isoformat() if email_record.created_at else None
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
        imap_pass: Optional[str] = None
    ) -> dict:
        """Sincroniza la bandeja de entrada de cPanel (host81.latinoamericahosting.com:993) buscando respuestas de prospectos."""
        import imaplib
        import email
        from email.header import decode_header
        from src.core.config import settings

        host = settings.IMAP_HOST or "host81.latinoamericahosting.com"
        port = settings.IMAP_PORT or 993
        username = imap_user or settings.IMAP_USER or user.email
        password = imap_pass or settings.IMAP_PASSWORD

        if not password:
            return {
                "synced_count": 0,
                "message": f"Servidor cPanel IMAP ({host}:993) listo. Ingresa la contraseña de la cuenta para sincronizar."
            }

        synced_count = 0
        try:
            # Conexión SSL segura a cPanel
            mail = imaplib.IMAP4_SSL(host, port)
            mail.login(username, password)
            mail.select("INBOX")

            # Buscar últimos 20 correos
            status, messages = mail.search(None, "ALL")
            email_ids = messages[0].split()
            recent_ids = email_ids[-20:] if len(email_ids) > 20 else email_ids

            for e_id in reversed(recent_ids):
                res, msg_data = mail.fetch(e_id, "(RFC822)")
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        
                        # Extraer asunto
                        subject, encoding = decode_header(msg["Subject"])[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding or "utf-8", errors="ignore")

                        # Extraer remitente
                        sender = msg.get("From")
                        sender_email = sender
                        if "<" in sender and ">" in sender:
                            sender_email = sender.split("<")[1].split(">")[0].strip()

                        # Ignorar correos salientes propios
                        if sender_email.lower() == username.lower():
                            continue

                        # Buscar si ya existe registrado por asunto y fecha aproximada
                        existing = await db.execute(
                            select(CRMEmail).where(
                                and_(
                                    CRMEmail.sender_email == sender_email,
                                    CRMEmail.subject == subject,
                                    CRMEmail.direction == CRMEmailDirection.INBOUND
                                )
                            )
                        )
                        if existing.scalars().first():
                            continue

                        # Extraer cuerpo del mensaje
                        body_html = ""
                        if msg.is_multipart():
                            for part in msg.walk():
                                content_type = part.get_content_type()
                                if content_type == "text/html":
                                    body_html = part.get_payload(decode=True).decode(errors="ignore")
                                    break
                                elif content_type == "text/plain" and not body_html:
                                    text_content = part.get_payload(decode=True).decode(errors="ignore")
                                    body_html = f"<pre style='font-family: sans-serif;'>{text_content}</pre>"
                        else:
                            text_content = msg.get_payload(decode=True).decode(errors="ignore")
                            body_html = f"<pre style='font-family: sans-serif;'>{text_content}</pre>"

                        # Vincular con Prospecto CRM si existe
                        lead_res = await db.execute(select(CRMLead).where(CRMLead.email == sender_email.lower()))
                        lead = lead_res.scalars().first()

                        email_rec = CRMEmail(
                            lead_id=lead.id if lead else None,
                            project_id=lead.project_id if lead else None,
                            user_id=user.id,
                            direction=CRMEmailDirection.INBOUND,
                            sender_email=sender_email,
                            recipient_email=username,
                            subject=subject,
                            body_html=body_html or "<p>(Sin contenido)</p>",
                            status=CRMEmailStatus.RECEIVED,
                            is_read=False
                        )
                        db.add(email_rec)
                        await db.commit()
                        synced_count += 1

                        # Registrar en timeline de actividades
                        if lead:
                            activity = CRMActivity(
                                lead_id=lead.id,
                                user_id=user.id,
                                type=CRMActivityType.NOTA,
                                title=f"📩 Correo recibido de {lead.name}: {subject[:50]}",
                                description=f"Recibido desde {sender_email}"
                            )
                            db.add(activity)
                            await db.commit()

            mail.logout()
        except Exception as e:
            print(f"Error al sincronizar IMAP cPanel: {e}")
            return {"synced_count": synced_count, "error": str(e)}

        return {
            "synced_count": synced_count,
            "message": f"Sincronización exitosa con cPanel ({host}). {synced_count} nuevos correos importados."
        }
