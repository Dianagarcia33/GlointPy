from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.core.database import get_db
from src.schemas.user import UserResponse
from src.schemas.security import AssignRoleToUser
from src.models.user import User
from src.models.security import Role

router = APIRouter()

@router.post("/{user_id}/roles", response_model=UserResponse)
async def assign_roles(user_id: int, assign_data: AssignRoleToUser, db: AsyncSession = Depends(get_db)):
    """
    Asigna un conjunto de roles a un usuario específico.
    Sobrescribe los roles anteriores con los nuevos proporcionados en la lista.
    """
    # 1. Buscar usuario
    result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Buscar los roles nuevos
    if assign_data.role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(assign_data.role_ids)))
        new_roles = roles_result.scalars().all()
    else:
        new_roles = []
        
    # 3. Reasignar
    user.roles = new_roles
    
    await db.commit()
    await db.refresh(user)
    
    return user
