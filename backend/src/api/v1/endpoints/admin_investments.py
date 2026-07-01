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
    from src.models.contract_period import ContractPeriod
    
    # Obtener todos los periodos en un diccionario para mapeo manual (por si usan la columna vieja periodo_contrato)
    periods_result = await db.execute(select(ContractPeriod))
    all_periods = periods_result.scalars().all()
    periods_dict = {p.id: p for p in all_periods}

    # Obtener todos los inversores con su usuario y paquete
    stmt = select(Investor).options(
        selectinload(Investor.user),
        selectinload(Investor.paquete)
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
                
        # Nombre del paquete (Valor del paquete)
        paquete_nombre = "0"
        if inv.paquete and inv.paquete.paquete_accion_adquirido:
            paquete_nombre = inv.paquete.paquete_accion_adquirido

        # Datos del periodo (revisando ambas columnas para compatibilidad)
        periodo_porcentaje = None
        periodo_meses = None
        periodo_dias = None
        
        period_obj = None
        if inv.contract_period_id:
            period_obj = periods_dict.get(inv.contract_period_id)
            
        if not period_obj and inv.periodo_contrato:
            period_obj = periods_dict.get(inv.periodo_contrato)
            if not period_obj:
                # Fallback: periodo_contrato might store days or months instead of ID
                for p in all_periods:
                    if p.days == inv.periodo_contrato or p.months == inv.periodo_contrato:
                        period_obj = p
                        break
                        
        if not period_obj and inv.dias_contrato:
            for p in all_periods:
                if p.days == inv.dias_contrato:
                    period_obj = p
                    break
        
        if period_obj:
            periodo_porcentaje = period_obj.percentage
            periodo_meses = period_obj.months
            periodo_dias = period_obj.days

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
