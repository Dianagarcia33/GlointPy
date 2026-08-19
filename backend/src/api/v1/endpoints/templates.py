from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os, uuid
from src.core.database import get_db
from src.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse
from src.services.template_service import TemplateService
from src.api.deps import RequirePermission

router = APIRouter(prefix="/templates", tags=["templates"])

@router.post("/upload-asset")
async def upload_template_asset(
    file: UploadFile = File(...),
    current_user = Depends(RequirePermission(["admin.roles.manage", "admin.investors.manage"]))
):
    ext = os.path.splitext(file.filename or "")[1]
    if ext.lower() not in ['.png', '.jpg', '.jpeg', '.webp', '.svg']:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa imágenes PNG, JPG, WEBP o SVG")
    
    filename = f"bg_{uuid.uuid4().hex[:10]}{ext.lower()}"
    dest_dir = "uploads/templates"
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    url = f"/uploads/templates/{filename}"
    return {"url": url, "filename": filename}

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
