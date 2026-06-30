from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.services.auto_transfer_yields import handle_auto_transfer, revert_auto_transfer_yields

router = APIRouter()

class TransferRequest(BaseModel):
    execute: bool = False
    force: bool = False

@router.post("/auto-transfer-yields")
async def run_auto_transfer_yields(
    request: TransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Validar que sea superadmin
    if current_user.email != "superadmin@gloint.com":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ejecutar esta acción."
        )
        
    try:
        result = await handle_auto_transfer(db, execute=request.execute, force=request.force)
        return result
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print(f"Error in auto_transfer_yields endpoint:\n{trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.post("/revert-auto-transfer")
async def run_revert_auto_transfer(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.email != 'superadmin@gloint.com':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para ejecutar esta acción.")
        
    try:
        result = await revert_auto_transfer_yields(db)
        return result
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print(f"Error in revert_auto_transfer endpoint:\n{trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
