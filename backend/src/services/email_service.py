import resend
from src.core.config import settings

class EmailService:
    @staticmethod
    def send_password_reset_email(to_email: str, reset_token: str):
        if not settings.RESEND_API_KEY:
            print("WARNING: RESEND_API_KEY is not set. Skipping email send.")
            print(f"Mock Reset Token for {to_email}: {reset_token}")
            return False

        resend.api_key = settings.RESEND_API_KEY
        
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0;">Recuperación de Contraseña</h2>
                <p style="color: #64748b; font-size: 14px;">GLOINT International Partners</p>
            </div>
            
            <p style="color: #334155; line-height: 1.6;">
                Hola,
            </p>
            <p style="color: #334155; line-height: 1.6;">
                Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, haz clic en el siguiente botón para crear una nueva contraseña. 
                Este enlace expirará en 15 minutos por seguridad.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Restablecer mi Contraseña
                </a>
            </div>
            
            <p style="color: #334155; line-height: 1.6;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
                <br>
                <a href="{reset_link}" style="color: #3b82f6; word-break: break-all;">{reset_link}</a>
            </p>
            
            <p style="color: #334155; line-height: 1.6; margin-top: 30px;">
                Si no solicitaste un cambio de contraseña, puedes ignorar este correo de forma segura.
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                © 2026 GLOINT. Todos los derechos reservados.
            </div>
        </div>
        """

        try:
            r = resend.Emails.send({
                "from": f"GLOINT <{settings.SENDER_EMAIL}>",
                "to": to_email,
                "subject": "Recuperación de Contraseña - GLOINT",
                "html": html_content
            })
            return True
        except Exception as e:
            print(f"Error sending email via Resend: {e}")
            return False

    @staticmethod
    def send_crm_custom_email(
        to_email: str, 
        subject: str, 
        html_content: str, 
        from_name: str = "GLOINT Comercial",
        reply_to_email: str = None
    ) -> bool:
        if not settings.RESEND_API_KEY:
            print("WARNING: RESEND_API_KEY is not set. Skipping CRM email dispatch.")
            print(f"Mock Email to {to_email} | Subject: {subject}")
            return True

        resend.api_key = settings.RESEND_API_KEY
        
        email_payload = {
            "from": f"{from_name} <{settings.SENDER_EMAIL}>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        }
        if reply_to_email:
            email_payload["reply_to"] = reply_to_email

        try:
            resend.Emails.send(email_payload)
            return True
        except Exception as e:
            print(f"Error al enviar correo CRM vía Resend: {e}")
            return False

    @staticmethod
    def send_withdrawal_verification_code(to_email: str, code: str):
        if not settings.RESEND_API_KEY:
            print("WARNING: RESEND_API_KEY is not set. Skipping email send.")
            print(f"Mock Withdrawal Code for {to_email}: {code}")
            return False

        resend.api_key = settings.RESEND_API_KEY
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0;">Verificación de Retiro</h2>
                <p style="color: #64748b; font-size: 14px;">GLOINT International Partners</p>
            </div>
            
            <p style="color: #334155; line-height: 1.6;">
                Hola,
            </p>
            <p style="color: #334155; line-height: 1.6;">
                Recibimos una solicitud para retirar fondos de tu billetera. Para autorizar esta transacción, utiliza el siguiente código de seguridad:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
                <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #0f172a;">{code}</span>
                </div>
                <p style="color: #64748b; font-size: 12px; margin-top: 10px;">
                    Este código expirará en 10 minutos.
                </p>
            </div>
            
            <p style="color: #334155; line-height: 1.6;">
                <strong>Nota:</strong> Nunca compartas este código con nadie. El equipo de GLOINT nunca te pedirá tu código de verificación.
            </p>
            
            <p style="color: #334155; line-height: 1.6; margin-top: 30px;">
                Si no solicitaste este retiro, por favor ignora este correo y asegúrate de que tu cuenta esté protegida.
            </p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                © 2026 GLOINT. Todos los derechos reservados.
            </div>
        </div>
        """

        try:
            r = resend.Emails.send({
                "from": f"GLOINT <{settings.SENDER_EMAIL}>",
                "to": to_email,
                "subject": "Código de Verificación para Retiro - GLOINT",
                "html": html_content
            })
            return True
        except Exception as e:
            print(f"Error sending email via Resend: {e}")
            return False

    @staticmethod
    def send_html_email(to_email: str, subject: str, html_content: str):
        if not settings.RESEND_API_KEY:
            print("WARNING: RESEND_API_KEY is not set. Skipping email send.")
            return False

        resend.api_key = settings.RESEND_API_KEY
        try:
            resend.Emails.send({
                "from": f"GLOINT <{settings.SENDER_EMAIL}>",
                "to": to_email,
                "subject": subject,
                "html": html_content
            })
            return True
        except Exception as e:
            print(f"Error sending email via Resend: {e}")
            return False

    @staticmethod
    def send_withdrawal_approval_email(to_email: str, user_name: str, amount: float, method: str, bank: str, account_number: str):
        subject = "¡Tu retiro ha sido aprobado y enviado! - GLOINT"
        html_content = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4f46e5;">¡Hola {user_name}!</h2>
                <p>Nos complace informarte que tu solicitud de retiro ha sido <strong>aprobada y procesada</strong> exitosamente.</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1e293b;">Detalles del Retiro</h3>
                    <ul style="list-style-type: none; padding-left: 0;">
                        <li style="margin-bottom: 8px;"><strong>Monto Procesado:</strong> ${amount:,.2f} COP</li>
                        <li style="margin-bottom: 8px;"><strong>Método de Pago:</strong> {method}</li>
                        <li style="margin-bottom: 8px;"><strong>Banco Destino:</strong> {bank}</li>
                        <li style="margin-bottom: 8px;"><strong>Cuenta Destino:</strong> {account_number}</li>
                    </ul>
                </div>
                <p>Ten en cuenta que dependiendo de tu entidad bancaria, los fondos pueden tardar algunas horas en verse reflejados en tu cuenta.</p>
                <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte.</p>
                <br>
                <p>Atentamente,<br><strong>El Equipo de GLOINT</strong></p>
            </body>
        </html>
        """
        return EmailService.send_html_email(to_email, subject, html_content)

    @staticmethod
    def send_chatbot_lead_investor_confirmation(
        to_email: str,
        investor_name: str,
        director_name: str,
        package_name: str,
        preferred_time: str = None
    ) -> bool:
        subject = "Solicitud de Asesoría de Inversión Recibida - GLOINT Investment"
        time_text = f"<p style='color: #475569; margin: 4px 0; font-size: 13px;'><strong>Horario preferido de llamada:</strong> {preferred_time}</p>" if preferred_time else ""
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0; font-size: 22px;">GLOINT Investment</h2>
                <p style="color: #d97706; font-size: 13px; font-weight: bold; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Gestión Estratégica de Capital</p>
            </div>
            
            <p style="color: #1e293b; font-size: 15px; line-height: 1.6;">
                Estimado/a <strong>{investor_name}</strong>,
            </p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Agradecemos tu interés en formar parte de nuestro fondo de inversión. Hemos recibido satisfactoriamente tu solicitud de asesoría personalizada para el paquete <strong>{package_name}</strong>.
            </p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #d97706; padding: 16px; border-radius: 6px; margin: 20px 0;">
                <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px;">Asignación a Mesa Directiva</h4>
                <p style="color: #475569; margin: 4px 0; font-size: 13px;"><strong>Directivo de Inversión Asignado:</strong> {director_name}</p>
                <p style="color: #475569; margin: 4px 0; font-size: 13px;"><strong>Paquete de Interés:</strong> {package_name}</p>
                {time_text}
            </div>
            
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Tu directivo asignado se comunicará contigo vía telefónica o por este medio para presentarte los indicadores de rendimiento, contratos de garantía y resolver cualquier inquietud de forma personalizada.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                <p style="margin: 0;">GLOINT International Partners • Bogotá, Colombia</p>
                <p style="margin: 4px 0 0 0;">Este es un mensaje automático de confirmación de solicitud.</p>
            </div>
        </div>
        """
        return EmailService.send_html_email(to_email, subject, html_content)

    @staticmethod
    def send_chatbot_lead_director_notification(
        to_email: str,
        director_name: str,
        lead_data: dict
    ) -> bool:
        investor_name = lead_data.get("name", "Prospecto")
        subject = f"🎯 Nuevo Prospecto Asignado: {investor_name} - GLOINT CRM"
        pkg_name = lead_data.get("package_name") or f"${lead_data.get('package_value', 0):,.0f} COP"
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px;">
                <h2 style="color: #0f172a; margin: 0; font-size: 22px;">Asignación de Lead Calificado</h2>
                <p style="color: #059669; font-size: 13px; font-weight: bold; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px;">Chatbot Landing Web • CRM Gloint</p>
            </div>
            
            <p style="color: #1e293b; font-size: 15px; line-height: 1.6;">
                Hola <strong>{director_name}</strong>,
            </p>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Se te ha asignado un nuevo prospecto de inversión de manera equitativa a través del Chatbot de la Landing Page. A continuación los detalles para tu contacto y cierre:
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 18px; border-radius: 8px; margin: 20px 0;">
                <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.8;">
                    <tr><td style="font-weight: bold; width: 150px;">Inversionista:</td><td>{lead_data.get('name')}</td></tr>
                    <tr><td style="font-weight: bold;">Teléfono / WhatsApp:</td><td><a href="tel:{lead_data.get('phone')}" style="color: #2563eb; text-decoration: none;">{lead_data.get('phone')}</a></td></tr>
                    <tr><td style="font-weight: bold;">Correo:</td><td><a href="mailto:{lead_data.get('email')}" style="color: #2563eb; text-decoration: none;">{lead_data.get('email')}</a></td></tr>
                    <tr><td style="font-weight: bold;">Ciudad / Dpto:</td><td>{lead_data.get('city', 'N/A')} ({lead_data.get('department', '')})</td></tr>
                    <tr><td style="font-weight: bold;">Paquete de Interés:</td><td style="color: #d97706; font-weight: bold;">{pkg_name}</td></tr>
                    <tr><td style="font-weight: bold;">Objetivo:</td><td>{lead_data.get('investment_goal', 'Inversión')}</td></tr>
                    <tr><td style="font-weight: bold;">Horario de contacto:</td><td>{lead_data.get('preferred_contact_time', 'Indiferente')}</td></tr>
                </table>
            </div>
            
            <p style="color: #334155; font-size: 13px; line-height: 1.6;">
                El prospecto ya está registrado en tu tablero de <strong>CRM Leads</strong> en la etapa <em>Lead Entrante</em>.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
                © 2026 GLOINT International Partners. Sistema de Asignación Comercial.
            </div>
        </div>
        """
        return EmailService.send_html_email(to_email, subject, html_content)

