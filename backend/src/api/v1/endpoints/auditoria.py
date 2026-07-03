from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Dict, Any
from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user

router = APIRouter()

@router.get("/respaldo", response_model=List[Dict[str, Any]])
async def get_inversiones_respaldo(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Obtiene los registros de la tabla de respaldo de inversiones (investor_respaldo o investment_requests_respaldo)
    """
    # Verificamos que sea admin
    is_admin = current_user.email == "superadmin@gloint.com"
    if hasattr(current_user, 'roles') and current_user.roles:
        for r in current_user.roles:
            if getattr(r, 'name', '') in ["admin", "superadmin"]:
                is_admin = True
                break
                
    if not is_admin:
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    try:
        # Consultamos la tabla investor_respaldo
        query = text("""
            SELECT *
            FROM investor_respaldo
            ORDER BY id DESC
        """)
        result = await db.execute(query)
        rows = result.fetchall()
        
        # Convertimos a diccionario
        return [dict(row._mapping) for row in rows]
        
    except Exception as e:
        print(f"Error fetching from respaldo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
