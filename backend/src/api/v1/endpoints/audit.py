from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.core.database import get_db
from src.schemas.audit import AuditPaginatedResponse, AuditUserHistory
from src.services.audit_service import AuditService
from src.api.deps import RequirePermission

router = APIRouter()

@router.get("/users", response_model=AuditPaginatedResponse, dependencies=[Depends(RequirePermission("admin.investments.requests"))])
async def get_audit_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated list of users with their aggregated financial history (Auditoría).
    """
    return await AuditService.get_audit_users(db, page=page, limit=limit, search=search)

@router.get("/users/{user_id}/history", dependencies=[Depends(RequirePermission("admin.investments.requests"))])
async def get_user_audit_history(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed financial history for a specific user.
    """
    history = await AuditService.get_user_audit_history(db, user_id=user_id)
    if not history:
        raise HTTPException(status_code=404, detail="Usuario no encontrado o sin historial.")
    
    # We serialize explicitly since we have some nested SQLAlchemy objects that might cause 500
    try:
        from src.schemas.audit import AuditUserHistory
        return AuditUserHistory.model_validate(history)
    except Exception as e:
        import logging
        logging.error(f"Error mapping audit history for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error mapeando historial: {str(e)}")
