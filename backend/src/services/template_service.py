from typing import Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from src.models.template import Template
from src.schemas.template import TemplateCreate, TemplateUpdate

class TemplateService:
    @staticmethod
    async def get_all(db: AsyncSession) -> Sequence[Template]:
        result = await db.execute(select(Template).order_by(Template.id.desc()))
        return result.scalars().all()

    @staticmethod
    async def get_by_id(db: AsyncSession, template_id: int) -> Template:
        result = await db.execute(select(Template).where(Template.id == template_id))
        template = result.scalars().first()
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plantilla no encontrada"
            )
        return template

    @staticmethod
    async def create(db: AsyncSession, data: TemplateCreate) -> Template:
        db_template = Template(**data.model_dump())
        db.add(db_template)
        await db.commit()
        await db.refresh(db_template)
        return db_template

    @staticmethod
    async def update(db: AsyncSession, template_id: int, data: TemplateUpdate) -> Template:
        db_template = await TemplateService.get_by_id(db, template_id)
        update_data = data.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(db_template, field, val)

        await db.commit()
        await db.refresh(db_template)
        return db_template

    @staticmethod
    async def delete(db: AsyncSession, template_id: int) -> None:
        db_template = await TemplateService.get_by_id(db, template_id)
        await db.delete(db_template)
        await db.commit()
