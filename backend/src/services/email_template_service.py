"""
Servicio y Estándar de Plantillas Corporativas de Correo Electrónico para GLOINT.

Este módulo define el estándar de diseño visual e identidad de marca para todas las 
comunicaciones por correo electrónico de Gloint International Partners.
Diseño minimalista, ultra-limpio, en modo claro con contrastes ejecutivos de alta gama.
Compatible con todos los clientes de correo (Gmail, Outlook, Apple Mail, Yahoo, iOS/Android).
"""

from typing import Optional, Tuple, List
from datetime import datetime
from src.core.config import settings

class EmailTemplateService:

    @staticmethod
    def get_email_logo_url() -> str:
        """
        Retorna la URL pública del logotipo oficial de Gloint para incrustar en correos.
        """
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        if frontend_url and "localhost" not in frontend_url and "127.0.0.1" not in frontend_url:
            return f"{frontend_url}/logo.png"
        return "https://gloint.co/logo.png"

    @classmethod
    def build_corporate_email_layout(
        cls,
        title: str,
        preheader: str,
        content_html: str,
        badge_text: Optional[str] = None,
        badge_variant: str = "orange",
        cta_text: Optional[str] = None,
        cta_url: Optional[str] = None,
        secondary_cta_text: Optional[str] = None,
        secondary_cta_url: Optional[str] = None,
        support_email: Optional[str] = None
    ) -> str:
        """
        Genera el HTML estándar con la imagen corporativa oficial de Gloint:
        - Canvas modo claro ultra limpio (#f8fafc)
        - Tarjeta blanca pura (#ffffff) con borde sutil (#e2e8f0)
        - Cabecera limpia con ÚNICAMENTE el imagotipo oficial (sin duplicidad de nombre)
        - Tipografía ejecutiva de alta legibilidad
        - Botones de acción modernos con paleta de marca Gloint
        """
        logo_url = cls.get_email_logo_url()
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        sup_email = support_email or settings.SENDER_EMAIL or "soporte@gloint.com.co"

        # Badge Variants (Suaves, modernos y legibles en modo claro)
        badge_styles = {
            "orange": "background-color: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;",
            "green": "background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;",
            "amber": "background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a;",
            "blue": "background-color: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;",
            "red": "background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;",
        }
        b_style = badge_styles.get(badge_variant.lower(), badge_styles["orange"])

        badge_html = ""
        if badge_text:
            badge_html = f"""
            <tr>
                <td style="padding-bottom: 14px;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 4px 12px; border-radius: 20px; {b_style} font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                        {badge_text}
                    </span>
                </td>
            </tr>
            """

        # CTA Buttons
        cta_html = ""
        if cta_text and cta_url:
            secondary_btn_html = ""
            if secondary_cta_text and secondary_cta_url:
                secondary_btn_html = f"""
                <a href="{secondary_cta_url}" target="_blank" style="background-color: #ffffff; color: #475569; font-weight: 600; font-size: 13.5px; padding: 12px 22px; border-radius: 10px; text-decoration: none; display: inline-block; border: 1px solid #cbd5e1; margin-left: 10px; margin-top: 8px;">
                    {secondary_cta_text}
                </a>
                """

            cta_html = f"""
            <tr>
                <td align="center" style="padding: 28px 0 10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                        <tr>
                            <td align="center">
                                <a href="{cta_url}" target="_blank" style="background-color: #f97316; background-image: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 30px; border-radius: 10px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25); text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; letter-spacing: 0.2px;">
                                    {cta_text}
                                </a>
                                {secondary_btn_html}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            """

        return f"""<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, a {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- Hidden Preheader for email preview snippets -->
    <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #f8fafc; opacity: 0;">
        {preheader}
    </div>
    
    <!-- Outer Table Canvas (Fondo Claro Elegante) -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; width: 100%; padding: 40px 12px;">
        <tr>
            <td align="center">
                <!-- Main 580px Container (Tarjeta Blanca Impecable) -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);">
                    
                    <!-- Línea sutil de acento de marca -->
                    <tr>
                        <td style="height: 3px; background-color: #f97316; background-image: linear-gradient(90deg, #f97316 0%, #ea580c 50%, #fbbf24 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    
                    <!-- Cabecera limpia en fondo blanco: ÚNICAMENTE el imagotipo oficial -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 32px 32px 22px; text-align: center; border-bottom: 1px solid #f1f5f9;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center">
                                        <a href="{frontend_url}" target="_blank" style="text-decoration: none; display: inline-block;">
                                            <img src="{logo_url}" alt="Gloint" width="130" style="height: auto; max-height: 38px; display: block; border: 0; outline: none; margin: 0 auto;" />
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Card Content -->
                    <tr>
                        <td style="padding: 36px 36px 28px; background-color: #ffffff;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                
                                {badge_html}

                                <!-- Main Heading -->
                                <tr>
                                    <td style="padding-bottom: 18px;">
                                        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; letter-spacing: -0.4px;">
                                            {title}
                                        </h1>
                                    </td>
                                </tr>

                                <!-- Dynamic Content -->
                                <tr>
                                    <td style="font-size: 14.5px; line-height: 1.65; color: #334155;">
                                        {content_html}
                                    </td>
                                </tr>

                                <!-- Primary Call to Action -->
                                {cta_html}

                            </table>
                        </td>
                    </tr>

                    <!-- Security & Trust Notice Box -->
                    <tr>
                        <td style="padding: 0 36px 28px; background-color: #ffffff;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 14px 18px;">
                                <tr>
                                    <td style="width: 24px; vertical-align: top; padding-right: 12px; font-size: 16px; line-height: 1.4;">
                                        🔒
                                    </td>
                                    <td style="font-size: 12px; line-height: 1.5; color: #64748b;">
                                        <strong style="color: #0f172a;">Compromiso de Seguridad & SARLAFT:</strong> Tu cuenta y activos están respaldados bajo estrictos protocolos de debida diligencia. El equipo de Gloint nunca te solicitará contraseñas ni claves por correo electrónico.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Corporate Clean Footer -->
                    <tr>
                        <td style="background-color: #fafbfc; padding: 28px 36px; border-top: 1px solid #f1f5f9; text-align: center;">
                            <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #0f172a;">
                                ¿Tienes preguntas o necesitas asistencia personalizada?
                            </p>
                            <p style="margin: 0 0 20px; font-size: 12.5px; color: #64748b;">
                                Escríbenos a nuestro canal oficial: <a href="mailto:{sup_email}" style="color: #f97316; font-weight: 600; text-decoration: none;">{sup_email}</a>
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 6px;">
                                <tr>
                                    <td align="center" style="font-size: 11px; line-height: 1.6; color: #94a3b8;">
                                        <p style="margin: 0 0 4px; font-weight: 500;">
                                            © 2026 GLOINT International Partners. Todos los derechos reservados.
                                        </p>
                                        <p style="margin: 0 0 4px;">
                                            Bogotá, Colombia • Gestión Estratégica de Inversiones y Capital
                                        </p>
                                        <p style="margin: 0; font-size: 10px; color: #cbd5e1;">
                                            Este es un correo oficial automatizado dirigido exclusivamente al titular registrado en Gloint.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    @classmethod
    def get_welcome_and_review_template(
        cls,
        user_name: str,
        document_id: str,
        document_type: str = "CC"
    ) -> Tuple[str, str]:
        """
        Correo 1: Bienvenida al registrarse + Notificación del proceso de revisión SARLAFT.
        """
        masked_doc = f"{document_id[-4:]}" if len(str(document_id)) >= 4 else str(document_id)
        subject = "¡Bienvenido a Gloint! - Registro exitoso y verificación en curso"
        title = "¡Bienvenido a Gloint International Partners!"
        preheader = f"Hola {user_name}, tu cuenta ha sido creada exitosamente. Tu validación preventiva de antecedentes está en curso."

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Nos complace darte la más cordial bienvenida a <strong>Gloint International Partners</strong>, tu ecosistema estratégico para la estructuración, crecimiento y protección de capital patrimonial.
        </p>
        
        <!-- Info Highlight Box -->
        <div style="background-color: #fff7ed; border-left: 3px solid #f97316; border-radius: 10px; padding: 16px 18px; margin: 20px 0;">
            <div style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px;">
                Estado de tu Cuenta: En Verificación Preventiva (SARLAFT)
            </div>
            <p style="margin: 0; font-size: 13px; color: #7c2d12; line-height: 1.55;">
                Por políticas de debida diligencia y seguridad para toda nuestra comunidad de inversionistas, tu documento de identidad (<strong>{document_type} ••••{masked_doc}</strong>) está siendo consultado de forma automatizada en listas de control con <strong>TusDatos.co</strong>.
            </p>
        </div>

        <div style="margin: 22px 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">
            ¿Qué puedes hacer mientras se completa la verificación?
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.6;">
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #f97316; font-weight: bold; font-size: 16px; line-height: 1.2;">•</td>
                <td style="padding: 6px 0;"><strong>Consulta automatizada en curso:</strong> Este proceso toma habitualmente pocos minutos.</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #f97316; font-weight: bold; font-size: 16px; line-height: 1.2;">•</td>
                <td style="padding: 6px 0;"><strong>Explora la plataforma:</strong> Ya puedes iniciar sesión para conocer el panel de control, consultar el catálogo de paquetes y simular proyecciones de rendimiento.</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #f97316; font-weight: bold; font-size: 16px; line-height: 1.2;">•</td>
                <td style="padding: 6px 0;"><strong>Notificación de activación:</strong> Tan pronto culmine la validación, recibirás un correo de confirmación habilitando al 100% tus inversiones y recargas de saldo.</td>
            </tr>
        </table>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="REGISTRO EXITOSO & SEGURIDAD",
            badge_variant="orange",
            cta_text="Ingresar a mi Cuenta Gloint",
            cta_url=f"{settings.FRONTEND_URL.rstrip('/')}/login"
        )
        return subject, html

    @classmethod
    def get_sarlaft_approved_template(
        cls,
        user_name: str,
        document_id: str,
        document_type: str = "CC"
    ) -> Tuple[str, str]:
        """
        Correo 2A: Validación exitosa de TusDatos (Aprobada / Sin hallazgos).
        """
        masked_doc = f"{document_id[-4:]}" if len(str(document_id)) >= 4 else str(document_id)
        subject = "✅ ¡Tu cuenta ha sido validada exitosamente! - Gloint"
        title = "¡Tu cuenta ha sido validada exitosamente!"
        preheader = f"Hola {user_name}, tu verificación de identidad y antecedentes ha concluido satisfactoriamente. Tu cuenta está 100% activa."

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            ¡Tenemos excelentes noticias! El proceso de consulta y validación de antecedentes e identidad para tu documento (<strong>{document_type} ••••{masked_doc}</strong>) ha finalizado <strong>exitosamente</strong> sin ninguna novedad restrictiva.
        </p>
        
        <!-- Success Card -->
        <div style="background-color: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 10px; padding: 16px 18px; margin: 20px 0;">
            <div style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.5px;">
                Cuenta 100% Habilitada para Invertir
            </div>
            <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.55;">
                Tu perfil cumple a cabalidad con todos los estándares SARLAFT y de debida diligencia de Gloint. Todas las operaciones y productos de inversión han quedado desbloqueados.
            </p>
        </div>

        <div style="margin: 22px 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">
            Ya puedes acceder a todos los beneficios de la plataforma:
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.6;">
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #16a34a; font-weight: bold; font-size: 15px; line-height: 1.2;">✓</td>
                <td style="padding: 6px 0;"><strong>Contratación de Inversiones:</strong> Adquiere paquetes y comienza a generar rendimientos periódicos o acumulados.</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #16a34a; font-weight: bold; font-size: 15px; line-height: 1.2;">✓</td>
                <td style="padding: 6px 0;"><strong>Billetera Digital:</strong> Realiza recargas seguras y programa tus retiros de capital y rendimiento con total agilidad.</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #16a34a; font-weight: bold; font-size: 15px; line-height: 1.2;">✓</td>
                <td style="padding: 6px 0;"><strong>Acompañamiento Corporativo:</strong> Recibe el respaldo de tu directivo comercial para la estructura patrimonial de tu portafolio.</td>
            </tr>
        </table>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="CUENTA VERIFICADA & HABILITADA",
            badge_variant="green",
            cta_text="Explorar Paquetes de Inversión",
            cta_url=f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/investments"
        )
        return subject, html

    @classmethod
    def get_sarlaft_findings_template(
        cls,
        user_name: str,
        document_id: str,
        document_type: str = "CC",
        risk_level: str = "MEDIUM",
        hallazgos_summary: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Correo 2B: Validación de TusDatos con hallazgos o en revisión manual complementaria.
        """
        masked_doc = f"{document_id[-4:]}" if len(str(document_id)) >= 4 else str(document_id)
        subject = "📋 Notificación sobre el estado de verificación de tu cuenta - Gloint"
        title = "Información sobre la verificación de tu cuenta"
        preheader = f"Hola {user_name}, tu validación se encuentra en revisión manual preventiva por parte de Oficialía de Cumplimiento."

        summary_text = f"<div style='margin-top: 8px; font-size: 12px; color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 6px;'><strong>Detalle preliminar:</strong> {hallazgos_summary}</div>" if hallazgos_summary else ""

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Te informamos que la consulta inicial de listas de control y antecedentes para tu documento (<strong>{document_type} ••••{masked_doc}</strong>) ha generado registros o coincidencias que requieren una <strong>revisión manual complementaria</strong> por parte de nuestro equipo de Oficialía de Cumplimiento.
        </p>
        
        <!-- Notice Card -->
        <div style="background-color: #fffbeb; border-left: 3px solid #d97706; border-radius: 10px; padding: 16px 18px; margin: 20px 0;">
            <div style="margin: 0 0 4px; font-size: 13px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
                Estado: En Revisión Manual Preventiva
            </div>
            <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.55;">
                Este proceso es habitual en casos de homonimias (nombres o identificaciones similares en bases públicas) o requerimientos de cotejo documental adicional.
            </p>
            {summary_text}
        </div>

        <div style="margin: 22px 0 10px; font-size: 14px; font-weight: 700; color: #0f172a;">
            Siguientes pasos de tu solicitud:
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.6;">
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #d97706; font-weight: bold; font-size: 16px; line-height: 1.2;">•</td>
                <td style="padding: 6px 0;"><strong>Revisión de cumplimiento:</strong> Nuestro equipo evalúa la información para verificar que no existan impedimentos normativos para la inversión.</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #d97706; font-weight: bold; font-size: 16px; line-height: 1.2;">•</td>
                <td style="padding: 6px 0;"><strong>Soporte complementario:</strong> Si se requiere algún documento complementario (como cédula ampliada o certificado), nos comunicaremos directamente contigo.</td>
            </tr>
            <tr>
                <td style="padding: 6px 0; vertical-align: top; width: 20px; color: #d97706; font-weight: bold; font-size: 16px; line-height: 1.2;">•</td>
                <td style="padding: 6px 0;"><strong>Seguimiento en línea:</strong> Puedes consultar en cualquier momento el estado actualizado de tu verificación directamente en tu perfil de usuario.</td>
            </tr>
        </table>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="REVISIÓN PREVENTIVA DE CUMPLIMIENTO",
            badge_variant="amber",
            cta_text="Consultar Estado en mi Perfil",
            cta_url=f"{settings.FRONTEND_URL.rstrip('/')}/dashboard/profile",
            secondary_cta_text="Contactar Soporte",
            secondary_cta_url=f"mailto:{settings.SENDER_EMAIL or 'soporte@gloint.com.co'}"
        )
        return subject, html

    @classmethod
    def get_password_reset_template(cls, reset_token: str) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Recuperación de Contraseña.
        """
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        subject = "Recuperación de Contraseña - Gloint"
        title = "Recuperación de Contraseña"
        preheader = "Recibimos una solicitud para restablecer la contraseña de tu cuenta en Gloint."

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Hola,
        </p>
        <p style="margin: 0 0 16px; line-height: 1.65; color: #334155;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>Gloint International Partners</strong>. Si fuiste tú, haz clic en el siguiente botón para asignar una nueva contraseña segura:
        </p>

        <div style="background-color: #fff7ed; border-left: 3px solid #f97316; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
            <p style="margin: 0; font-size: 13px; color: #7c2d12; line-height: 1.5;">
                ⏱ <strong>Enlace de seguridad temporal:</strong> Este enlace expirará en <strong>15 minutos</strong> por protección de tu cuenta.
            </p>
        </div>

        <p style="margin: 20px 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
            Si el botón no funciona en tu cliente de correo, copia y pega el siguiente enlace directo en tu navegador:
            <br>
            <a href="{reset_link}" style="color: #f97316; word-break: break-all; text-decoration: underline;">{reset_link}</a>
        </p>
        <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
            Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura; tu clave actual permanecerá protegida.
        </p>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="SEGURIDAD DE LA CUENTA",
            badge_variant="orange",
            cta_text="Restablecer mi Contraseña",
            cta_url=reset_link
        )
        return subject, html

    @classmethod
    def get_otp_verification_template(
        cls,
        user_name: str,
        code: str,
        purpose: str,
        action_details: Optional[str] = None,
        expires_minutes: int = 10
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Códigos OTP de Verificación de Seguridad (Retiros, Bóveda Bancaria, Contraseñas).
        """
        subject = f"Código de Seguridad ({code}) - Gloint"
        title = f"Código de Seguridad: {purpose}"
        preheader = f"Tu código de seguridad Gloint es {code} para autorizar: {purpose}."

        details_html = f"<p style='margin: 0 0 14px; font-size: 14px; color: #475569;'>{action_details}</p>" if action_details else ""

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Hola <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 16px; line-height: 1.65; color: #334155;">
            Has iniciado una solicitud para <strong>{purpose}</strong> en la plataforma. Para autorizar y procesar esta acción de forma segura, ingresa el siguiente código de verificación:
        </p>
        {details_html}

        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 22px 20px; text-align: center; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
                Código de Autorización
            </div>
            <div style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, monospace;">
                {code}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 8px; font-weight: 500;">
                ⏱ Válido por {expires_minutes} minutos
            </div>
        </div>

        <div style="background-color: #fff7ed; border-left: 3px solid #f97316; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12.5px; color: #7c2d12; line-height: 1.5;">
                <strong>Aviso de Confidencialidad:</strong> Nunca compartas este código con terceros. Ningún asesor ni colaborador de Gloint te solicitará este código.
            </p>
        </div>

        <p style="margin: 16px 0 0; font-size: 13px; line-height: 1.5; color: #64748b;">
            Si tú no iniciaste esta solicitud, por favor ignora este correo y contacta de inmediato al canal de soporte oficial.
        </p>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="AUTORIZACIÓN DE SEGURIDAD",
            badge_variant="orange"
        )
        return subject, html

    @classmethod
    def get_withdrawal_request_pending_template(
        cls,
        user_name: str,
        amount: float,
        tax: float,
        net_amount: float,
        bank: str,
        account_type: str,
        account_number: str,
        withdrawal_id: Optional[int] = None,
        date_str: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Solicitud de Retiro Recibida - En Proceso / Pendiente.
        """
        from datetime import datetime
        cur_date = date_str or datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
        subject = f"⏳ Solicitud de Retiro #{withdrawal_id} en Trámite - GLOINT" if withdrawal_id else "⏳ Solicitud de Retiro en Trámite - GLOINT"
        title = "Solicitud de Retiro Recibida"
        preheader = f"Hola {user_name}, hemos recibido tu solicitud de retiro por ${net_amount:,.2f} COP. Tu trámite se encuentra pendiente de dispersión bancaria."
        frontend_url = settings.FRONTEND_URL.rstrip('/')

        id_row = f"<tr><td style=\"font-weight: 600; width: 160px; color: #64748b;\">ID de Solicitud:</td><td style=\"font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;\">#{withdrawal_id}</td></tr>" if withdrawal_id else ""
        acct_label = f"{account_type} - {account_number}" if account_type else account_number

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Hemos recibido exitosamente tu solicitud de retiro de fondos desde tu cuenta Gloint. La orden ha sido registrada en el sistema y se encuentra actualmente en estado <strong>Pendiente de Dispersión Bancaria</strong>.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; margin: 22px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Detalles de la Solicitud
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.85;">
                {id_row}
                <tr>
                    <td style="font-weight: 600; width: 160px; color: #64748b;">Monto Solicitado:</td>
                    <td style="font-weight: 700; color: #0f172a;">${amount:,.2f} COP</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Retención 3.2%:</td>
                    <td style="font-weight: 600; color: #dc2626;">-${tax:,.2f} COP</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Monto Neto a Transferir:</td>
                    <td style="font-size: 17px; font-weight: 800; color: #0f172a;">${net_amount:,.2f} COP</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Entidad Bancaria:</td>
                    <td style="font-weight: 600; color: #0f172a;">{bank}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Cuenta Destino:</td>
                    <td style="font-weight: 600; color: #0f172a;">{acct_label}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Fecha de Solicitud:</td>
                    <td style="color: #0f172a;">{cur_date}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Estado Actual:</td>
                    <td>
                        <span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;">
                            ⏳ Pendiente de Dispersión
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
            <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #92400e;">
                💡 ¿Qué sucede a continuación?
            </p>
            <p style="margin: 0; font-size: 12.5px; color: #78350f; line-height: 1.55;">
                Tu orden entrará en el ciclo de dispersión bancaria automática. Tan pronto como la transferencia sea emitida y confirmada por la red interbancaria, recibirás un nuevo correo con la confirmación de pago y el comprobante de la transacción.
            </p>
        </div>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="SOLICITUD EN TRÁMITE • PENDIENTE DE DISPERSIÓN",
            badge_variant="amber",
            cta_text="Consultar Billetera en Gloint",
            cta_url=f"{frontend_url}/dashboard/wallet"
        )
        return subject, html

    @classmethod
    def get_withdrawal_approval_template(
        cls,
        user_name: str,
        amount: float,
        method: str,
        bank: str,
        account_number: str,
        tax: Optional[float] = None,
        gross_amount: Optional[float] = None,
        account_type: Optional[str] = None,
        withdrawal_id: Optional[int] = None,
        date_str: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Confirmación de Retiro Aprobado y Dispersado.
        """
        from datetime import datetime
        cur_date = date_str or datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")
        subject = f"✅ Retiro #{withdrawal_id} Aprobado y Transferido - GLOINT" if withdrawal_id else "✅ ¡Tu retiro ha sido aprobado y transferido! - GLOINT"
        title = "¡Retiro Aprobado y Procesado!"
        preheader = f"Hola {user_name}, tu retiro por ${amount:,.2f} COP ha sido aprobado y transferido exitosamente."
        frontend_url = settings.FRONTEND_URL.rstrip('/')

        id_row = f"<tr><td style=\"font-weight: 600; width: 160px; color: #64748b;\">ID de Solicitud:</td><td style=\"font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;\">#{withdrawal_id}</td></tr>" if withdrawal_id else ""
        gross_row = f"<tr><td style=\"font-weight: 600; color: #64748b;\">Monto Bruto Solicitado:</td><td style=\"font-weight: 600; color: #0f172a;\">${gross_amount:,.2f} COP</td></tr>" if gross_amount else ""
        tax_row = f"<tr><td style=\"font-weight: 600; color: #64748b;\">Retención 3.2%:</td><td style=\"font-weight: 600; color: #dc2626;\">-${tax:,.2f} COP</td></tr>" if tax else ""
        acct_label = f"{account_type} - {account_number}" if account_type else account_number

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Nos complace informarte que tu solicitud de retiro de fondos ha sido <strong>aprobada y transferida exitosamente</strong> a tu cuenta de destino registrada.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 22px; margin: 22px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Resumen de la Transacción
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.8;">
                {id_row}
                {gross_row}
                {tax_row}
                <tr>
                    <td style="font-weight: 600; width: 160px; color: #64748b;">Monto Neto Transferido:</td>
                    <td style="font-size: 17px; font-weight: 800; color: #16a34a;">${amount:,.2f} COP</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Método de Pago:</td>
                    <td style="font-weight: 600; color: #0f172a;">{method}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Entidad Bancaria:</td>
                    <td style="font-weight: 600; color: #0f172a;">{bank}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Cuenta Destino:</td>
                    <td style="font-weight: 600; color: #0f172a;">{acct_label}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Fecha de Procesamiento:</td>
                    <td style="color: #0f172a;">{cur_date}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Estado:</td>
                    <td>
                        <span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;">
                            ✓ Aprobado y Transferido
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="background-color: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 8px; padding: 12px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12.5px; color: #15803d; line-height: 1.5;">
                💡 <strong>Tiempo de acreditación:</strong> Dependiendo del ciclo interbancario de tu entidad financiera, los fondos se verán reflejados en tu extracto bancario en un lapso de pocos minutos a pocas horas hábiles.
            </p>
        </div>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="TRANSACCIÓN APROBADA • FONDOS TRANSFERIDOS",
            badge_variant="green",
            cta_text="Consultar Billetera en Gloint",
            cta_url=f"{frontend_url}/dashboard/wallet"
        )
        return subject, html

    @classmethod
    def get_chatbot_lead_investor_template(
        cls,
        investor_name: str,
        director_name: str,
        package_name: str,
        preferred_time: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Confirmación al Inversionista tras dejar sus datos en el Chatbot.
        """
        subject = "Solicitud de Asesoría de Inversión Recibida - Gloint"
        title = "¡Hemos recibido tu solicitud de asesoría!"
        preheader = f"Hola {investor_name}, tu solicitud para el paquete {package_name} ha sido asignada a {director_name}."
        frontend_url = settings.FRONTEND_URL.rstrip('/')

        time_row = f"""
        <tr>
            <td style="font-weight: 600; color: #64748b;">Horario preferido:</td>
            <td style="font-weight: 600; color: #0f172a;">{preferred_time}</td>
        </tr>
        """ if preferred_time else ""

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong>{investor_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Agradecemos tu interés en formar parte de nuestro fondo de inversión. Hemos recibido satisfactoriamente tu solicitud de asesoría personalizada para el paquete <strong>{package_name}</strong>.
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; margin: 22px 0;">
            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Asignación Comercial Directa
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.8;">
                <tr>
                    <td style="font-weight: 600; width: 160px; color: #64748b;">Directivo de Inversión:</td>
                    <td style="font-weight: 700; color: #0f172a;">{director_name}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Paquete de Interés:</td>
                    <td style="font-weight: 700; color: #ea580c;">{package_name}</td>
                </tr>
                {time_row}
            </table>
        </div>

        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Tu directivo asignado se comunicará contigo vía telefónica o WhatsApp para compartirte las proyecciones financieras, los contratos de garantía y resolver cualquier inquietud de manera personalizada.
        </p>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="ASESORÍA PATRIMONIAL",
            badge_variant="orange",
            cta_text="Conocer Más de Gloint",
            cta_url=frontend_url
        )
        return subject, html

    @classmethod
    def get_chatbot_lead_director_template(
        cls,
        director_name: str,
        lead_data: dict
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Notificación al Director Comercial de un nuevo lead del Chatbot.
        """
        investor_name = lead_data.get("name", "Prospecto")
        subject = f"🎯 Nuevo Prospecto Asignado: {investor_name} - Gloint CRM"
        title = "Nuevo Prospecto de Inversión Asignado"
        preheader = f"Hola {director_name}, se te ha asignado a {investor_name} a través del Chatbot web."
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        pkg_name = lead_data.get("package_name") or f"${lead_data.get('package_value', 0):,.0f} COP"
        phone = lead_data.get('phone', 'No especificado')
        email = lead_data.get('email', 'No especificado')
        city = lead_data.get('city', 'N/A')
        dept = lead_data.get('department', '')
        city_dept = f"{city} ({dept})" if dept else city

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Hola <strong>{director_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Se te ha asignado un nuevo prospecto de inversión de manera equitativa a través del Chatbot de la Landing Page. A continuación los datos clave para tu contacto y cierre:
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.8;">
                <tr><td style="font-weight: 600; width: 150px; color: #64748b;">Inversionista:</td><td style="font-weight: 700; color: #0f172a;">{investor_name}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Teléfono / WhatsApp:</td><td><a href="tel:{phone}" style="color: #0284c7; font-weight: 600; text-decoration: none;">{phone}</a></td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Correo Electrónico:</td><td><a href="mailto:{email}" style="color: #0284c7; font-weight: 600; text-decoration: none;">{email}</a></td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Ciudad / Dpto:</td><td style="color: #0f172a;">{city_dept}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Paquete de Interés:</td><td style="color: #ea580c; font-weight: 700;">{pkg_name}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Objetivo:</td><td style="color: #0f172a;">{lead_data.get('investment_goal', 'Inversión')}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Horario de Contacto:</td><td style="color: #0f172a;">{lead_data.get('preferred_contact_time', 'Indiferente')}</td></tr>
            </table>
        </div>

        <p style="margin: 0 0 16px; font-size: 13.5px; line-height: 1.6; color: #475569;">
            El prospecto ya se encuentra registrado en tu tablero de <strong>CRM Leads</strong> en la etapa <em>Lead Entrante</em> listo para gestión comercial inmediata.
        </p>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="GESTIÓN COMERCIAL • LEAD CHATBOT",
            badge_variant="blue",
            cta_text="Gestionar Lead en CRM",
            cta_url=f"{frontend_url}/dashboard/crm"
        )
        return subject, html

    @classmethod
    def get_external_form_director_template(
        cls,
        director_name: str,
        platform_name: str,
        lead_data: dict
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Notificación al Director Comercial de un prospecto de formulario externo.
        """
        contact_name = lead_data.get("name", "Prospecto")
        subject = f"🔔 Nuevo Prospecto desde {platform_name}: {contact_name} - Gloint CRM"
        title = f"Nuevo Contacto desde {platform_name}"
        preheader = f"Hola {director_name}, has recibido un nuevo prospecto desde {platform_name}."
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        message_txt = lead_data.get("message") or "Sin mensaje adicional"
        company_txt = lead_data.get("company") or "No especificada"
        city_txt = lead_data.get("city") or "No especificada"
        phone_val = lead_data.get("phone", "No especificado")
        email_val = lead_data.get("email", "No especificado")

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Hola <strong>{director_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Se te ha asignado un nuevo prospecto de manera equitativa proveniente del formulario de <strong>{platform_name}</strong>. A continuación los detalles registrados:
        </p>

        <!-- Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 22px; margin: 20px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.8;">
                <tr><td style="font-weight: 600; width: 140px; color: #64748b;">Origen:</td><td style="color: #0284c7; font-weight: 700;">{platform_name}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Nombre:</td><td style="font-weight: 700; color: #0f172a;">{contact_name}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Teléfono:</td><td><a href="tel:{phone_val}" style="color: #0284c7; font-weight: 600; text-decoration: none;">{phone_val}</a></td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Correo:</td><td><a href="mailto:{email_val}" style="color: #0284c7; font-weight: 600; text-decoration: none;">{email_val}</a></td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Empresa:</td><td style="color: #0f172a;">{company_txt}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Ciudad:</td><td style="color: #0f172a;">{city_txt}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b; vertical-align: top;">Mensaje:</td><td style="white-space: pre-line; color: #0f172a;">{message_txt}</td></tr>
            </table>
        </div>

        <p style="margin: 0 0 16px; font-size: 13.5px; line-height: 1.6; color: #475569;">
            Este contacto ha quedado registrado en tu tablero de <strong>CRM Leads</strong> en la etapa <em>Lead Entrante</em> listo para gestión inmediata.
        </p>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text=f"FORMULARIO • {platform_name.upper()}",
            badge_variant="blue",
            cta_text="Ver Prospecto en CRM",
            cta_url=f"{frontend_url}/dashboard/crm"
        )
        return subject, html

    @classmethod
    def get_investment_request_created_template(
        cls,
        user_name: str,
        request_id: int,
        amount: float,
        package_name: str,
        period_months: str,
        is_upgrade: bool = False,
        payment_method: str = "Pasarela en línea / Transferencia"
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Solicitud de Inversión o Aumento de Capital Radicada.
        """
        op_title = "Aumento de Capital" if is_upgrade else "Nueva Inversión"
        subject = f"📋 Solicitud de {op_title} #{request_id} Radicada - GLOINT"
        title = f"Solicitud de {op_title} #{request_id}"
        preheader = f"Tu solicitud de {op_title.lower()} por ${amount:,.0f} COP ha sido registrada exitosamente en Gloint."
        frontend_url = settings.FRONTEND_URL.rstrip('/')

        intro_text = (
            f"Hemos recibido y radicado con éxito tu solicitud de <strong>Aumento de Capital</strong>. "
            f"Si iniciaste el pago en línea mediante la pasarela <strong>Yoint</strong> (PSE, Botón Bancolombia o Nequi), "
            f"tu contrato se actualizará y activará automáticamente una vez tu entidad bancaria confirme los fondos."
            if is_upgrade else
            f"Hemos recibido y radicado con éxito tu solicitud de <strong>Nueva Inversión</strong>. "
            f"Si iniciaste el pago en línea mediante la pasarela <strong>Yoint</strong> (PSE, Botón Bancolombia o Nequi), "
            f"tu contrato se activará automáticamente una vez tu entidad bancaria confirme los fondos."
        )

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Hola <strong style="color: #0f172a;">{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            {intro_text}
        </p>

        <!-- Summary Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; margin: 22px 0;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Detalles de la Solicitud
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.85;">
                <tr><td style="font-weight: 600; width: 150px; color: #64748b;">N° de Radicado:</td><td style="font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">#{request_id}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Operación:</td><td style="color: #0f172a; font-weight: 700;">{op_title}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Monto:</td><td style="font-weight: 800; color: #0f172a; font-size: 16px;">${amount:,.0f} COP</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Paquete:</td><td style="color: #0f172a; font-weight: 600;">{package_name}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Plazo / Periodo:</td><td style="color: #0f172a;">{period_months}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Método de Pago:</td><td style="color: #0f172a;">{payment_method}</td></tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Estado:</td>
                    <td>
                        <span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">
                            Pendiente de Confirmación
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #166534; line-height: 1.6;">
            <strong>ℹ️ Información importante:</strong><br>
            • Si realizaste tu pago en línea a través de <strong>Yoint (PSE, Bancolombia o Nequi)</strong>, el sistema concilia de forma continua y activará tu contrato de inmediato al recibir la confirmación de la pasarela.<br>
            • Si realizaste una transferencia bancaria con soporte adjunto, nuestro equipo administrativo validará la consignación y activará tu inversión en horario hábil.
        </div>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="SOLICITUD RADICADA • EN PROCESO",
            badge_variant="amber" if is_upgrade else "blue",
            cta_text="Ver Mis Inversiones",
            cta_url=f"{frontend_url}/dashboard/investments"
        )
        return subject, html

    @classmethod
    def get_investment_activated_template(
        cls,
        user_name: str,
        contract_code: str,
        amount: float,
        package_name: str,
        period_info: str,
        is_upgrade: bool = False,
        granted_shares: int = 0,
        accrued_yield_paid: float = 0.0,
        payment_method: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Inversión o Aumento de Capital Activado (Pago confirmado por Yoint o Aprobado).
        """
        op_title = "Aumento de Capital" if is_upgrade else "Inversión"
        subject = f"🎉 ¡Tu {op_title} ha sido Activada! Contrato {contract_code} - GLOINT"
        title = f"¡{op_title} Activada Exitosamente!"
        preheader = f"Tu contrato {contract_code} por ${amount:,.0f} COP se encuentra 100% activo y generando rendimientos."
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        from datetime import datetime
        today_str = datetime.utcnow().strftime("%d/%m/%Y")

        pay_line = f'<tr><td style="font-weight: 600; color: #64748b;">Confirmado vía:</td><td style="color: #0f172a;">{payment_method}</td></tr>' if payment_method else ''

        shares_block = ""
        if granted_shares and granted_shares > 0:
            shares_block = f"""
            <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #166534; line-height: 1.6;">
                <strong>🎖️ Acciones Corporativas Otorgadas:</strong><br>
                Se han acreditado <strong>{granted_shares:,} acciones</strong> en tu Libro de Accionistas Gloint asociadas al contrato <strong>{contract_code}</strong>.
            </div>
            """

        yield_block = ""
        if accrued_yield_paid and accrued_yield_paid > 0:
            yield_block = f"""
            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #1e40af; line-height: 1.6;">
                <strong>💰 Rendimientos Liquidados:</strong><br>
                Se han transferido automáticamente <strong>${accrued_yield_paid:,.0f} COP</strong> a tu Billetera Digital correspondientes a los rendimientos acumulados de tu contrato previo.
            </div>
            """

        intro_text = (
            f"Nos complace informarte que el pago de tu <strong>Aumento de Capital</strong> ha sido confirmado exitosamente. "
            f"Tu contrato de inversión ha sido actualizado al nuevo paquete y tu nuevo capital activo ha comenzado a generar rendimientos hoy mismo."
            if is_upgrade else
            f"¡Felicitaciones! Tu pago ha sido confirmado exitosamente por el sistema y tu contrato de inversión ha sido <strong>oficialmente activado</strong>. "
            f"A partir de este momento tu capital ya se encuentra trabajando y generando rendimientos en el portafolio Gloint."
        )

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado(a) <strong style="color: #0f172a;">{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            {intro_text}
        </p>

        <!-- Contract Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; margin: 22px 0;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Ficha del Contrato de Inversión
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.85;">
                <tr>
                    <td style="font-weight: 600; width: 160px; color: #64748b;">Código de Contrato:</td>
                    <td style="font-weight: 800; color: #ea580c; font-size: 15px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">{contract_code}</td>
                </tr>
                <tr><td style="font-weight: 600; color: #64748b;">Capital Activo:</td><td style="font-weight: 800; color: #0f172a; font-size: 16px;">${amount:,.0f} COP</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Paquete de Inversión:</td><td style="color: #0f172a; font-weight: 600;">{package_name}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Términos / Plazo:</td><td style="color: #0f172a;">{period_info}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Fecha de Activación:</td><td style="color: #0f172a;">{today_str}</td></tr>
                {pay_line}
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Estado:</td>
                    <td>
                        <span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;">
                            ✓ Activo / Generando Rendimientos
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        {shares_block}
        {yield_block}

        <p style="margin: 0 0 16px; font-size: 13.5px; line-height: 1.6; color: #475569;">
            Puedes monitorear tus rendimientos diarios, descargar tu contrato firmado y consultar tu extracto de cuenta en tiempo real desde tu panel de inversionista.
        </p>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="CONTRATO ACTIVADO • OFICIAL",
            badge_variant="green",
            cta_text="Ver Mi Portafolio de Inversión",
            cta_url=f"{frontend_url}/dashboard/investments"
        )
        return subject, html

    @classmethod
    def get_wallet_recharge_confirmed_template(
        cls,
        user_name: str,
        amount: float,
        new_balance: float,
        payment_method: str,
        reference_id: str,
        date_str: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Recarga de Billetera Digital Confirmada y Acreditada.
        """
        subject = f"✅ Recarga Exitosa: ${amount:,.0f} COP Acreditados en tu Billetera - GLOINT"
        title = "Recarga de Billetera Confirmada"
        preheader = f"Hemos acreditado exitosamente ${amount:,.0f} COP en tu Billetera Digital Gloint."
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        from datetime import datetime
        cur_date = date_str or datetime.utcnow().strftime("%d/%m/%Y %H:%M UTC")

        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Hola <strong style="color: #0f172a;">{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            Te confirmamos que tu transacción de recarga de fondos ha sido aprobada y procesada exitosamente. El saldo correspondiente ya se encuentra acreditado y disponible para su uso inmediato en tu cuenta.
        </p>

        <!-- Transaction Details Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; margin: 22px 0;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Comprobante de Recarga Acreditada
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.85;">
                <tr><td style="font-weight: 600; width: 160px; color: #64748b;">Monto Recargado:</td><td style="font-weight: 800; color: #15803d; font-size: 17px;">+${amount:,.0f} COP</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Nuevo Saldo Disponible:</td><td style="font-weight: 800; color: #0f172a; font-size: 15px;">${new_balance:,.0f} COP</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Método de Pago:</td><td style="color: #0f172a; font-weight: 600;">{payment_method}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Referencia / Orden:</td><td style="color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">{reference_id}</td></tr>
                <tr><td style="font-weight: 600; color: #64748b;">Fecha y Hora:</td><td style="color: #0f172a;">{cur_date}</td></tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b;">Estado:</td>
                    <td>
                        <span style="display: inline-block; padding: 3px 10px; font-size: 11px; font-weight: 700; border-radius: 9999px; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;">
                            ✓ Acreditado en Billetera
                        </span>
                    </td>
                </tr>
            </table>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #166534; line-height: 1.6;">
            <strong>💡 Saldo disponible:</strong><br>
            Puedes utilizar este saldo para aperturar nuevas inversiones, realizar aumentos de capital en tus contratos vigentes o transferir fondos cuando lo desees.
        </div>
        """

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text="RECARGA CONFIRMADA • FONDOS ACREDITADOS",
            badge_variant="green",
            cta_text="Ir a Mi Billetera Digital",
            cta_url=f"{frontend_url}/dashboard/wallet"
        )
        return subject, html

    @classmethod
    def get_event_registration_confirmation_template(
        cls,
        user_name: str,
        event_title: str,
        event_date: Optional[datetime],
        attendance_mode: str,
        location: Optional[str] = None,
        virtual_url: Optional[str] = None,
        seats_reserved: int = 1,
        has_companion: bool = False,
        companion_name: Optional[str] = None,
        is_company: bool = False,
        company_name: Optional[str] = None,
        company_nit: Optional[str] = None,
        job_title: Optional[str] = None,
        document_id: Optional[str] = None,
        phone: Optional[str] = None,
        city: Optional[str] = None,
        interests: Optional[List[str]] = None,
        attendee_type: str = "investor"
    ) -> Tuple[str, str]:
        """
        Plantilla Corporativa: Confirmación de Inscripción al Evento Gloint Power Tech.
        Soporta modalidad Presencial y Virtual, con desglose detallado de perfil corporativo,
        acompañante y áreas de interés.
        """
        is_in_person = (attendance_mode or "").lower() == "in_person"
        clean_event_title = event_title or "Gloint Power Tech"
        
        # Formateo de fecha y hora amigable en español
        formatted_date = "Próximamente"
        if event_date:
            meses = [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ]
            dias = [
                "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"
            ]
            try:
                dia_semana = dias[event_date.weekday()]
                dia_num = event_date.day
                mes_nombre = meses[event_date.month - 1]
                anio = event_date.year
                hour_12 = event_date.hour % 12
                if hour_12 == 0:
                    hour_12 = 12
                ampm = "AM" if event_date.hour < 12 else "PM"
                formatted_date = f"{dia_semana}, {dia_num} de {mes_nombre} de {anio} • {hour_12}:{event_date.minute:02d} {ampm} (COT)"
            except Exception:
                formatted_date = str(event_date)

        # Configuración de asunto y títulos según modalidad
        if is_in_person:
            subject = f"🎟️ Pase de Entrada Confirmado: {clean_event_title} - GLOINT"
            title = f"¡Tu cupo presencial está confirmado!"
            preheader = f"Hola {user_name}, tu asistencia presencial para {clean_event_title} ha sido confirmada con éxito. Revisa aquí tu pase e instrucciones."
            badge_text = "PASE CONFIRMADO • ASISTENCIA PRESENCIAL"
            badge_variant = "orange"
        else:
            subject = f"🌐 Acceso Virtual Confirmado: {clean_event_title} - GLOINT"
            title = f"¡Tu acceso virtual en vivo está confirmado!"
            preheader = f"Hola {user_name}, tu registro virtual para la transmisión en directo de {clean_event_title} está confirmado. Revisa tu enlace de acceso."
            badge_text = "ACCESO CONFIRMADO • TRANSMISIÓN VIRTUAL"
            badge_variant = "blue"

        # Mensaje de bienvenida adaptado al tipo de asistente
        if attendee_type == "investor":
            intro_greeting = (
                f"Nos complace confirmar tu participación exclusiva como <strong>Inversionista de Gloint</strong> en "
                f"<strong>{clean_event_title}</strong>. Para nosotros es un privilegio compartir contigo los avances "
                f"tecnológicos, lanzamientos estratégicos y las nuevas oportunidades de rentabilidad del ecosistema."
            )
            tipo_label = '<span style="display: inline-block; padding: 2px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a;">★ Inversionista Gloint</span>'
        else:
            intro_greeting = (
                f"Hemos confirmado tu registro oficial como invitado a <strong>{clean_event_title}</strong>. "
                f"Prepárate para conocer de primera mano los nuevos modelos de negocio, soluciones de infraestructura e "
                f"innovaciones tecnológicas de alto impacto desarrolladas por Gloint."
            )
            tipo_label = '<span style="display: inline-block; padding: 2px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">Invitado Corporativo / Externo</span>'

        # Fila de Empresa o Persona Natural
        if is_company and (company_name or company_nit):
            corp_details = []
            if company_nit:
                corp_details.append(f"NIT: {company_nit}")
            if job_title:
                corp_details.append(f"Cargo: {job_title}")
            corp_extra = f" <span style='font-size: 12px; color: #64748b;'>({', '.join(corp_details)})</span>" if corp_details else ""
            perfil_html = f"""
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Perfil Corporativo:</td>
                <td style="color: #0f172a; font-weight: 700; padding: 4px 0;">{company_name or 'Empresa'}{corp_extra}</td>
            </tr>
            """
        else:
            perfil_html = """
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Perfil:</td>
                <td style="color: #475569; padding: 4px 0;">Persona Natural</td>
            </tr>
            """

        # Fila de Áreas de Interés
        interests_html = ""
        if interests and len(interests) > 0:
            badges = "".join([
                f'<span style="display: inline-block; background-color: #f8fafc; color: #334155; font-size: 11.5px; font-weight: 600; padding: 3px 9px; border-radius: 6px; margin: 2px 4px 2px 0; border: 1px solid #e2e8f0;">{i}</span>'
                for i in interests
            ])
            interests_html = f"""
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0; vertical-align: top;">Áreas de Interés:</td>
                <td style="padding: 4px 0;">{badges}</td>
            </tr>
            """

        # Filas específicas según Presencial o Virtual
        if is_in_person:
            cupos_str = f"{seats_reserved} cupo" if seats_reserved == 1 else f"{seats_reserved} cupos"
            if has_companion and companion_name:
                cupos_str += f" <span style='color: #64748b; font-size: 12px;'>(Titular + Acompañante: <strong>{companion_name}</strong>)</span>"

            mode_rows = f"""
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Modalidad:</td>
                <td style="color: #c2410c; font-weight: 700; padding: 4px 0;">Presencial en Auditorio</td>
            </tr>
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Ubicación:</td>
                <td style="color: #0f172a; font-weight: 600; padding: 4px 0;">{location or 'Auditorio Principal Gloint • Bogotá, Colombia'}</td>
            </tr>
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Aforo / Reserva:</td>
                <td style="color: #0f172a; padding: 4px 0;">{cupos_str}</td>
            </tr>
            """

            instructions_box = f"""
            <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px 20px; margin: 20px 0; font-size: 13px; color: #9a3412; line-height: 1.65;">
                <strong style="color: #7c2d12; font-size: 13.5px;">📍 Recomendaciones para el día del evento:</strong><br>
                • <strong>Horario de Acreditación:</strong> Las puertas se abrirán <strong>30 minutos antes</strong> de la hora de inicio para el registro en recepción y networking inicial.<br>
                • <strong>Documento de Identidad:</strong> Es necesario presentar tu cédula de ciudadanía o documento registrado para el ingreso.{f"<br>• <strong>Acompañante:</strong> Tu registro incluye el pase para <strong>{companion_name}</strong>." if (has_companion and companion_name) else ""}<br>
                • <strong>Código de Vestimenta:</strong> Business Casual / Formal Ejecutivo.
            </div>
            """
        else:
            virt_link_html = f'<a href="{virtual_url}" target="_blank" style="color: #0284c7; font-weight: 700; text-decoration: underline;">{virtual_url}</a>' if virtual_url else 'Enlace exclusivo habilitado previo al inicio'
            mode_rows = f"""
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Modalidad:</td>
                <td style="color: #0369a1; font-weight: 700; padding: 4px 0;">Virtual en Vivo (Streaming HD)</td>
            </tr>
            <tr>
                <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Sala de Transmisión:</td>
                <td style="padding: 4px 0;">{virt_link_html}</td>
            </tr>
            """

            instructions_box = f"""
            <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 16px 20px; margin: 20px 0; font-size: 13px; color: #075985; line-height: 1.65;">
                <strong style="color: #0c4a6e; font-size: 13.5px;">💻 Instrucciones para tu conexión virtual:</strong><br>
                • <strong>Apertura de la Transmisión:</strong> La sala de streaming estará disponible <strong>15 minutos antes</strong> para verificar audio y calidad de video.<br>
                • <strong>Enlace Directo:</strong> Puedes acceder directamente desde el botón ubicado al final de este correo o mediante el enlace: <a href="{virtual_url}" style="color: #0284c7; text-decoration: underline;">{virtual_url}</a>.<br>
                • <strong>Participación en Vivo:</strong> Tendrás a disposición el chat en tiempo real para formular preguntas a los directivos de Gloint.
            </div>
            """

        frontend_url = settings.FRONTEND_URL.rstrip('/')
        content_html = f"""
        <p style="margin: 0 0 14px; font-size: 15px; color: #0f172a;">
            Estimado/a <strong style="color: #0f172a;">{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.65; color: #334155;">
            {intro_greeting}
        </p>

        <!-- Ticket Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px 24px; margin: 22px 0;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                Ficha Oficial de Entrada • {clean_event_title}
            </div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size: 13.5px; color: #334155; line-height: 1.85;">
                <tr>
                    <td style="font-weight: 600; width: 145px; color: #64748b; padding: 4px 0;">Evento:</td>
                    <td style="font-weight: 800; color: #0f172a; font-size: 15px; padding: 4px 0;">{clean_event_title}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Fecha & Hora:</td>
                    <td style="color: #0f172a; font-weight: 700; padding: 4px 0;">{formatted_date}</td>
                </tr>
                {mode_rows}
                <tr>
                    <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Tipo de Registro:</td>
                    <td style="padding: 4px 0;">{tipo_label}</td>
                </tr>
                <tr>
                    <td style="font-weight: 600; color: #64748b; padding: 4px 0;">Titular:</td>
                    <td style="color: #0f172a; font-weight: 600; padding: 4px 0;">{user_name}</td>
                </tr>
                {f"<tr><td style='font-weight: 600; color: #64748b; padding: 4px 0;'>Documento ID:</td><td style='color: #0f172a; padding: 4px 0;'>{document_id}</td></tr>" if document_id else ""}
                {f"<tr><td style='font-weight: 600; color: #64748b; padding: 4px 0;'>Teléfono / WhatsApp:</td><td style='color: #0f172a; padding: 4px 0;'>{phone}</td></tr>" if phone else ""}
                {f"<tr><td style='font-weight: 600; color: #64748b; padding: 4px 0;'>Ciudad:</td><td style='color: #0f172a; padding: 4px 0;'>{city}</td></tr>" if city else ""}
                {perfil_html}
                {interests_html}
            </table>
        </div>

        {instructions_box}
        """

        cta_text = "Acceder a la Sala Virtual" if not is_in_person else "Ver en Portal Gloint"
        cta_url = virtual_url if (not is_in_person and virtual_url) else (f"{frontend_url}/dashboard" if attendee_type == "investor" else f"{frontend_url}/#power-tech")
        
        secondary_cta_text = "Ir a Mi Portal" if attendee_type == "investor" else None
        secondary_cta_url = f"{frontend_url}/dashboard" if attendee_type == "investor" else None

        html = cls.build_corporate_email_layout(
            title=title,
            preheader=preheader,
            content_html=content_html,
            badge_text=badge_text,
            badge_variant=badge_variant,
            cta_text=cta_text,
            cta_url=cta_url,
            secondary_cta_text=secondary_cta_text,
            secondary_cta_url=secondary_cta_url
        )
        return subject, html



