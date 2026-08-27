from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, Field
from typing import List, Optional, Any

from src.core.database import get_db
from src.api.deps import RequirePermission, get_current_user
from src.models.user import User
from src.services.investment_rank_service import InvestmentRankService

router = APIRouter()

class RankCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: Optional[str] = None
    min_investment: float = Field(0.0, ge=0)
    max_investment: Optional[float] = None
    bonus_percentage: float = Field(0.0, ge=0, le=100)
    color: str = Field("#EAB308", max_length=50)
    icon: str = Field("trophy", max_length=50)
    priority_withdrawal: bool = False
    benefits: List[str] = []
    order: int = Field(1, ge=1)
    is_active: bool = True

class RankUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    min_investment: Optional[float] = None
    max_investment: Optional[float] = None
    bonus_percentage: Optional[float] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    priority_withdrawal: Optional[bool] = None
    benefits: Optional[List[str]] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class AssignUserRankRequest(BaseModel):
    user_id: int
    rank_id: Optional[int] = None # None means auto-calculate

@router.get("/rankings")
async def list_rankings(
    only_active: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todos los rangos configurados en el sistema con beneficios y número de usuarios.
    """
    return await InvestmentRankService.get_all_ranks(db, only_active=only_active)

@router.get("/rankings/me")
async def get_my_rank_details(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el rango actual, progreso al siguiente nivel y beneficios del usuario autenticado.
    """
    return await InvestmentRankService.get_user_rank_details(db, current_user.id)

@router.get("/rankings/user/{user_id}", dependencies=[Depends(RequirePermission(["admin.rankings.manage", "admin.users.manage", "admin.investors.manage", "admin.roles.manage"]))])
async def get_user_rank_details_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el estado de rango y progreso de un usuario específico para panel administrativo.
    """
    return await InvestmentRankService.get_user_rank_details(db, user_id)

@router.post("/rankings", status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission(["admin.rankings.manage", "admin.investors.manage", "admin.roles.manage", "admin.users.manage"]))])
async def create_ranking(
    rank_in: RankCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Crea un nuevo rango de inversión.
    """
    return await InvestmentRankService.create_rank(db, rank_in.model_dump())

@router.put("/rankings/{rank_id}", dependencies=[Depends(RequirePermission(["admin.rankings.manage", "admin.investors.manage", "admin.roles.manage", "admin.users.manage"]))])
async def update_ranking(
    rank_id: int,
    rank_in: RankUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza un rango existente.
    """
    update_data = {k: v for k, v in rank_in.model_dump().items() if v is not None}
    return await InvestmentRankService.update_rank(db, rank_id, update_data)

@router.delete("/rankings/{rank_id}", dependencies=[Depends(RequirePermission(["admin.rankings.manage", "admin.investors.manage", "admin.roles.manage", "admin.users.manage"]))])
async def delete_ranking(
    rank_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Elimina un rango de inversión.
    """
    return await InvestmentRankService.delete_rank(db, rank_id)

@router.post("/rankings/seed-defaults", dependencies=[Depends(RequirePermission(["admin.rankings.manage", "admin.investors.manage", "admin.roles.manage", "admin.users.manage"]))])
async def seed_default_rankings(
    db: AsyncSession = Depends(get_db)
):
    """
    Inicializa los rangos por defecto (Bronce, Plata, Oro, Platino, Diamante Black).
    """
    return await InvestmentRankService.seed_defaults(db)

@router.post("/rankings/assign-user", dependencies=[Depends(RequirePermission(["admin.rankings.manage", "admin.users.manage", "admin.investors.manage", "admin.roles.manage"]))])
async def assign_rank_to_user(
    assign_in: AssignUserRankRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Asigna manualmente un rango específico a un usuario o lo restablece a cálculo automático (rank_id = null).
    """
    user_res = await db.execute(select(User).where(User.id == assign_in.user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if assign_in.rank_id:
        rank = await InvestmentRankService.get_rank_by_id(db, assign_in.rank_id)
        user.rank_id = rank.id
    else:
        user.rank_id = None

    await db.commit()
    return await InvestmentRankService.get_user_rank_details(db, user.id)
