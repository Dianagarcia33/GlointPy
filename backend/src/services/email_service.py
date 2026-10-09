from typing import Optional, List
import resend
from src.core.config import settings

class EmailService:
    @classmethod
    def send_password_reset_email(cls, to_email: str, reset_token: str) -> bool:
        """
        Envía el correo corporativo para recuperación y cambio de contraseña.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_password_reset_template(reset_token)
        return cls.send_html_email(to_email, subject, html)

    @staticmethod
    def send_crm_custom_email(
        to_email: str, 
        subject: str, 
        html_content: str, 
        from_name: str = "GLOINT Comercial",
        reply_to_email: str = None,
        attachments: Optional[List[dict]] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        if not settings.RESEND_API_KEY:
            print("WARNING: RESEND_API_KEY is not set. Skipping CRM email dispatch.")
            print(f"Mock Email to {to_email} | Subject: {subject} | Attachments: {len(attachments or [])}")
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
        if cc and len(cc) > 0:
            email_payload["cc"] = cc
        if bcc and len(bcc) > 0:
            email_payload["bcc"] = bcc

        if attachments:
            import os
            resend_attachments = []
            for att in attachments:
                file_url = att.get("file_url", "")
                filename = att.get("filename", "adjunto")
                clean_path = file_url.lstrip("/")
                if clean_path.startswith("api/v1/uploads/"):
                    clean_path = clean_path.replace("api/v1/uploads/", "uploads/")
                local_path = os.path.abspath(clean_path)
                
                if os.path.exists(local_path) and os.path.isfile(local_path):
                    with open(local_path, "rb") as f:
                        file_bytes = list(f.read())
                    att_payload = {
                        "filename": filename,
                        "content": file_bytes
                    }
                    if att.get("content_type"):
                        att_payload["content_type"] = att["content_type"]
                    resend_attachments.append(att_payload)
            if resend_attachments:
                email_payload["attachments"] = resend_attachments

        try:
            resend.Emails.send(email_payload)
            return True
        except Exception as e:
            print(f"Error al enviar correo CRM vía Resend: {e}")
            return False

    @classmethod
    def send_withdrawal_verification_code(cls, to_email: str, code: str) -> bool:
        """
        Envía el código OTP para autorización de retiro de saldo en billetera digital.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_otp_verification_template(
            user_name="Inversionista",
            code=code,
            purpose="Retiro de Fondos de Billetera",
            action_details="Has solicitado retirar saldo disponible de tu billetera digital a tu cuenta bancaria registrada.",
            expires_minutes=10
        )
        return cls.send_html_email(to_email, subject, html)

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

    @classmethod
    def send_withdrawal_approval_email(cls, to_email: str, user_name: str, amount: float, method: str, bank: str, account_number: str) -> bool:
        """
        Envía notificación corporativa cuando un retiro de fondos ha sido aprobado y transferido.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_withdrawal_approval_template(
            user_name=user_name,
            amount=amount,
            method=method,
            bank=bank,
            account_number=account_number
        )
        return cls.send_html_email(to_email, subject, html)

    @classmethod
    def send_chatbot_lead_investor_confirmation(
        cls,
        to_email: str,
        investor_name: str,
        director_name: str,
        package_name: str,
        preferred_time: str = None
    ) -> bool:
        """
        Envía confirmación al prospecto tras solicitar asesoría en el Chatbot.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_chatbot_lead_investor_template(
            investor_name=investor_name,
            director_name=director_name,
            package_name=package_name,
            preferred_time=preferred_time
        )
        return cls.send_html_email(to_email, subject, html)

    @classmethod
    def send_chatbot_lead_director_notification(
        cls,
        to_email: str,
        director_name: str,
        lead_data: dict
    ) -> bool:
        """
        Notifica al Director de Inversiones sobre la asignación de un lead desde el Chatbot.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_chatbot_lead_director_template(
            director_name=director_name,
            lead_data=lead_data
        )
        return cls.send_html_email(to_email, subject, html)

    @classmethod
    def send_external_form_director_notification(
        cls,
        to_email: str,
        director_name: str,
        platform_name: str,
        lead_data: dict
    ) -> bool:
        """
        Notifica al Director de Inversiones sobre la recepción de un contacto desde formularios externos.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_external_form_director_template(
            director_name=director_name,
            platform_name=platform_name,
            lead_data=lead_data
        )
        return cls.send_html_email(to_email, subject, html)

    @classmethod
    async def send_welcome_and_review_email(
        cls,
        to_email: str,
        user_name: str,
        document_id: str,
        document_type: str = "CC"
    ) -> bool:
        """
        Envía el correo corporativo de bienvenida al registrarse notificando sobre la revisión SARLAFT preventiva.
        """
        from src.services.email_template_service import EmailTemplateService
        import asyncio
        subject, html = EmailTemplateService.get_welcome_and_review_template(
            user_name=user_name,
            document_id=document_id,
            document_type=document_type
        )
        return await asyncio.to_thread(cls.send_html_email, to_email, subject, html)

    @classmethod
    async def send_sarlaft_result_email(
        cls,
        to_email: str,
        user_name: str,
        document_id: str,
        document_type: str = "CC",
        has_findings: bool = False,
        risk_level: str = "CLEAN",
        hallazgos_summary: Optional[str] = None
    ) -> bool:
        """
        Envía el correo corporativo con el resultado de la validación de TusDatos:
        - Si no tiene hallazgos y el riesgo es CLEAN / LOW: correo de cuenta validada y 100% habilitada.
        - Si tiene hallazgos o riesgo MEDIUM / HIGH: correo informativo de revisión manual preventiva.
        """
        from src.services.email_template_service import EmailTemplateService
        import asyncio

        is_approved = (not has_findings) and (risk_level.upper() in ["CLEAN", "LOW"])

        if is_approved:
            subject, html = EmailTemplateService.get_sarlaft_approved_template(
                user_name=user_name,
                document_id=document_id,
                document_type=document_type
            )
        else:
            subject, html = EmailTemplateService.get_sarlaft_findings_template(
                user_name=user_name,
                document_id=document_id,
                document_type=document_type,
                risk_level=risk_level,
                hallazgos_summary=hallazgos_summary
            )

        return await asyncio.to_thread(cls.send_html_email, to_email, subject, html)

    @classmethod
    def send_investment_request_created_email(
        cls,
        to_email: str,
        user_name: str,
        request_id: int,
        amount: float,
        package_name: str,
        period_months: str,
        is_upgrade: bool = False,
        payment_method: str = "Pasarela en línea / Transferencia"
    ) -> bool:
        """
        Envía el correo corporativo cuando una solicitud de inversión o aumento de capital es radicada.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_investment_request_created_template(
            user_name=user_name,
            request_id=request_id,
            amount=amount,
            package_name=package_name,
            period_months=period_months,
            is_upgrade=is_upgrade,
            payment_method=payment_method
        )
        return cls.send_html_email(to_email, subject, html)

    @classmethod
    def send_investment_activated_email(
        cls,
        to_email: str,
        user_name: str,
        contract_code: str,
        amount: float,
        package_name: str,
        period_info: str,
        is_upgrade: bool = False,
        granted_shares: int = 0,
        accrued_yield_paid: float = 0.0,
        payment_method: Optional[str] = None
    ) -> bool:
        """
        Envía el correo corporativo cuando una inversión o aumento de capital ha sido activado
        (por confirmación de pago Yoint o aprobación administrativa).
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_investment_activated_template(
            user_name=user_name,
            contract_code=contract_code,
            amount=amount,
            package_name=package_name,
            period_info=period_info,
            is_upgrade=is_upgrade,
            granted_shares=granted_shares,
            accrued_yield_paid=accrued_yield_paid,
            payment_method=payment_method
        )
        return cls.send_html_email(to_email, subject, html)

    @classmethod
    def send_wallet_recharge_confirmed_email(
        cls,
        to_email: str,
        user_name: str,
        amount: float,
        new_balance: float,
        payment_method: str,
        reference_id: str,
        date_str: Optional[str] = None
    ) -> bool:
        """
        Envía el correo corporativo cuando una recarga de billetera digital ha sido confirmada y acreditada.
        """
        from src.services.email_template_service import EmailTemplateService
        subject, html = EmailTemplateService.get_wallet_recharge_confirmed_template(
            user_name=user_name,
            amount=amount,
            new_balance=new_balance,
            payment_method=payment_method,
            reference_id=reference_id,
            date_str=date_str
        )
        return cls.send_html_email(to_email, subject, html)

