from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from src.core.database import get_db
from src.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse
from src.services.template_service import TemplateService

router = APIRouter(prefix="/templates", tags=["templates"])

@router.get("", response_model=List[TemplateResponse])
async def get_templates(db: AsyncSession = Depends(get_db)):
    return await TemplateService.get_all(db)

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    return await TemplateService.get_by_id(db, template_id)

@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    return await TemplateService.create(db, data)

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: int, data: TemplateUpdate, db: AsyncSession = Depends(get_db)):
    return await TemplateService.update(db, template_id, data)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    await TemplateService.delete(db, template_id)
    return None
