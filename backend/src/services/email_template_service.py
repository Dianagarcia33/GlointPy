"""
Servicio y Estándar de Plantillas Corporativas de Correo Electrónico para GLOINT.

Este módulo define el estándar de diseño visual e identidad de marca para todas las 
comunicaciones por correo electrónico de Gloint International Partners.
Compatible con todos los clientes de correo (Gmail, Outlook, Apple Mail, Yahoo, iOS/Android).
"""

from typing import Optional, Tuple
from src.core.config import settings

class EmailTemplateService:

    @staticmethod
    def get_email_logo_url() -> str:
        """
        Retorna la URL pública del logotipo de Gloint para incrustar en correos.
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
        Genera el HTML estándar con la imagen corporativa oficial de Gloint.
        """
        logo_url = cls.get_email_logo_url()
        frontend_url = settings.FRONTEND_URL.rstrip('/')
        sup_email = support_email or settings.SENDER_EMAIL or "soporte@gloint.com.co"

        # Badge Variants
        badge_styles = {
            "orange": "background-color: #fff7ed; color: #ea580c; border: 1px solid #fed7aa;",
            "green": "background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;",
            "amber": "background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a;",
            "blue": "background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;",
            "red": "background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;",
        }
        b_style = badge_styles.get(badge_variant.lower(), badge_styles["orange"])

        badge_html = ""
        if badge_text:
            badge_html = f"""
            <tr>
                <td style="padding-bottom: 12px;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 5px 14px; border-radius: 20px; {b_style} font-family: 'Montserrat', Arial, sans-serif;">
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
                <a href="{secondary_cta_url}" target="_blank" style="background-color: #f8fafc; color: #475569; font-weight: 700; font-size: 14px; padding: 13px 24px; border-radius: 12px; text-decoration: none; display: inline-block; border: 1px solid #cbd5e1; margin-left: 10px; margin-top: 8px;">
                    {secondary_cta_text}
                </a>
                """

            cta_html = f"""
            <tr>
                <td align="center" style="padding: 30px 0 10px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                        <tr>
                            <td align="center">
                                <a href="{cta_url}" target="_blank" style="background-color: #f97316; background-image: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; display: inline-block; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.35); text-align: center; font-family: 'Montserrat', Arial, sans-serif;">
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
        body, table, td, a {{ font-family: Arial, Helvetica, sans-serif !important; }}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0b1329; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
    <!-- Hidden Preheader for email clients -->
    <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
        {preheader}
    </div>
    
    <!-- Outer Table Canvas -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0b1329; width: 100%; padding: 40px 10px;">
        <tr>
            <td align="center">
                <!-- Main 600px Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.45); border: 1px solid #1e293b;">
                    
                    <!-- Top Accent Gold/Orange Brand Bar -->
                    <tr>
                        <td style="height: 5px; background: #f97316; background-image: linear-gradient(90deg, #f97316 0%, #fbbf24 50%, #f97316 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    
                    <!-- Corporate Header -->
                    <tr>
                        <td style="background-color: #0f172a; padding: 32px 36px 26px; text-align: center; border-bottom: 1px solid #1e293b;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center">
                                        <a href="{frontend_url}" target="_blank" style="text-decoration: none; display: inline-block;">
                                            <img src="{logo_url}" alt="GLOINT" width="140" style="height: auto; max-height: 44px; display: block; border: 0; outline: none; margin: 0 auto 8px;" onerror="this.style.display='none'" />
                                            <div style="font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #ffffff; font-family: 'Montserrat', Arial, sans-serif;">
                                                GLO<span style="color: #f97316;">INT</span>
                                            </div>
                                        </a>
                                        <div style="font-size: 11px; font-weight: 700; color: #fbbf24; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px; font-family: 'Montserrat', Arial, sans-serif;">
                                            International Partners • Gestión de Inversiones
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Card Content -->
                    <tr>
                        <td style="padding: 38px 36px 30px; background-color: #ffffff;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                
                                {badge_html}

                                <!-- Main Heading -->
                                <tr>
                                    <td style="padding-bottom: 18px;">
                                        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.35; font-family: 'Montserrat', Arial, sans-serif;">
                                            {title}
                                        </h1>
                                    </td>
                                </tr>

                                <!-- Dynamic Content -->
                                <tr>
                                    <td style="font-size: 15px; line-height: 1.65; color: #334155; font-family: 'Montserrat', -apple-system, sans-serif;">
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
                        <td style="padding: 0 36px 30px; background-color: #ffffff;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px 20px;">
                                <tr>
                                    <td style="width: 28px; vertical-align: top; padding-right: 12px; font-size: 20px; line-height: 1;">
                                        🔒
                                    </td>
                                    <td style="font-size: 12px; line-height: 1.5; color: #64748b; font-family: 'Montserrat', -apple-system, sans-serif;">
                                        <strong style="color: #0f172a;">Compromiso de Seguridad & SARLAFT:</strong> Tu cuenta y tus activos se encuentran respaldados bajo estrictos protocolos de debida diligencia y cumplimiento normativo. El equipo de Gloint nunca te solicitará contraseñas ni claves bancarias por correo electrónico.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Corporate Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; padding: 28px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
                            <p style="margin: 0 0 10px; font-size: 13px; font-weight: 600; color: #0f172a; font-family: 'Montserrat', Arial, sans-serif;">
                                ¿Tienes preguntas o necesitas asistencia personalizada?
                            </p>
                            <p style="margin: 0 0 20px; font-size: 13px; color: #475569;">
                                Escríbenos a nuestro canal oficial: <a href="mailto:{sup_email}" style="color: #f97316; font-weight: 700; text-decoration: none;">{sup_email}</a>
                            </p>

                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 10px;">
                                <tr>
                                    <td align="center" style="font-size: 11px; line-height: 1.6; color: #94a3b8; font-family: 'Montserrat', Arial, sans-serif;">
                                        <p style="margin: 0 0 6px;">
                                            © 2026 GLOINT International Partners. Todos los derechos reservados.
                                        </p>
                                        <p style="margin: 0 0 6px;">
                                            Bogotá, Colombia • Plataforma de Inversión y Gestión Estratégica de Capital
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
        <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.6;">
            Nos complace darte la más cordial bienvenida a <strong>Gloint International Partners</strong>, tu ecosistema estratégico para la estructuración, crecimiento y protección de capital patrimonial.
        </p>
        
        <!-- Info Highlight Box -->
        <div style="background-color: #fff7ed; border-left: 4px solid #f97316; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td>
                        <h3 style="margin: 0 0 6px; font-size: 14px; font-weight: 700; color: #9a3412; text-transform: uppercase; letter-spacing: 0.5px;">
                            Estado de tu Cuenta: En Verificación Preventiva (SARLAFT)
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: #7c2d12; line-height: 1.5;">
                            Por políticas de debida diligencia y seguridad para toda nuestra comunidad de inversionistas, los datos de tu documento (<strong>{document_type} ••••{masked_doc}</strong>) han ingresado a nuestro sistema automatizado de verificación de antecedentes e identidad en listas de control con <strong>TusDatos.co</strong>.
                        </p>
                    </td>
                </tr>
            </table>
        </div>

        <h4 style="margin: 24px 0 12px; font-size: 15px; font-weight: 700; color: #0f172a;">
            ¿Qué significa esto y qué puedes hacer ahora?
        </h4>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
            <li style="margin-bottom: 8px;">
                <strong>Consulta automatizada en curso:</strong> Este proceso toma habitualmente pocos minutos.
            </li>
            <li style="margin-bottom: 8px;">
                <strong>Explora la plataforma:</strong> Ya puedes iniciar sesión para conocer el panel de control, consultar el catálogo de paquetes y simular proyecciones de rendimiento.
            </li>
            <li style="margin-bottom: 8px;">
                <strong>Notificación de activación:</strong> Tan pronto culmine la validación, recibirás un correo de confirmación habilitando al 100% tus inversiones y recargas de saldo.
            </li>
        </ul>
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
        <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.6;">
            ¡Tenemos excelentes noticias! El proceso de consulta y validación de antecedentes e identidad para tu documento (<strong>{document_type} ••••{masked_doc}</strong>) ha finalizado <strong>exitosamente</strong> sin ninguna novedad restrictiva.
        </p>
        
        <!-- Success Card -->
        <div style="background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 28px; vertical-align: top; font-size: 18px; line-height: 1;">
                        ✅
                    </td>
                    <td>
                        <h3 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px;">
                            Cuenta 100% Habilitada para Invertir
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: #047857; line-height: 1.5;">
                            Tu perfil cumple a cabalidad con todos los estándares SARLAFT y de debida diligencia de Gloint. Todas las operaciones y productos de inversión han quedado desbloqueados.
                        </p>
                    </td>
                </tr>
            </table>
        </div>

        <h4 style="margin: 24px 0 12px; font-size: 15px; font-weight: 700; color: #0f172a;">
            Ya puedes acceder a todos los beneficios de la plataforma:
        </h4>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
            <li style="margin-bottom: 8px;">
                <strong>Contratación de Inversiones:</strong> Adquiere paquetes y comienza a generar rendimientos periódicos o acumulados.
            </li>
            <li style="margin-bottom: 8px;">
                <strong>Billetera Digital:</strong> Realiza recargas seguras y programa tus retiros de capital y rendimiento con total agilidad.
            </li>
            <li style="margin-bottom: 8px;">
                <strong>Acompañamiento Corporativo:</strong> Recibe el respaldo de tu directivo comercial para la estructura patrimonial de tu portafolio.
            </li>
        </ul>
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

        summary_text = f"<p style='margin: 6px 0 0; font-size: 12px; color: #92400e;'><strong>Detalle preliminar:</strong> {hallazgos_summary}</p>" if hallazgos_summary else ""

        content_html = f"""
        <p style="margin: 0 0 16px; font-size: 16px; color: #0f172a;">
            Estimado/a <strong>{user_name}</strong>,
        </p>
        <p style="margin: 0 0 18px; line-height: 1.6;">
            Te informamos que la consulta inicial de listas de control y antecedentes para tu documento (<strong>{document_type} ••••{masked_doc}</strong>) ha generado registros o coincidencias que requieren una <strong>revisión manual complementaria</strong> por parte de nuestro equipo de Oficialía de Cumplimiento.
        </p>
        
        <!-- Notice Card -->
        <div style="background-color: #fffbeb; border-left: 4px solid #d97706; border-radius: 10px; padding: 18px 20px; margin: 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                    <td style="width: 28px; vertical-align: top; font-size: 18px; line-height: 1;">
                        ℹ️
                    </td>
                    <td>
                        <h3 style="margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
                            Estado: En Revisión Manual Preventiva
                        </h3>
                        <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.5;">
                            Este proceso es habitual en casos de homonimias (nombres o identificaciones similares en bases públicas) o requerimientos de cotejo documental adicional.
                        </p>
                        {summary_text}
                    </td>
                </tr>
            </table>
        </div>

        <h4 style="margin: 24px 0 12px; font-size: 15px; font-weight: 700; color: #0f172a;">
            Siguientes pasos de tu solicitud:
        </h4>
        <ul style="margin: 0 0 24px; padding-left: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
            <li style="margin-bottom: 8px;">
                Nuestro equipo de Oficialía de Cumplimiento está revisando la información para validar que no existan impedimentos legales para la inversión.
            </li>
            <li style="margin-bottom: 8px;">
                Si se requiere algún documento complementario (como cédula ampliada o certificado), nos comunicaremos directamente contigo.
            </li>
            <li style="margin-bottom: 8px;">
                Puedes consultar en cualquier momento el estado actualizado de tu verificación directamente en tu perfil de usuario.
            </li>
        </ul>
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
