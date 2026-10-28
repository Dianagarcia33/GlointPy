from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import os, uuid
from src.core.database import get_db
from pydantic import BaseModel
from src.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse
from src.services.template_service import TemplateService
from src.services.investor_document_service import InvestorDocumentService
from src.api.deps import RequirePermission

router = APIRouter(prefix="/templates", tags=["templates"])

# Mismos permisos que la subida de membretes: gestión de plantillas (admin.roles.manage) y
# generación de documentos de inversionistas (admin.investors.manage). Antes el CRUD no exigía sesión.
TEMPLATE_PERMISSIONS = ["admin.roles.manage", "admin.investors.manage"]


class TemplateVariablesCheck(BaseModel):
    html_content: str = ""

@router.post("/upload-asset")
async def upload_template_asset(
    file: UploadFile = File(...),
    current_user = Depends(RequirePermission(["admin.roles.manage", "admin.investors.manage"]))
):
    ext = os.path.splitext(file.filename or "")[1]
    if ext.lower() not in ['.png', '.jpg', '.jpeg', '.webp', '.svg']:
        raise HTTPException(status_code=400, detail=f"Formato de archivo no permitido ({ext or 'sin extensión'}). Formatos admitidos para el membrete: PNG, JPG, WEBP o SVG.")
    
    filename = f"bg_{uuid.uuid4().hex[:10]}{ext.lower()}"
    dest_dir = "uploads/templates"
    os.makedirs(dest_dir, exist_ok=True)
    file_path = os.path.join(dest_dir, filename)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
        
    url = f"/uploads/templates/{filename}"
    return {"url": url, "filename": filename}

@router.post("/check-variables", dependencies=[Depends(RequirePermission(TEMPLATE_PERMISSIONS))])
async def check_template_variables(data: TemplateVariablesCheck):
    """Devuelve las variables {xxx} del HTML que el generador de documentos no reconoce."""
    return {"unknown_variables": InvestorDocumentService.find_unknown_variables(data.html_content)}

@router.get("", response_model=List[TemplateResponse], dependencies=[Depends(RequirePermission(TEMPLATE_PERMISSIONS))])
async def get_templates(db: AsyncSession = Depends(get_db)):
    return await TemplateService.get_all(db)

@router.get("/{template_id}", response_model=TemplateResponse, dependencies=[Depends(RequirePermission(TEMPLATE_PERMISSIONS))])
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    return await TemplateService.get_by_id(db, template_id)

@router.post("", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RequirePermission(TEMPLATE_PERMISSIONS))])
async def create_template(data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    return await TemplateService.create(db, data)

@router.put("/{template_id}", response_model=TemplateResponse, dependencies=[Depends(RequirePermission(TEMPLATE_PERMISSIONS))])
async def update_template(template_id: int, data: TemplateUpdate, db: AsyncSession = Depends(get_db)):
    return await TemplateService.update(db, template_id, data)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(RequirePermission(TEMPLATE_PERMISSIONS))])
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    await TemplateService.delete(db, template_id)
    return None
