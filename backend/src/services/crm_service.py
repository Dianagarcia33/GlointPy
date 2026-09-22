from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, desc, or_, and_
from decimal import Decimal

import secrets
from src.models.crm import CRMProject, CRMLead, CRMActivity, CRMFormKey, CRMProjectStatus, CRMLeadStage, CRMActivityType
from src.models.user import User
from src.models.commercial_sale import CommercialSale
from datetime import datetime
from src.services.email_service import EmailService

class CRMService:
    @staticmethod
    async def get_projects(
        db: AsyncSession, 
        search: Optional[str] = None, 
        status: Optional[str] = None
    ) -> List[dict]:
        """Obtiene la lista de proyectos CRM con cálculo de recaudación y avance."""
        stmt = select(CRMProject).options(selectinload(CRMProject.leads))
        
        if status:
            stmt = stmt.where(CRMProject.status == status)
        if search:
            stmt = stmt.where(or_(
                CRMProject.name.ilike(f"%{search}%"),
                CRMProject.code.ilike(f"%{search}%")
            ))
            
        stmt = stmt.order_by(desc(CRMProject.created_at))
        res = await db.execute(stmt)
        projects = res.scalars().unique().all()
        
        result = []
        for p in projects:
            # Calcular recaudación real de leads en 'cierre_ganado'
            won_sum = sum(l.estimated_amount or 0 for l in p.leads if l.stage == CRMLeadStage.CIERRE_GANADO)
            target = p.target_amount or Decimal("1")
            progress_pct = min(100.0, float((won_sum / target) * 100)) if target > 0 else 0.0
            
            result.append({
                "id": p.id,
                "code": p.code,
                "name": p.name,
                "description": p.description,
                "target_amount": float(p.target_amount),
                "raised_amount": float(won_sum),
                "progress_percentage": round(progress_pct, 1),
                "status": p.status,
                "total_leads": len(p.leads),
                "active_leads": len([l for l in p.leads if l.stage not in [CRMLeadStage.CIERRE_GANADO, CRMLeadStage.PERDIDO]]),
                "won_leads": len([l for l in p.leads if l.stage == CRMLeadStage.CIERRE_GANADO]),
                "start_date": p.start_date.isoformat() if p.start_date else None,
                "end_date": p.end_date.isoformat() if p.end_date else None,
                "created_at": p.created_at.isoformat() if p.created_at else None
            })
            
        return result

    @staticmethod
    async def create_project(db: AsyncSession, data: dict) -> CRMProject:
        """Crea un nuevo Proyecto de Inversión en el CRM."""
        project = CRMProject(
            code=data["code"].upper().strip(),
            name=data["name"].strip(),
            description=data.get("description"),
            target_amount=Decimal(str(data.get("target_amount", 0))),
            status=data.get("status", CRMProjectStatus.ACTIVO),
            start_date=data.get("start_date"),
            end_date=data.get("end_date")
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def get_project(db: AsyncSession, project_id: int) -> Optional[CRMProject]:
        """Obtiene un proyecto por ID."""
        return await db.get(CRMProject, project_id)

    @staticmethod
    async def update_project(db: AsyncSession, project_id: int, data: dict) -> CRMProject:
        """Actualiza un Proyecto de Inversión en el CRM."""
        project = await db.get(CRMProject, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        if "code" in data and data["code"]:
            project.code = data["code"].upper().strip()
        if "name" in data and data["name"]:
            project.name = data["name"].strip()
        if "description" in data:
            project.description = data["description"]
        if "target_amount" in data and data["target_amount"] is not None:
            project.target_amount = Decimal(str(data["target_amount"]))
        if "status" in data and data["status"]:
            project.status = data["status"]
        if "start_date" in data:
            project.start_date = data["start_date"]
        if "end_date" in data:
            project.end_date = data["end_date"]
            
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: int) -> bool:
        """Elimina un Proyecto de Inversión en el CRM."""
        project = await db.get(CRMProject, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Proyecto no encontrado")
        
        await db.delete(project)
        await db.commit()
        return True

    @staticmethod
    async def get_leads_by_project(
        db: AsyncSession, 
        project_id: int, 
        commercial_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> List[dict]:
        """Obtiene todos los leads pertenecientes a un proyecto específico."""
        stmt = (
            select(CRMLead)
            .options(selectinload(CRMLead.commercial), selectinload(CRMLead.activities))
            .where(CRMLead.project_id == project_id)
        )
        
        if commercial_id:
            stmt = stmt.where(CRMLead.commercial_id == commercial_id)
        if search:
            stmt = stmt.where(or_(
                CRMLead.name.ilike(f"%{search}%"),
                CRMLead.email.ilike(f"%{search}%"),
                CRMLead.phone.ilike(f"%{search}%")
            ))
            
        stmt = stmt.order_by(desc(CRMLead.created_at))
        res = await db.execute(stmt)
        leads = res.scalars().unique().all()
        
        return [
            {
                "id": l.id,
                "project_id": l.project_id,
                "name": l.name,
                "email": l.email,
                "phone": l.phone,
                "document_id": l.document_id,
                "estimated_amount": float(l.estimated_amount),
                "stage": l.stage,
                "source": l.source,
                "commercial_id": l.commercial_id,
                "commercial_name": l.commercial.name if l.commercial else "Sin asignar",
                "loss_reason": l.loss_reason,
                "activities_count": len(l.activities),
                "created_at": l.created_at.isoformat() if l.created_at else None,
                "updated_at": l.updated_at.isoformat() if l.updated_at else None
            }
            for l in leads
        ]

    @staticmethod
    async def create_lead(db: AsyncSession, data: dict) -> CRMLead:
        """Registra un nuevo prospecto en un proyecto CRM."""
        lead = CRMLead(
            project_id=data["project_id"],
            name=data["name"].strip(),
            email=data.get("email"),
            phone=data.get("phone"),
            document_id=data.get("document_id"),
            estimated_amount=Decimal(str(data.get("estimated_amount", 0))),
            stage=data.get("stage", CRMLeadStage.LEAD_ENTRANTE),
            source=data.get("source", "Directo"),
            commercial_id=data.get("commercial_id")
        )
        db.add(lead)
        await db.commit()
        await db.refresh(lead)
        return lead

    @staticmethod
    async def update_lead_stage(
        db: AsyncSession, 
        lead_id: int, 
        new_stage: str, 
        loss_reason: Optional[str] = None,
        estimated_amount: Optional[float] = None
    ) -> Optional[dict]:
        """Actualiza la etapa de un lead (movimiento en Kanban)."""
        lead = await db.get(CRMLead, lead_id)
        if not lead:
            return None

        lead.stage = new_stage
        if loss_reason:
            lead.loss_reason = loss_reason
        if estimated_amount is not None:
            lead.estimated_amount = Decimal(str(estimated_amount))

        await db.commit()
        await db.refresh(lead)

        return {
            "id": lead.id,
            "project_id": lead.project_id,
            "stage": lead.stage,
            "estimated_amount": float(lead.estimated_amount),
            "loss_reason": lead.loss_reason
        }

    @staticmethod
    async def add_activity(db: AsyncSession, lead_id: int, user_id: int, data: dict) -> CRMActivity:
        """Registra una nota, llamada, reunión o tarea en la ficha del prospecto."""
        activity = CRMActivity(
            lead_id=lead_id,
            user_id=user_id,
            type=data.get("type", CRMActivityType.NOTA),
            title=data["title"].strip(),
            description=data.get("description"),
            due_date=data.get("due_date"),
            is_completed=data.get("is_completed", False)
        )
        db.add(activity)
        await db.commit()
        await db.refresh(activity)
        return activity

    @staticmethod
    async def get_lead_activities(db: AsyncSession, lead_id: int) -> List[dict]:
        """Obtiene el timeline de actividades de un prospecto."""
        stmt = (
            select(CRMActivity)
            .options(selectinload(CRMActivity.user))
            .where(CRMActivity.lead_id == lead_id)
            .order_by(desc(CRMActivity.created_at))
        )
        res = await db.execute(stmt)
        activities = res.scalars().all()

        return [
            {
                "id": a.id,
                "lead_id": a.lead_id,
                "user_id": a.user_id,
                "user_name": a.user.name if a.user else "Usuario",
                "type": a.type,
                "title": a.title,
                "description": a.description,
                "due_date": a.due_date.isoformat() if a.due_date else None,
                "is_completed": a.is_completed,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in activities
        ]

    @staticmethod
    async def get_global_kpis(db: AsyncSession, commercial_id: Optional[int] = None) -> dict:
        """Obtiene los KPIs consolidados del CRM."""
        # Total de proyectos activos
        p_stmt = select(func.count(CRMProject.id)).where(CRMProject.status == CRMProjectStatus.ACTIVO)
        p_res = await db.execute(p_stmt)
        total_projects = p_res.scalar() or 0

        # Leads por etapa
        l_stmt = select(CRMLead)
        if commercial_id:
            l_stmt = l_stmt.where(CRMLead.commercial_id == commercial_id)
        l_res = await db.execute(l_stmt)
        leads = l_res.scalars().all()

        total_leads = len(leads)
        won_leads = len([l for l in leads if l.stage == CRMLeadStage.CIERRE_GANADO])
        pipeline_amount = sum(l.estimated_amount or 0 for l in leads if l.stage not in [CRMLeadStage.CIERRE_GANADO, CRMLeadStage.PERDIDO])
        won_amount = sum(l.estimated_amount or 0 for l in leads if l.stage == CRMLeadStage.CIERRE_GANADO)
        conversion_rate = round((won_leads / total_leads * 100), 1) if total_leads > 0 else 0.0

        return {
            "total_projects": total_projects,
            "total_leads": total_leads,
            "won_leads": won_leads,
            "pipeline_amount": float(pipeline_amount),
            "won_amount": float(won_amount),
            "conversion_rate": conversion_rate
        }

    @staticmethod
    async def get_or_create_default_project(db: AsyncSession) -> CRMProject:
        """Obtiene un proyecto activo del CRM o crea uno por defecto para los leads del fondo."""
        stmt = select(CRMProject).where(CRMProject.status == CRMProjectStatus.ACTIVO).order_by(CRMProject.id.asc())
        res = await db.execute(stmt)
        project = res.scalars().first()
        if not project:
            stmt_any = select(CRMProject).order_by(CRMProject.id.asc())
            res_any = await db.execute(stmt_any)
            project = res_any.scalars().first()
            
        if not project:
            project = CRMProject(
                code="FONDO-GLOINT",
                name="Fondo Gloint Investment",
                description="Proyecto general para prospectos calificados e inversionistas captados vía chatbot y web.",
                target_amount=Decimal("1000000000.00"),
                status=CRMProjectStatus.ACTIVO,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(project)
            await db.commit()
            await db.refresh(project)
            
        return project

    @staticmethod
    async def get_or_create_project_by_identifier(db: AsyncSession, identifier: Optional[str] = None) -> CRMProject:
        """
        Obtiene un proyecto por código o nombre, o crea uno nuevo automáticamente si no existe.
        Si no se especifica identifier, retorna el proyecto por defecto.
        """
        if not identifier or not str(identifier).strip():
            return await CRMService.get_or_create_default_project(db)

        clean_id = str(identifier).strip()
        stmt = select(CRMProject).where(
            (func.lower(CRMProject.code) == clean_id.lower()) |
            (func.lower(CRMProject.name) == clean_id.lower())
        )
        res = await db.execute(stmt)
        project = res.scalars().first()
        if project:
            return project

        # Crear proyecto automáticamente para que el CRM lo organice de inmediato
        code_slug = clean_id.upper().replace(" ", "-")[:50]
        name_display = clean_id.strip()[:100]
        new_project = CRMProject(
            code=code_slug,
            name=name_display,
            description=f"Proyecto creado automáticamente para captación de leads desde {name_display}",
            target_amount=Decimal("500000000.00"),
            status=CRMProjectStatus.ACTIVO,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(new_project)
        await db.commit()
        await db.refresh(new_project)
        return new_project

    @staticmethod
    async def assign_commercial_round_robin(db: AsyncSession) -> Optional[User]:
        """
        Selecciona de manera equitativa (Round-Robin) al siguiente Directivo de Inversión activo.
        Prioriza estrictamente usuarios con rol 'Directivo de Inversión' ('directiv').
        """
        stmt = (
            select(User)
            .options(selectinload(User.roles))
            .where(User.is_active == True)
            .order_by(User.id.asc())
        )
        res = await db.execute(stmt)
        all_users = res.scalars().all()
        
        # 1. Prioridad estricta: usuarios que tengan rol explícito de Directivo de Inversión
        directivos = []
        comerciales_secundarios = []
        for u in all_users:
            role_names = [r.name.lower() for r in (u.roles or [])]
            if any("directiv" in r_name for r_name in role_names):
                directivos.append(u)
            elif any(
                any(kw in r_name for kw in ["comercial", "asesor", "lider", "director", "gerente"])
                for r_name in role_names
            ):
                comerciales_secundarios.append(u)
                
        # Si no hay directivos específicos, usar comerciales secundarios
        if not directivos and comerciales_secundarios:
            directivos = comerciales_secundarios
            
        # Si no hay usuarios con rol directivo/comercial explícito, incluir superusuarios
        if not directivos:
            for u in all_users:
                if u.is_superuser:
                    directivos.append(u)
                    
        if not directivos and all_users:
            directivos = [all_users[0]]
            
        if not directivos:
            return None

        # Contar cuántos leads entrantes tiene asignado cada directivo
        directivo_ids = [d.id for d in directivos]
        count_stmt = (
            select(CRMLead.commercial_id, func.count(CRMLead.id))
            .where(
                CRMLead.commercial_id.in_(directivo_ids)
            )
            .group_by(CRMLead.commercial_id)
        )
        count_res = await db.execute(count_stmt)
        counts_map = {row[0]: row[1] for row in count_res.all()}

        # Ordenar equitativamente por menor cantidad de leads asignados (desempate por ID)
        directivos.sort(key=lambda d: (counts_map.get(d.id, 0), d.id))
        return directivos[0]

    @staticmethod
    async def register_chatbot_lead(db: AsyncSession, data: dict) -> dict:
        """
        Registra un lead desde el chatbot, le asigna un directivo equitativamente (Round-Robin),
        crea la nota con el perfil y envía las notificaciones por correo electrónico.
        """
        project = await CRMService.get_or_create_default_project(db)
        assigned_commercial = await CRMService.assign_commercial_round_robin(db)

        amount_val = Decimal(str(data.get("package_value") or 0))

        lead = CRMLead(
            project_id=project.id,
            name=data["name"].strip(),
            email=data["email"].strip().lower(),
            phone=data["phone"].strip(),
            estimated_amount=amount_val,
            stage=CRMLeadStage.LEAD_ENTRANTE,
            source="Chatbot",
            commercial_id=assigned_commercial.id if assigned_commercial else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(lead)
        await db.flush()

        # Registrar actividad inicial con todos los detalles recogidos
        if assigned_commercial:
            detail_lines = [
                f"📍 Ubicación: {data.get('city') or 'No especificada'} ({data.get('department') or ''})",
                f"💼 Paquete de interés: {data.get('package_name') or f'${amount_val:,.0f} COP'}",
                f"🎯 Objetivo: {data.get('investment_goal') or 'Inversión General'}",
                f"⏰ Horario preferido de contacto: {data.get('preferred_contact_time') or 'Indiferente'}",
            ]
            if data.get("notes"):
                detail_lines.append(f"📝 Notas adicionales: {data.get('notes')}")

            note = CRMActivity(
                lead_id=lead.id,
                user_id=assigned_commercial.id,
                type=CRMActivityType.NOTA,
                title="Prospecto calificado por Chatbot Web",
                description="\n".join(detail_lines),
                created_at=datetime.utcnow()
            )
            db.add(note)

        await db.commit()
        await db.refresh(lead)

        # Enviar correos
        try:
            if assigned_commercial and assigned_commercial.email:
                EmailService.send_chatbot_lead_director_notification(
                    to_email=assigned_commercial.email,
                    director_name=assigned_commercial.name or assigned_commercial.email,
                    lead_data=data
                )

            EmailService.send_chatbot_lead_investor_confirmation(
                to_email=data["email"].strip(),
                investor_name=data["name"].strip(),
                director_name=assigned_commercial.name if assigned_commercial else "Mesa Directiva",
                package_name=data.get("package_name") or f"${amount_val:,.0f} COP",
                preferred_time=data.get("preferred_contact_time")
            )
        except Exception as e:
            print(f"Error enviando correos de lead chatbot: {e}")

        return {
            "success": True,
            "message": "Prospecto registrado y asignado exitosamente",
            "lead_id": lead.id,
            "assigned_commercial": {
                "id": assigned_commercial.id,
                "name": assigned_commercial.name
            } if assigned_commercial else None
        }

    @staticmethod
    async def register_contact_form_lead(
        db: AsyncSession,
        data: dict,
        project_override: Optional[str] = None
    ) -> dict:
        """
        Registra un lead desde el formulario de contacto estándar (Gloint o landings externas).
        Campos estándar: nombre, email, telefono, asunto, mensaje, proyecto/origen.
        Distribuye equitativamente (Round-Robin) entre los Directivos de Inversión y envía notificación por correo.
        """
        name = (data.get("nombre") or data.get("name") or "").strip() or "Prospecto Web"
        raw_email = (data.get("email") or "").strip().lower()
        email = raw_email if raw_email else None
        phone = (data.get("telefono") or data.get("phone") or "").strip() or None
        asunto = (data.get("asunto") or data.get("subject") or "Contacto General").strip()
        mensaje = (data.get("mensaje") or data.get("message") or "").strip()
        
        project_ref = (
            project_override or 
            data.get("proyecto") or 
            data.get("project_code") or 
            data.get("project_name") or 
            "Fondo Gloint Investment"
        )

        project = await CRMService.get_or_create_project_by_identifier(db, project_ref)
        assigned_commercial = await CRMService.assign_commercial_round_robin(db)

        source_label = f"Formulario: {project.name}"

        lead = CRMLead(
            project_id=project.id,
            name=name,
            email=email,
            phone=phone,
            estimated_amount=Decimal(str(data.get("estimated_amount") or 0)),
            stage=CRMLeadStage.LEAD_ENTRANTE,
            source=source_label,
            commercial_id=assigned_commercial.id if assigned_commercial else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(lead)
        await db.flush()

        detail_lines = [
            f"🌐 Proyecto / Origen: {project.name} ({project.code})",
            f"👤 Nombre: {name}",
            f"📧 Correo: {email or 'No especificado'}",
            f"📞 Teléfono: {phone or 'No especificado'}",
            f"📌 Asunto: {asunto}",
        ]
        if data.get("company"):
            detail_lines.append(f"🏢 Empresa: {data.get('company')}")
        if data.get("city"):
            detail_lines.append(f"📍 Ciudad: {data.get('city')}")
        if mensaje:
            detail_lines.append(f"💬 Mensaje:\n{mensaje}")

        extra_meta = data.get("metadata")
        if extra_meta and isinstance(extra_meta, dict):
            detail_lines.append("⚙️ Metadatos adicionales:")
            for k, v in extra_meta.items():
                detail_lines.append(f"  • {k}: {v}")

        note = CRMActivity(
            lead_id=lead.id,
            user_id=assigned_commercial.id if assigned_commercial else 1,
            type=CRMActivityType.NOTA,
            title=f"Contacto entrante: {asunto}",
            description="\n".join(detail_lines),
            created_at=datetime.utcnow()
        )
        db.add(note)

        await db.commit()
        await db.refresh(lead)

        # Notificar por correo al directivo de inversión asignado
        try:
            if assigned_commercial and assigned_commercial.email:
                payload_for_email = {
                    "name": name,
                    "email": email,
                    "phone": phone,
                    "company": data.get("company") or asunto,
                    "city": data.get("city") or "No especificada",
                    "message": f"Asunto: {asunto}\n\nMensaje:\n{mensaje}" if mensaje else f"Asunto: {asunto}"
                }
                EmailService.send_external_form_director_notification(
                    to_email=assigned_commercial.email,
                    director_name=assigned_commercial.name or assigned_commercial.email,
                    platform_name=project.name,
                    lead_data=payload_for_email
                )
        except Exception as e:
            print(f"Error notificando al directivo de inversión: {e}")

        return {
            "success": True,
            "message": "Mensaje recibido correctamente. Un directivo de inversión se pondrá en contacto a la brevedad.",
            "lead_id": lead.id,
            "project": {
                "id": project.id,
                "code": project.code,
                "name": project.name
            },
            "assigned_director": {
                "id": assigned_commercial.id,
                "name": assigned_commercial.name
            } if assigned_commercial else None
        }

    @staticmethod
    async def register_external_form_lead(db: AsyncSession, app_name: str, data: dict) -> dict:
        """
        Registra un lead proveniente de una web o formulario externo (Logy Pay, Landings, etc.)
        autenticado mediante API Key. Asigna de forma equitativa (Round-Robin) a los comerciales
        activos y dispara notificación inmediata por correo.
        """
        project = await CRMService.get_or_create_project_by_identifier(db, app_name)
        assigned_commercial = await CRMService.assign_commercial_round_robin(db)

        source_label = f"Formulario: {app_name}"

        name = (data.get("name") or data.get("nombre") or "").strip() or "Prospecto Web"
        raw_email = (data.get("email") or "").strip().lower()
        email = raw_email if raw_email else None
        phone = (data.get("phone") or data.get("telefono") or "").strip() or None

        lead = CRMLead(
            project_id=project.id,
            name=name,
            email=email,
            phone=phone,
            estimated_amount=Decimal(str(data.get("estimated_amount") or 0)),
            stage=CRMLeadStage.LEAD_ENTRANTE,
            source=source_label,
            commercial_id=assigned_commercial.id if assigned_commercial else None,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(lead)
        await db.flush()

        # Registrar actividad inicial con los detalles del formulario externo
        detail_lines = [
            f"🌐 Origen / Plataforma: {app_name}",
            f"👤 Nombre: {name}",
            f"📧 Correo: {email or 'No especificado'}",
            f"📞 Teléfono: {phone or 'No especificado'}",
        ]
        if data.get("company"):
            detail_lines.append(f"🏢 Empresa: {data.get('company')}")
        if data.get("city"):
            detail_lines.append(f"📍 Ciudad / Ubicación: {data.get('city')}")
        if data.get("message"):
            detail_lines.append(f"💬 Mensaje / Solicitud:\n{data.get('message')}")
        
        extra_meta = data.get("metadata")
        if extra_meta and isinstance(extra_meta, dict):
            detail_lines.append("📌 Metadatos adicionales:")
            for k, v in extra_meta.items():
                detail_lines.append(f"  • {k}: {v}")

        note = CRMActivity(
            lead_id=lead.id,
            user_id=assigned_commercial.id if assigned_commercial else 1,
            type=CRMActivityType.NOTA,
            title=f"Contacto entrante desde {app_name}",
            description="\n".join(detail_lines),
            created_at=datetime.utcnow()
        )
        db.add(note)

        await db.commit()
        await db.refresh(lead)

        # Enviar notificación por correo al asesor asignado
        try:
            if assigned_commercial and assigned_commercial.email:
                EmailService.send_external_form_director_notification(
                    to_email=assigned_commercial.email,
                    director_name=assigned_commercial.name or assigned_commercial.email,
                    platform_name=app_name,
                    lead_data=data
                )
        except Exception as e:
            print(f"Error enviando notificación al asesor para lead externo ({app_name}): {e}")

        return {
            "success": True,
            "message": f"Lead de {app_name} recibido y asignado exitosamente",
            "lead_id": lead.id,
            "source": source_label,
            "assigned_commercial": {
                "id": assigned_commercial.id,
                "name": assigned_commercial.name
            } if assigned_commercial else None
        }

    @staticmethod
    async def create_form_key(
        db: AsyncSession,
        name: str,
        project_id: int,
        user_id: Optional[int] = None
    ) -> dict:
        """Crea una nueva API Key específica para un formulario de contacto de un proyecto."""
        project = await db.get(CRMProject, project_id)
        if not project:
            raise HTTPException(status_code=404, detail="El proyecto especificado no existe.")

        raw_secret = secrets.token_hex(16)
        api_key_str = f"glt_form_{raw_secret}"

        form_key = CRMFormKey(
            name=name.strip(),
            project_id=project.id,
            api_key=api_key_str,
            is_active=True,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(form_key)
        await db.commit()
        await db.refresh(form_key)

        return {
            "id": form_key.id,
            "name": form_key.name,
            "project_id": project.id,
            "project_name": project.name,
            "project_code": project.code,
            "api_key": form_key.api_key,
            "is_active": form_key.is_active,
            "created_at": form_key.created_at.isoformat() if form_key.created_at else None
        }

    @staticmethod
    async def get_all_form_keys(db: AsyncSession) -> List[dict]:
        """Lista todas las API Keys de formularios de contacto con información del proyecto."""
        stmt = (
            select(CRMFormKey)
            .options(selectinload(CRMFormKey.project))
            .order_by(desc(CRMFormKey.created_at))
        )
        res = await db.execute(stmt)
        keys = res.scalars().all()

        result = []
        for k in keys:
            result.append({
                "id": k.id,
                "name": k.name,
                "project_id": k.project_id,
                "project_name": k.project.name if k.project else "Sin Proyecto",
                "project_code": k.project.code if k.project else "N/A",
                "api_key": k.api_key,
                "is_active": k.is_active,
                "created_at": k.created_at.isoformat() if k.created_at else None,
                "updated_at": k.updated_at.isoformat() if k.updated_at else None
            })
        return result

    @staticmethod
    async def toggle_form_key(db: AsyncSession, key_id: int) -> dict:
        """Activa o desactiva una API Key de formulario."""
        form_key = await db.get(CRMFormKey, key_id)
        if not form_key:
            raise HTTPException(status_code=404, detail="Clave de formulario no encontrada.")
        form_key.is_active = not form_key.is_active
        form_key.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(form_key)
        return {
            "id": form_key.id,
            "name": form_key.name,
            "is_active": form_key.is_active,
            "message": "Clave activada" if form_key.is_active else "Clave desactivada"
        }

    @staticmethod
    async def delete_form_key(db: AsyncSession, key_id: int) -> dict:
        """Elimina una API Key de formulario."""
        form_key = await db.get(CRMFormKey, key_id)
        if not form_key:
            raise HTTPException(status_code=404, detail="Clave de formulario no encontrada.")
        await db.delete(form_key)
        await db.commit()
        return {"success": True, "message": "Clave de formulario eliminada exitosamente"}

    @staticmethod
    async def authenticate_form_key(db: AsyncSession, raw_key: str) -> CRMFormKey:
        """Autentica una API Key de formulario y valida que esté activa."""
        stmt = (
            select(CRMFormKey)
            .options(selectinload(CRMFormKey.project))
            .where(
                CRMFormKey.api_key == raw_key.strip(),
                CRMFormKey.is_active == True
            )
        )
        res = await db.execute(stmt)
        form_key = res.scalars().first()
        if not form_key:
            raise HTTPException(
                status_code=401,
                detail="API Key de formulario ('X-API-Key') inválida o inactiva."
            )
        return form_key

