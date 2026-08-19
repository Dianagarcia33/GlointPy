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
        user = investor.user
        user_name = user.name if user else "Inversionista"
        user_doc = user.document_id if user and user.document_id else "N/A"
        user_email = user.email if user else "N/A"
        user_phone = user.phone_number if user and user.phone_number else "N/A"

        monto_num = float(investor.package.value) if investor.package else 0
        monto_fmt = f"${monto_num:,.0f} COP".replace(",", ".")
        
        period_months = str(investor.period.months) if investor.period else "0"
        period_days = str(investor.period.days) if investor.period else "0"
        period_pct = f"{investor.period.percentage}%" if investor.period else "0%"

        start_date = investor.start_date
        if isinstance(start_date, datetime):
            start_date_str = start_date.strftime("%d/%m/%Y")
        elif start_date:
            start_date_str = str(start_date)
        else:
            start_date_str = datetime.utcnow().strftime("%d/%m/%Y")

        end_date_str = "N/A"
        if investor.start_date and investor.period:
            days = getattr(investor.period, 'days', 0) or (investor.period.months * 30 if investor.period.months else 0)
            end_date = investor.start_date + timedelta(days=days)
            end_date_str = end_date.strftime("%d/%m/%Y")

        assigned_code = investor.assigned_code or "N/A"
        shares = str(investor.package.granted_shares if investor.package else 0)

        replacements = {
            "{NOMBRE_INVERSIONISTA}": user_name,
            "{DOCUMENTO}": user_doc,
            "{CORREO}": user_email,
            "{TELEFONO}": user_phone,
            "{MONTO_INVERSION}": monto_fmt,
            "{PERIODOS_MESES}": period_months,
            "{DIAS_CONTRATO}": period_days,
            "{PORCENTAJE_MENSUAL}": period_pct,
            "{FECHA_INICIO}": start_date_str,
            "{FECHA_FIN}": end_date_str,
            "{CODIGO_INVERSION}": assigned_code,
            "{ACCIONES}": shares,
            "{FIRMA_DIGITAL}": f'<div style="margin-top: 30px; border-top: 1px solid #475569; width: 240px; padding-top: 4px; font-size: 13px;"><strong>Firma Digital:</strong><br/>{user_name}<br/><span style="color:#64748b; font-size: 11px;">Doc: {user_doc}</span></div>'
        }

        rendered = template_html or ""
        for tag, val in replacements.items():
            rendered = rendered.replace(tag, str(val))

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
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    investor_id BIGINT NOT NULL,
                    user_id BIGINT NOT NULL,
                    template_id BIGINT NULL,
                    title VARCHAR(255) NOT NULL,
                    document_type VARCHAR(100) NULL DEFAULT 'contract',
                    html_content LONGTEXT NOT NULL,
                    background_image LONGTEXT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_inv_docs_investor (investor_id),
                    INDEX idx_inv_docs_user (user_id),
                    FOREIGN KEY (investor_id) REFERENCES investors(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
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
