"""
Servicio y Estándar de Plantillas Corporativas de Correo Electrónico para GLOINT.

Este módulo define el estándar de diseño visual e identidad de marca para todas las 
comunicaciones por correo electrónico de Gloint International Partners.
Diseño minimalista, ultra-limpio, en modo claro con contrastes ejecutivos de alta gama.
Compatible con todos los clientes de correo (Gmail, Outlook, Apple Mail, Yahoo, iOS/Android).
"""

from typing import Optional, Tuple
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

