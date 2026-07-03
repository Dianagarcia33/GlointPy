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
    if current_user.rol != "admin" and current_user.rol != "superadmin":
        raise HTTPException(status_code=403, detail="Not enough privileges")
        
    try:
        # Consultamos la tabla investment_requests_respaldo (y cruzamos con usuario si es necesario, 
        # pero primero veamos qué hay)
        query = text("""
            SELECT i.*, u.name as user_nombre, u.email as correo_electronico
            FROM investment_requests_respaldo i
            LEFT JOIN users u ON i.user_id = u.id
            ORDER BY i.id DESC
            LIMIT 100
        """)
        result = await db.execute(query)
        rows = result.fetchall()
        
        # Convertimos a diccionario
        return [dict(row._mapping) for row in rows]
        
    except Exception as e:
        print(f"Error fetching from respaldo: {e}")
        raise HTTPException(status_code=500, detail=str(e))
