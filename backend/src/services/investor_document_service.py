from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from src.models.investor_document import InvestorDocument
from src.models.investor import Investor
from src.models.template import Template
from src.schemas.investor_document import (
    InvestorDocumentGenerateRequest, 
    InvestorDocumentPreviewRequest,
    InvestorDocumentBulkGenerateRequest
)

def numero_a_letras(numero: float) -> str:
    """Convierte un número a su representación en letras en español (Pesos Colombianos M/CTE)."""
    unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"]
    decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"]
    diez_y = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"]
    veinti = ["VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"]
    centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"]

    n = int(round(numero))
    if n == 0:
        return "CERO PESOS M/CTE"
    if n == 100:
        return "CIEN PESOS M/CTE"

    def convertir_grupo(g: int) -> str:
        c = g // 100
        d = (g % 100) // 10
        u = g % 10
        res = []
        if g == 100:
            return "CIEN"
        if c > 0:
            res.append(centenas[c])
        if d == 1:
            res.append(diez_y[u])
        elif d == 2:
            res.append(veinti[u])
        elif d > 2:
            if u > 0:
                res.append(f"{decenas[d]} Y {unidades[u]}")
            else:
                res.append(decenas[d])
        elif u > 0:
            res.append(unidades[u])
        return " ".join(res).strip()

    millones = (n // 1_000_000) % 1_000_000
    miles = (n // 1_000) % 1_000
    unidades_val = n % 1_000

    partes = []
    if millones == 1:
        partes.append("UN MILLÓN")
    elif millones > 1:
        partes.append(f"{convertir_grupo(millones)} MILLONES")

    if miles == 1:
        partes.append("MIL")
    elif miles > 1:
        partes.append(f"{convertir_grupo(miles)} MIL")

    if unidades_val > 0:
        partes.append(convertir_grupo(unidades_val))

    resultado = " ".join(partes).strip()
    return f"{resultado} PESOS M/CTE"

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
        monto_num = float(investor.package.value) if investor.package and investor.package.value is not None else 0.0
        monto_fmt = f"${monto_num:,.0f} COP".replace(",", ".")
        monto_clean = f"${monto_num:,.0f}".replace(",", ".")
        monto_sin_signo = f"{monto_num:,.0f}".replace(",", ".")
        shares_count = str(investor.package.granted_shares if investor.package and investor.package.granted_shares is not None else 0)
        
        period_months_num = investor.period.months if investor.period and investor.period.months is not None else 0
        period_days_num = investor.period.days if investor.period and investor.period.days is not None else 0
        pct_num = float(investor.period.percentage) if investor.period and investor.period.percentage is not None else 0.0
        
        period_months = str(period_months_num)
        period_days = str(period_days_num)
        period_pct = f"{pct_num:g}%"
        period_pct_clean = f"{pct_num:g}"
        
        rendimiento_total_num = (monto_num * (pct_num / 100.0)) * period_months_num
        rendimiento_total_fmt = f"${rendimiento_total_num:,.0f} COP".replace(",", ".")
        rendimiento_mensual_num = monto_num * (pct_num / 100.0)
        rendimiento_mensual_fmt = f"${rendimiento_mensual_num:,.0f} COP".replace(",", ".")

        monto_en_letras = numero_a_letras(monto_num)

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
            dia_inicio = str(start_date.day)
            mes_inicio = meses_es.get(start_date.month, '')
            ano_inicio = str(start_date.year)
        elif start_date:
            start_date_str = str(start_date)
            start_date_long = str(start_date)
            dia_inicio = "01"
            mes_inicio = "enero"
            ano_inicio = "2026"
        else:
            now = datetime.utcnow()
            start_date_str = now.strftime("%d/%m/%Y")
            start_date_long = f"{now.day} de {meses_es.get(now.month, '')} de {now.year}"
            dia_inicio = str(now.day)
            mes_inicio = meses_es.get(now.month, '')
            ano_inicio = str(now.year)

        # End Date
        end_date_str = "N/A"
        end_date_long = "N/A"
        dia_fin = "N/A"
        mes_fin = "N/A"
        ano_fin = "N/A"
        if investor.start_date and investor.period:
            days = getattr(investor.period, 'days', 0) or (investor.period.months * 30 if investor.period.months else 0)
            end_date = investor.start_date + timedelta(days=days)
            end_date_str = end_date.strftime("%d/%m/%Y")
            end_date_long = f"{end_date.day} de {meses_es.get(end_date.month, '')} de {end_date.year}"
            dia_fin = str(end_date.day)
            mes_fin = meses_es.get(end_date.month, '')
            ano_fin = str(end_date.year)

        assigned_code = investor.assigned_code or "N/A"

        # Complete dictionary mapping covering all variations
        replacements = {
            # Acciones
            "acciones_otorgadas": shares_count,
            "acciones": shares_count,
            "shares": shares_count,
            "granted_shares": shares_count,
            "numero_acciones": shares_count,
            "cantidad_acciones": shares_count,
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
            "deudor": full_name,
            "acreedor": "GLOINT S.A.S.",

            # Documento e Identificación
            "documento": user_doc,
            "cedula": user_doc,
            "numero_documento": user_doc,
            "identificacion": user_doc,
            "tipo_documento": doc_type,
            "ciudad": user_city,
            "domicilio": user_city,
            "ciudad_inversionista": user_city,

            # Contacto
            "correo": user_email,
            "correo_electronico": user_email,
            "email": user_email,
            "telefono": user_phone,
            "celular": user_phone,
            "phone": user_phone,
            "telefono_inversionista": user_phone,

            # Montos del Paquete e Inversión
            "paquete_accion_adquirido": monto_fmt,
            "paquete_adquirido": monto_fmt,
            "paquete_inversion": monto_fmt,
            "paquete_valor": monto_fmt,
            "valor_paquete": monto_fmt,
            "paquete": monto_fmt,
            "monto_inversion": monto_fmt,
            "monto": monto_fmt,
            "monto_numeros": monto_sin_signo,
            "monto_capital": monto_fmt,
            "capital": monto_fmt,
            "valor_inversion": monto_fmt,
            "valor_contrato": monto_fmt,
            "total_contrato": monto_fmt,
            "valor_total_contrato": monto_fmt,
            "valor": monto_fmt,
            "monto_letras": monto_en_letras,
            "valor_en_letras": monto_en_letras,
            "monto_en_letras": monto_en_letras,
            "suma_en_letras": monto_en_letras,
            "suma_letras": monto_en_letras,

            # Fechas
            "fecha_ingreso": start_date_str,
            "fecha_inicio": start_date_str,
            "fecha_creacion": start_date_str,
            "fecha_emision": start_date_long,
            "fecha_inicio_larga": start_date_long,
            "fecha_fin": end_date_str,
            "fecha_finalizacion": end_date_str,
            "fecha_vencimiento": end_date_str,
            "fecha_fin_larga": end_date_long,
            "fecha_vencimiento_larga": end_date_long,
            "dia_inicio": dia_inicio,
            "mes_inicio": mes_inicio,
            "ano_inicio": ano_inicio,
            "dia_fin": dia_fin,
            "mes_fin": mes_fin,
            "ano_fin": ano_fin,

            # Periodo y porcentajes
            "periodo_porcentaje_numero": period_pct_clean,
            "periodo_porcentaje": period_pct,
            "periodo_porcentaje_formato": period_pct,
            "porcentaje_numero": period_pct_clean,
            "porcentaje_periodo_numero": period_pct_clean,
            "porcentaje_periodo": period_pct,
            "porcentaje_participacion_accionista": period_pct,
            "porcentaje_participacion": period_pct,
            "porcentaje_rentabilidad": period_pct,
            "porcentaje_mensual": period_pct,
            "porcentaje_mensual_numero": period_pct_clean,
            "porcentaje_interes": period_pct,
            "tasa_interes": period_pct,
            "tasa_interes_numero": period_pct_clean,
            "tasa_interes_formato": period_pct,
            "tasa_mensual": period_pct,
            "tasa_mensual_numero": period_pct_clean,
            "tasa": period_pct,
            "tasa_numero": period_pct_clean,
            "interes": period_pct,
            "interes_numero": period_pct_clean,
            "interes_mensual": period_pct,
            "interes_corriente": period_pct,
            "intereses_corrientes": period_pct,
            "interes_corriente_numero": period_pct_clean,
            "intereses_corrientes_numero": period_pct_clean,
            "rendimiento_mensual": period_pct,
            "rendimiento_aprobado_mensual": period_pct,
            "rentabilidad_contrato": period_pct,
            "porcentaje": period_pct,
            "porcentaje_sin_signo": period_pct_clean,
            "rendimiento_mensual_valor": rendimiento_mensual_fmt,
            "rendimiento_total_contrato": rendimiento_total_fmt,
            "rendimiento_total": rendimiento_total_fmt,
            "periodos_meses": period_months,
            "periodo_meses": period_months,
            "periodo_contrato": f"{period_months} meses",
            "duracion_meses": period_months,
            "meses": period_months,
            "periodo": period_months,
            "dias_contrato": period_days,
            "dias": period_days,
            "dias_vigencia": period_days,
            "vigencia": f"{period_days} días",
            "duracion_dias": period_days,

            # Código
            "codigo_inversion": assigned_code,
            "codigo_asignado": assigned_code,
            "codigo": assigned_code,
            "numero_pagare": assigned_code,
            "pagare_numero": assigned_code,

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
        from src.models.package import Package
        from src.models.period import Period

        result = await db.execute(
            select(Investor)
            .options(
                selectinload(Investor.user),
                selectinload(Investor.package),
                selectinload(Investor.period),
                selectinload(Investor.contract_histories)
            )
            .where(Investor.id == investor_id)
        )
        investor = result.scalars().first()
        if not investor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inversión no encontrada")

        # Defensive fallback if relationships were not loaded
        if investor.package is None and investor.package_id:
            pkg_res = await db.execute(select(Package).where(Package.id == investor.package_id))
            investor.package = pkg_res.scalars().first()

        if investor.period is None and investor.period_id:
            per_res = await db.execute(select(Period).where(Period.id == investor.period_id))
            investor.period = per_res.scalars().first()

        return investor

    @staticmethod
    async def preview_document(db: AsyncSession, data: InvestorDocumentPreviewRequest) -> dict:
        investor = await InvestorDocumentService.get_investor_with_relations(db, data.investor_id)
        
        tpl_res = await db.execute(select(Template).where(Template.id == data.template_id))
        template = tpl_res.scalars().first()
        if not template:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plantilla no encontrada")

        prev_res = await db.execute(
            select(InvestorDocument)
            .where(InvestorDocument.investor_id == investor.id)
            .where(InvestorDocument.template_id == template.id)
        )
        existing_docs = prev_res.scalars().all()
        version_count = len(existing_docs) + 1

        rendered_html = InvestorDocumentService.render_html(template.html_content, investor)
        
        if version_count > 1:
            title = f"{template.name} (v{version_count} - Actualización) - {investor.assigned_code or investor.id}"
        else:
            title = f"{template.name} - {investor.assigned_code or investor.id}"

        bg_img = data.background_image if data.background_image is not None else template.background_image

        return {
            "template_id": template.id,
            "template_name": template.name,
            "title": title,
            "version": version_count,
            "document_type": template.type or "contract",
            "html_content": rendered_html,
            "background_image": bg_img
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

        prev_res = await db.execute(
            select(InvestorDocument)
            .where(InvestorDocument.investor_id == investor.id)
            .where(InvestorDocument.template_id == template.id)
        )
        existing_docs = prev_res.scalars().all()
        version_count = len(existing_docs) + 1

        rendered_html = InvestorDocumentService.render_html(template.html_content, investor)
        
        if data.custom_title and data.custom_title.strip():
            title = data.custom_title.strip()
        else:
            if version_count > 1:
                title = f"{template.name} (v{version_count} - Actualización) - {investor.assigned_code or investor.id}"
        # Background image resolution:
        if data.background_image == "":
            bg_img = None
        elif template.background_image and template.background_image.strip():
            bg_img = template.background_image.strip()
        elif data.background_image and data.background_image.strip():
            bg_img = data.background_image.strip()
        else:
            bg_img = None

        doc = InvestorDocument(
            investor_id=investor.id,
            user_id=investor.user_id,
            template_id=template.id,
            title=title,
            document_type=template.type or "contract",
            html_content=rendered_html,
            background_image=bg_img
        )
        db.add(doc)

        # Registrar en ContractHistory para que figure como actualización de contrato en el timeline
        try:
            from src.models.contract_history import ContractHistory
            from decimal import Decimal
            from datetime import date

            start_d = investor.start_date.date() if isinstance(investor.start_date, datetime) else (investor.start_date or date.today())
            old_days = investor.period.days if investor.period else 365
            fecha_fin = start_d + timedelta(days=int(old_days))
            pkg_val = float(investor.package.value or 0) if investor.package else 0
            pct_val = f"{investor.period.percentage}%" if investor.period else "0%"
            shares_cnt = investor.package.granted_shares if investor.package else 0

            motivo_str = f"Actualización de Contrato (v{version_count})" if version_count > 1 else f"Emisión de {template.name}"

            history = ContractHistory(
                investor_id=investor.id,
                paquete_inversion_id=investor.package_id,
                contract_period_id=investor.period_id,
                fecha_inicio=start_d,
                fecha_fin=fecha_fin,
                dias_contrato=int(old_days),
                total_contrato=Decimal(str(pkg_val)),
                tasa_interes=pct_val,
                acciones_otorgadas=int(shares_cnt),
                valor_total_acciones=Decimal(str(pkg_val)),
                motivo=motivo_str,
                observaciones=f"Documento emitido: {title}"
            )
            db.add(history)
        except Exception as hist_err:
            print(f"Notice registering ContractHistory: {hist_err}")

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

    @staticmethod
    async def delete_all(db: AsyncSession, template_id: Optional[int] = None, investor_id: Optional[int] = None) -> int:
        await InvestorDocumentService.ensure_table_exists(db)
        from sqlalchemy import delete as sql_delete
        query = sql_delete(InvestorDocument)
        if template_id:
            query = query.where(InvestorDocument.template_id == template_id)
        if investor_id:
            query = query.where(InvestorDocument.investor_id == investor_id)
        
        result = await db.execute(query)
        await db.commit()
        return result.rowcount or 0

    @staticmethod
    async def bulk_generate(db: AsyncSession, data: InvestorDocumentBulkGenerateRequest) -> dict:
        await InvestorDocumentService.ensure_table_exists(db)
        from src.models.package import Package
        from src.models.period import Period
        from src.models.user import User

        tpl_res = await db.execute(select(Template).where(Template.id == data.template_id))
        template = tpl_res.scalars().first()
        # Background image resolution:
        if data.background_image == "":
            bg_img = None
        elif template.background_image and template.background_image.strip():
            bg_img = template.background_image.strip()
        elif data.background_image and data.background_image.strip():
            bg_img = data.background_image.strip()
        else:
            bg_img = None

        from sqlalchemy import func
        count_query = select(func.count(Investor.id))
        if data.target_type == "selected" and data.investor_ids:
            count_query = count_query.where(Investor.id.in_(data.investor_ids))
        
        total_count_res = await db.execute(count_query)
        total_candidates = total_count_res.scalar() or 0

        # Query batch of candidates
        query = select(Investor).options(
            selectinload(Investor.user),
            selectinload(Investor.package),
            selectinload(Investor.period),
            selectinload(Investor.contract_histories)
        ).order_by(Investor.id.asc())

        if data.target_type == "selected" and data.investor_ids:
            query = query.where(Investor.id.in_(data.investor_ids))
        
        offset = data.offset or 0
        batch_size = data.batch_size if data.batch_size and data.batch_size > 0 else 50

        query = query.offset(offset).limit(batch_size)
        
        result = await db.execute(query)
        candidates = result.scalars().all()

        generated_count = 0
        skipped_count = 0
        errors = []

        for investor in candidates:
            try:
                # Defensive fallback for package and period
                if investor.package is None and investor.package_id:
                    pkg_res = await db.execute(select(Package).where(Package.id == investor.package_id))
                    investor.package = pkg_res.scalars().first()

                if investor.period is None and investor.period_id:
                    per_res = await db.execute(select(Period).where(Period.id == investor.period_id))
                    investor.period = per_res.scalars().first()

                if investor.user is None and investor.user_id:
                    u_res = await db.execute(select(User).where(User.id == investor.user_id))
                    investor.user = u_res.scalars().first()

                # Check existing documents for this template
                prev_res = await db.execute(
                    select(InvestorDocument)
                    .where(InvestorDocument.investor_id == investor.id)
                    .where(InvestorDocument.template_id == template.id)
                )
                existing_docs = prev_res.scalars().all()

                if existing_docs and data.target_type == "without_document" and not data.overwrite_existing:
                    skipped_count += 1
                    continue

                version_count = len(existing_docs) + 1
                rendered_html = InvestorDocumentService.render_html(template.html_content, investor)

                if data.custom_title and data.custom_title.strip():
                    title = f"{data.custom_title.strip()} - {investor.assigned_code or investor.id}"
                else:
                    if version_count > 1:
                        title = f"{template.name} (v{version_count} - Actualización) - {investor.assigned_code or investor.id}"
                    else:
                        title = f"{template.name} - {investor.assigned_code or investor.id}"

                doc = InvestorDocument(
                    investor_id=investor.id,
                    user_id=investor.user_id,
                    template_id=template.id,
                    title=title,
                    document_type=template.type or "contract",
                    html_content=rendered_html,
                    background_image=bg_img
                )
                db.add(doc)
                generated_count += 1
            except Exception as e:
                errors.append(f"Error con inversionista {investor.assigned_code or investor.id}: {str(e)}")

        await db.commit()

        has_more = (offset + len(candidates)) < total_candidates
        next_offset = offset + len(candidates)

        return {
            "total_candidates": total_candidates,
            "generated_count": generated_count,
            "skipped_count": skipped_count,
            "processed_in_batch": len(candidates),
            "has_more": has_more,
            "next_offset": next_offset,
            "errors": errors
        }

