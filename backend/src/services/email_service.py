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
