from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from src.core.database import get_db
from src.models.user import User
from src.core.pbac import PBACEngine
from src.api.dependencies.auth_deps import get_current_user, RequirePermission
from src.services.crm_service import CRMService
from src.schemas.commercial_sale import CommercialSaleCreate
from src.services.commercial_sale_service import register_commercial_sale

router = APIRouter(prefix="/crm", tags=["CRM"])

# Pydantic Schemas
class ProjectCreateSchema(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    target_amount: float
    status: Optional[str] = "activo"
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class LeadCreateSchema(BaseModel):
    project_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    document_id: Optional[str] = None
    estimated_amount: float = 0.0
    stage: Optional[str] = "lead_entrante"
    source: Optional[str] = "Directo"
    commercial_id: Optional[int] = None

class StageUpdateSchema(BaseModel):
    stage: str
    loss_reason: Optional[str] = None
    estimated_amount: Optional[float] = None

class ActivityCreateSchema(BaseModel):
    type: str = "nota"
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None

class ConvertLeadSchema(BaseModel):
    sale_type: str = "contrato_nuevo"  # 'contrato_nuevo', 'reinversion', 'referido'
    referrer_client_id: Optional[int] = None
    referrer_code: Optional[str] = None
    commission_rate: float = 0.035  # 3.5% por defecto


@router.get("/kpis", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_crm_kpis(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene los KPIs consolidados del CRM."""
    is_admin = PBACEngine.has_permission(current_user, "admin.crm.manage") or current_user.is_superuser
    commercial_filter = None if is_admin else current_user.id
    return await CRMService.get_global_kpis(db, commercial_id=commercial_filter)


@router.get("/projects", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_crm_projects(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene la lista de proyectos CRM con progreso de metas."""
    return await CRMService.get_projects(db, search=search, status=status)


@router.post("/projects", dependencies=[Depends(RequirePermission("crm:projects:manage"))])
async def create_crm_project(
    data: ProjectCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo proyecto de inversión comercial en el CRM."""
    try:
        project = await CRMService.create_project(db, data.dict())
        return {"message": "Proyecto creado exitosamente", "id": project.id, "code": project.code}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al crear el proyecto: {str(e)}")


@router.get("/projects/{project_id}/leads", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_project_leads(
    project_id: int,
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene los prospectos asignados a un proyecto específico."""
    is_admin = PBACEngine.has_permission(current_user, "admin.crm.manage") or current_user.is_superuser
    commercial_filter = None if is_admin else current_user.id
    return await CRMService.get_leads_by_project(db, project_id=project_id, commercial_id=commercial_filter, search=search)


@router.post("/leads", dependencies=[Depends(RequirePermission("crm:leads:manage"))])
async def create_crm_lead(
    data: LeadCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea un nuevo prospecto en un proyecto CRM."""
    lead_dict = data.dict()
    # Si no especifica asesor, asignar el usuario actual si no es admin
    if not lead_dict.get("commercial_id"):
        lead_dict["commercial_id"] = current_user.id

    lead = await CRMService.create_lead(db, lead_dict)
    return {"message": "Prospecto registrado exitosamente", "id": lead.id}


@router.patch("/leads/{lead_id}/stage", dependencies=[Depends(RequirePermission("crm:leads:manage"))])
async def update_lead_stage(
    lead_id: int,
    data: StageUpdateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Actualiza la etapa de un prospecto (Kanban drag & drop)."""
    updated = await CRMService.update_lead_stage(
        db=db,
        lead_id=lead_id,
        new_stage=data.stage,
        loss_reason=data.loss_reason,
        estimated_amount=data.estimated_amount
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")
    return {"message": "Etapa actualizada correctamente", "data": updated}


@router.get("/leads/{lead_id}/activities", dependencies=[Depends(RequirePermission("crm:view"))])
async def get_lead_activities(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Obtiene el timeline de actividades y notas de un prospecto."""
    return await CRMService.get_lead_activities(db, lead_id)


@router.post("/leads/{lead_id}/activities", dependencies=[Depends(RequirePermission("crm:leads:manage"))])
async def add_lead_activity(
    lead_id: int,
    data: ActivityCreateSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Agrega una nueva nota, llamada, reunión o tarea a la ficha del prospecto."""
    act = await CRMService.add_activity(db, lead_id=lead_id, user_id=current_user.id, data=data.dict())
    return {"message": "Actividad registrada exitosamente", "id": act.id}


@router.post("/leads/{lead_id}/convert", dependencies=[Depends(RequirePermission("crm:leads:manage"))])
async def convert_lead_to_sale(
    lead_id: int,
    data: ConvertLeadSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Convierte un prospecto en 'Cierre Ganado' y genera automáticamente la venta en el módulo Comercial."""
    from src.models.crm import CRMLead
    lead = await db.get(CRMLead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Prospecto no encontrado")

    if not lead.document_id:
        raise HTTPException(status_code=400, detail="El prospecto debe tener asignado un Documento de Identificación para registrar la Venta Comercial.")

    # 1. Marcar como Cierre Ganado en CRM
    await CRMService.update_lead_stage(db, lead_id=lead_id, new_stage="cierre_ganado")

    # 2. Registrar venta comercial
    commercial_id = lead.commercial_id or current_user.id
    sale_schema = CommercialSaleCreate(
        client_document=lead.document_id,
        client_name=lead.name,
        sale_type=data.sale_type,
        amount=lead.estimated_amount,
        referrer_code=data.referrer_code
    )

    try:
        sale = await register_commercial_sale(db, sale_schema, commercial_id)
        return {
            "message": "¡Prospecto convertido exitosamente a Cierre Ganado y Venta Comercial registrada!",
            "sale_id": sale.id,
            "lead_id": lead.id
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al registrar la venta comercial: {str(e)}")
