from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from src.models.security import Role, Permission
from src.schemas.security import RoleCreate, RoleUpdate

class SecurityService:

    @staticmethod
    async def get_all_roles(db: AsyncSession):
        result = await db.execute(select(Role).options(selectinload(Role.permissions)))
        return result.scalars().all()

    @staticmethod
    async def get_role(db: AsyncSession, role_id: int):
        result = await db.execute(
            select(Role)
            .options(selectinload(Role.permissions))
            .where(Role.id == role_id)
        )
        role = result.scalars().first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        return role

    @staticmethod
    async def create_role(db: AsyncSession, role_data: RoleCreate):
        # Verificar nombre duplicado
        existing = await db.execute(select(Role).where(Role.name == role_data.name))
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="Role name already exists")

        new_role = Role(name=role_data.name, description=role_data.description)
        
        # Asignar permisos si vienen en el request
        if role_data.permission_ids:
            perms_result = await db.execute(
                select(Permission).where(Permission.id.in_(role_data.permission_ids))
            )
            new_role.permissions = perms_result.scalars().all()

        db.add(new_role)
        await db.commit()
        
        # Recargar con relaciones para evitar MissingGreenlet
        result = await db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.id == new_role.id)
        )
        return result.scalars().first()

    @staticmethod
    async def update_role(db: AsyncSession, role_id: int, role_data: RoleUpdate):
        role = await SecurityService.get_role(db, role_id)
        
        if role.is_system_role == "1" and role_data.name and role_data.name != role.name:
            raise HTTPException(status_code=403, detail="Cannot rename system roles")

        if role_data.name is not None:
            # Check duplicate
            existing = await db.execute(select(Role).where(Role.name == role_data.name, Role.id != role_id))
            if existing.scalars().first():
                raise HTTPException(status_code=400, detail="Role name already exists")
            role.name = role_data.name
            
        if role_data.description is not None:
            role.description = role_data.description

        if role_data.permission_ids is not None:
            if not role_data.permission_ids:
                role.permissions = []
            else:
                perms_result = await db.execute(
                    select(Permission).where(Permission.id.in_(role_data.permission_ids))
                )
                role.permissions = perms_result.scalars().all()

        await db.commit()
        
        # Recargar con relaciones para evitar MissingGreenlet
        result = await db.execute(
            select(Role).options(selectinload(Role.permissions)).where(Role.id == role.id)
        )
        return result.scalars().first()

    @staticmethod
    async def delete_role(db: AsyncSession, role_id: int):
        role = await SecurityService.get_role(db, role_id)
        if role.is_system_role == "1":
            raise HTTPException(status_code=403, detail="Cannot delete system roles")
        
        # Verificar si hay usuarios con este rol
        from sqlalchemy import select, func
        from src.models.security import user_roles
        
        users_count_query = select(func.count()).select_from(user_roles).where(user_roles.c.role_id == role_id)
        result = await db.execute(users_count_query)
        count = result.scalar()
        
        if count > 0:
            raise HTTPException(status_code=400, detail="No se puede eliminar el rol porque hay usuarios que lo tienen asignado")
            
        await db.delete(role)
        await db.commit()

    @staticmethod
    async def get_all_permissions(db: AsyncSession):
        result = await db.execute(select(Permission))
        return result.scalars().all()
        

