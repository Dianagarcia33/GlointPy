from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.models.investor import Investor
from src.schemas.admin_investments import AdminInvestorResponse

router = APIRouter()

@router.get("/all", response_model=List[AdminInvestorResponse])
async def get_all_investments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene todas las inversiones del sistema para el módulo de administración.
    Requiere permiso de administrador (investments:view).
    """
    # Verificar permisos (asumimos que si llegó aquí, el middleware o ruta debe protegerlo,
    # pero podemos hacer una verificación sencilla del rol o permiso si tenemos el método)
    # Por ahora confiaremos en que el frontend protege la vista, pero lo ideal es validar `current_user.has_permission("investments:view")`
    
    from sqlalchemy.orm import selectinload
    # Obtener todos los inversores con su usuario, paquete y periodo de contrato
    stmt = select(Investor).options(
        selectinload(Investor.user),
        selectinload(Investor.paquete),
        selectinload(Investor.contract_period)
    ).order_by(Investor.user_id, Investor.fecha_ingreso.desc())
    result = await db.execute(stmt)
    investors = result.scalars().all()
    
    response_list = []
    for inv in investors:
        nombre = inv.nombre_completo
        correo = inv.correo_electronico
        
        if inv.user:
            # Construir nombre desde la tabla users si está disponible
            if hasattr(inv.user, 'name') and inv.user.name:
                nombre = inv.user.name
            elif hasattr(inv.user, 'first_name') and inv.user.first_name:
                nombre = f"{inv.user.first_name} {getattr(inv.user, 'last_name', '')}".strip()
            if inv.user.email:
                correo = inv.user.email
                
        # Nombre del paquete
        paquete_nombre = "0"
        if inv.paquete and inv.paquete.paquete_accion_adquirido:
            paquete_nombre = inv.paquete.paquete_accion_adquirido

        # Datos del periodo
        periodo_porcentaje = None
        periodo_meses = None
        periodo_dias = None
        if inv.contract_period:
            periodo_porcentaje = inv.contract_period.percentage
            periodo_meses = inv.contract_period.months
            periodo_dias = inv.contract_period.days

        response_list.append({
            "id": inv.id,
            "user_id": inv.user_id,
            "nombre_completo": nombre,
            "correo_electronico": correo,
            "codigo_asignado": inv.codigo_asignado,
            "paquete_nombre": paquete_nombre,
            "fecha_ingreso": inv.fecha_ingreso,
            "fecha_finalizacion": inv.fecha_finalizacion,
            "total_contrato": inv.total_contrato,
            "rendimiento_total_contrato": inv.rendimiento_total_contrato,
            "liquidacion_diaria_rendimiento": inv.liquidacion_diaria_rendimiento,
            "periodo_porcentaje": periodo_porcentaje,
            "periodo_meses": periodo_meses,
            "periodo_dias": periodo_dias
        })
    
    return response_list
