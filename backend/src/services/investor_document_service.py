from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from src.models.investor_document import InvestorDocument
from src.models.investor import Investor
from src.models.template import Template
from src.schemas.investor_document import InvestorDocumentGenerateRequest, InvestorDocumentPreviewRequest

class InvestorDocumentService:
    
    @staticmethod
    def render_html(template_html: str, investor: Investor) -> str:
        if not template_html:
            return ""

        user = investor.user
        full_name = (user.name if user and user.name else "Inversionista").strip()
        
        # Split first and last name
        words = full_name.split()
        if len(words) == 0:
            first_name = "Inversionista"
            last_name = ""
        elif len(words) == 1:
            first_name = words[0]
            last_name = ""
        elif len(words) == 2:
            first_name = words[0]
            last_name = words[1]
        elif len(words) == 3:
            first_name = f"{words[0]} {words[1]}"
            last_name = words[2]
        else:
            first_name = f"{words[0]} {words[1]}"
            last_name = " ".join(words[2:])

        user_doc = user.document_id if user and user.document_id else "N/A"
        doc_type = getattr(user, 'tipo_documento', 'Cédula de Ciudadanía') or 'Cédula de Ciudadanía'
        user_email = user.email if user and user.email else "N/A"
        user_phone = user.phone_number if user and user.phone_number else "N/A"
        user_city = getattr(user, 'city', '') or getattr(user, 'ciudad', '') or "Bogotá D.C."

        # Package & Shares
        monto_num = float(investor.package.value) if investor.package else 0
        monto_fmt = f"${monto_num:,.0f} COP".replace(",", ".")
        monto_clean = f"${monto_num:,.0f}".replace(",", ".")
        shares_count = str(investor.package.granted_shares if investor.package else 0)
        
        period_months = str(investor.period.months) if investor.period else "0"
        period_days = str(investor.period.days) if investor.period else "0"
        period_pct = f"{investor.period.percentage}%" if investor.period else "0%"

        meses_es = {
            1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
            5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
            9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"
        }

        # Start Date
        start_date = investor.start_date
        if isinstance(start_date, datetime):
            start_date_str = start_date.strftime("%d/%m/%Y")
            start_date_long = f"{start_date.day} de {meses_es.get(start_date.month, '')} de {start_date.year}"
        elif start_date:
            start_date_str = str(start_date)
            start_date_long = str(start_date)
        else:
            now = datetime.utcnow()
            start_date_str = now.strftime("%d/%m/%Y")
            start_date_long = f"{now.day} de {meses_es.get(now.month, '')} de {now.year}"

        # End Date
        end_date_str = "N/A"
        end_date_long = "N/A"
        if investor.start_date and investor.period:
            days = getattr(investor.period, 'days', 0) or (investor.period.months * 30 if investor.period.months else 0)
            end_date = investor.start_date + timedelta(days=days)
            end_date_str = end_date.strftime("%d/%m/%Y")
            end_date_long = f"{end_date.day} de {meses_es.get(end_date.month, '')} de {end_date.year}"

        assigned_code = investor.assigned_code or "N/A"

        # Complete dictionary mapping
        replacements = {
            # Acciones
            "acciones_otorgadas": shares_count,
            "acciones": shares_count,
            "shares": shares_count,
            "granted_shares": shares_count,
            "valor_total_acciones_formato": monto_fmt,
            "valor_total_acciones": monto_clean,

            # Nombres
            "nombre": first_name,
            "nombres": first_name,
            "first_name": first_name,
            "apellido": last_name,
            "apellidos": last_name,
            "last_name": last_name,
            "nombre_completo": full_name,
            "nombre_inversionista": full_name,
            "inversionista": full_name,

            # Documento e Identificación
            "documento": user_doc,
            "cedula": user_doc,
            "numero_documento": user_doc,
            "tipo_documento": doc_type,
            "ciudad": user_city,
            "domicilio": user_city,

            # Contacto
            "correo": user_email,
            "correo_electronico": user_email,
            "email": user_email,
            "telefono": user_phone,
            "celular": user_phone,
            "phone": user_phone,

            # Montos
            "monto_inversion": monto_fmt,
            "monto": monto_fmt,
            "valor_inversion": monto_fmt,

            # Fechas
            "fecha_ingreso": start_date_str,
            "fecha_inicio": start_date_str,
            "fecha_inicio_larga": start_date_long,
            "fecha_fin": end_date_str,
            "fecha_finalizacion": end_date_str,
            "fecha_fin_larga": end_date_long,

            # Periodo y porcentajes
            "periodos_meses": period_months,
            "meses": period_months,
            "periodo": period_months,
            "dias_contrato": period_days,
            "dias": period_days,
            "porcentaje_mensual": period_pct,
            "porcentaje": period_pct,

            # Código
            "codigo_inversion": assigned_code,
            "codigo_asignado": assigned_code,
            "codigo": assigned_code,

            # Firma
            "firma_digital": f'<div style="margin-top: 30px; border-top: 1px solid #475569; width: 240px; padding-top: 4px; font-size: 13px;"><strong>Firma Digital:</strong><br/>{full_name}<br/><span style="color:#64748b; font-size: 11px;">Doc: {user_doc}</span></div>',
            "firma": f'<div style="margin-top: 30px; border-top: 1px solid #475569; width: 240px; padding-top: 4px; font-size: 13px;"><strong>Firma Digital:</strong><br/>{full_name}<br/><span style="color:#64748b; font-size: 11px;">Doc: {user_doc}</span></div>'
        }

        # Case-insensitive replacement of all {key} patterns
        import re
        rendered = template_html
        for key, val in replacements.items():
            pattern = re.compile(re.escape(f"{{{key}}}"), re.IGNORECASE)
            rendered = pattern.sub(str(val), rendered)

        return rendered

    @staticmethod
    async def get_investor_with_relations(db: AsyncSession, investor_id: int) -> Investor:
        result = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.user),
                selectinload(Investor.package),
                selectinload(Investor.period)
            )
            .where(Investor.id == investor_id)
        )
        investor = result.scalars().first()
        if not investor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inversión no encontrada")
        return investor

    @staticmethod
    async def preview_document(db: AsyncSession, data: InvestorDocumentPreviewRequest) -> dict:
        investor = await InvestorDocumentService.get_investor_with_relations(db, data.investor_id)
        
        tpl_res = await db.execute(select(Template).where(Template.id == data.template_id))
        template = tpl_res.scalars().first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada")

        rendered_html = InvestorDocumentService.render_html(template.html_content, investor)
        
        return {
            "template_id": template.id,
            "template_name": template.name,
            "title": f"{template.name} - {investor.assigned_code or investor.id}",
            "document_type": template.type or "contract",
            "html_content": rendered_html,
            "background_image": template.background_image
        }

    @staticmethod
    async def ensure_table_exists(db: AsyncSession):
        from sqlalchemy import text
        try:
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS investor_documents (
                    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                    investor_id BIGINT UNSIGNED NOT NULL,
                    user_id BIGINT UNSIGNED NOT NULL,
                    template_id BIGINT UNSIGNED NULL,
                    title VARCHAR(255) NOT NULL,
                    document_type VARCHAR(100) NULL DEFAULT 'contract',
                    html_content LONGTEXT NOT NULL,
                    background_image LONGTEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_inv_docs_investor (investor_id),
                    INDEX idx_inv_docs_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """))
            await db.commit()
        except Exception as e:
            print(f"Notice verifying investor_documents table: {e}")

    @staticmethod
    async def generate_and_save(db: AsyncSession, data: InvestorDocumentGenerateRequest) -> InvestorDocument:
        await InvestorDocumentService.ensure_table_exists(db)
        investor = await InvestorDocumentService.get_investor_with_relations(db, data.investor_id)

        tpl_res = await db.execute(select(Template).where(Template.id == data.template_id))
        template = tpl_res.scalars().first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada")

        rendered_html = InvestorDocumentService.render_html(template.html_content, investor)
        title = data.custom_title or f"{template.name} - {investor.assigned_code or investor.id}"

        doc = InvestorDocument(
            investor_id=investor.id,
            user_id=investor.user_id,
            template_id=template.id,
            title=title,
            document_type=template.type or "contract",
            html_content=rendered_html,
            background_image=template.background_image
        )

        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def get_by_investor_id(db: AsyncSession, investor_id: int) -> List[InvestorDocument]:
        await InvestorDocumentService.ensure_table_exists(db)
        result = await db.execute(
            select(InvestorDocument)
            .where(InvestorDocument.investor_id == investor_id)
            .order_by(InvestorDocument.id.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_my_documents(db: AsyncSession, user_id: int, investor_id: Optional[int] = None) -> List[InvestorDocument]:
        await InvestorDocumentService.ensure_table_exists(db)
        query = select(InvestorDocument).where(InvestorDocument.user_id == user_id)
        if investor_id:
            query = query.where(InvestorDocument.investor_id == investor_id)
        
        query = query.order_by(InvestorDocument.id.desc())
        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, document_id: int) -> InvestorDocument:
        result = await db.execute(select(InvestorDocument).where(InvestorDocument.id == document_id))
        doc = result.scalars().first()
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no encontrado")
        return doc

    @staticmethod
    async def delete(db: AsyncSession, document_id: int) -> None:
        doc = await InvestorDocumentService.get_by_id(db, document_id)
        await db.delete(doc)
        await db.commit()
