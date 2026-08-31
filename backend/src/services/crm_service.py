from typing import List, Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, desc, or_, and_
from decimal import Decimal

from src.models.crm import CRMProject, CRMLead, CRMActivity, CRMProjectStatus, CRMLeadStage, CRMActivityType
from src.models.user import User
from src.models.commercial_sale import CommercialSale

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
