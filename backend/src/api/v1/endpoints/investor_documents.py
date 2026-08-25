from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.investor_document import (
    InvestorDocumentResponse,
    InvestorDocumentGenerateRequest,
    InvestorDocumentPreviewRequest,
    InvestorDocumentBulkGenerateRequest,
    InvestorDocumentBulkGenerateResponse
)
from src.services.investor_document_service import InvestorDocumentService

router = APIRouter(prefix="/investor-documents", tags=["investor-documents"])

@router.post("/preview")
async def preview_document(
    data: InvestorDocumentPreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["admin.investors.manage", "admin.roles.manage"]))
):
    return await InvestorDocumentService.preview_document(db, data)

@router.post("/generate", response_model=InvestorDocumentResponse, status_code=status.HTTP_201_CREATED)
async def generate_document(
    data: InvestorDocumentGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["admin.investors.manage", "admin.roles.manage"]))
):
    return await InvestorDocumentService.generate_and_save(db, data)

@router.post("/bulk-generate", response_model=InvestorDocumentBulkGenerateResponse, status_code=status.HTTP_200_OK)
async def bulk_generate_documents(
    data: InvestorDocumentBulkGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["admin.investors.manage", "admin.roles.manage"]))
):
    return await InvestorDocumentService.bulk_generate(db, data)

@router.get("/investor/{investor_id}", response_model=List[InvestorDocumentResponse])
async def get_documents_by_investor(
    investor_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["admin.investors.manage", "admin.roles.manage"]))
):
    return await InvestorDocumentService.get_by_investor_id(db, investor_id)

@router.get("/my-documents", response_model=List[InvestorDocumentResponse])
async def get_my_documents(
    investor_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_admin = current_user.is_superuser or any(r.name.lower() in ['admin', 'administrador', 'director', 'superadmin', 'gerente'] for r in getattr(current_user, 'roles', []))
    if is_admin and investor_id:
        return await InvestorDocumentService.get_by_investor_id(db, investor_id)
    return await InvestorDocumentService.get_my_documents(db, current_user.id, investor_id)

@router.get("/{document_id}", response_model=InvestorDocumentResponse)
async def get_document_by_id(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = await InvestorDocumentService.get_by_id(db, document_id)
    # Si no es admin y el documento no le pertenece, denegar acceso
    is_admin = current_user.is_superuser or any(r.name in ['admin', 'administrador', 'director'] for r in getattr(current_user, 'roles', []))
    if not is_admin and doc.user_id != current_user.id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este documento")
    return doc

@router.delete("/bulk-delete/all", status_code=status.HTTP_200_OK)
async def delete_all_documents(
    template_id: Optional[int] = Query(None),
    investor_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["admin.investors.manage", "admin.roles.manage"]))
):
    count = await InvestorDocumentService.delete_all(db, template_id, investor_id)
    return {
        "status": "success",
        "deleted_count": count,
        "message": f"Se eliminaron {count} documentos exitosamente"
    }

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(RequirePermission(["admin.investors.manage", "admin.roles.manage"]))
):
    await InvestorDocumentService.delete(db, document_id)
    return None
