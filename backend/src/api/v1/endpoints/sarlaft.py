from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, distinct
from pydantic import BaseModel
from typing import Optional, List, Any
import os
from fastapi.responses import FileResponse

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.sarlaft_check import SarlaftCheck
from src.models.user import User
from src.services.tusdatos_service import TusdatosService

router = APIRouter()

class SarlaftCheckRequest(BaseModel):
    user_id: int
    document_number: str
    document_type: str = "CC"
    fecha_expedicion: Optional[str] = None
    investment_request_id: Optional[int] = None

@router.post("/check", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def trigger_sarlaft_check(
    req: SarlaftCheckRequest, 
    db: AsyncSession = Depends(get_db)
):
    """
    Inicia la verificación de antecedentes SARLAFT en Tusdatos.co para un usuario.
    """
    user_res = await db.execute(select(User).where(User.id == req.user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    check = await TusdatosService.execute_full_sarlaft_check(
        db=db,
        user_id=req.user_id,
        document_number=req.document_number,
        document_type=req.document_type,
        fecha_expedicion=req.fecha_expedicion,
        investment_request_id=req.investment_request_id
    )

    return {
        "message": "Verificación SARLAFT iniciada / completada",
        "id": check.id,
        "status": check.status,
        "risk_level": check.risk_level,
        "has_findings": check.has_findings,
        "pdf_path": check.pdf_path,
        "details": check.details
    }

@router.get("/me")
async def get_my_sarlaft_check(current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Obtiene el último resultado de verificación SARLAFT del usuario autenticado.
    """
    return await get_user_sarlaft_check(user_id=current_user.id, current_user=current_user, db=db)

@router.get("/user/{user_id}")
async def get_user_sarlaft_check(user_id: int, current_user = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Obtiene el último resultado de verificación SARLAFT para un usuario.
    """
    # H-183: el propio usuario o la administración; nadie más puede consultar el SARLAFT de otra persona
    from src.core.pbac import PBACEngine
    if user_id != current_user.id and not PBACEngine.has_permission(
        current_user, ["admin.investors.manage", "admin.users.manage", "admin.audits.manage", "admin.roles.manage"]
    ):
        raise HTTPException(status_code=403, detail="No tienes permisos suficientes para realizar esta acción")
    try:
        res = await db.execute(
            select(SarlaftCheck)
            .where(SarlaftCheck.user_id == user_id)
            .order_by(SarlaftCheck.id.desc())
        )
        check = res.scalars().first()
    except Exception as e:
        print(f"Error querying sarlaft_checks: {e}")
        return {"status": "none", "check": None}
    
    if not check:
        return {"status": "none", "check": None}

    return {
        "status": check.status or check.tusdatos_status,
        "check": {
            "id": check.id,
            "job_id": check.job_id or check.tusdatos_job_id,
            "report_id": check.report_id or check.tusdatos_report_id,
            "document_number": check.document_number,
            "document_type": check.document_type,
            "status": check.status or check.tusdatos_status,
            "has_findings": check.has_findings,
            "risk_level": check.risk_level,
            "pdf_path": check.pdf_path,
            "details": check.details,
            "tusdatos_job_id": check.tusdatos_job_id,
            "tusdatos_status": check.tusdatos_status,
            "tusdatos_report_id": check.tusdatos_report_id,
            "tusdatos_hallazgos": check.tusdatos_hallazgos,
            "tusdatos_msg": check.tusdatos_msg,
            "tusdatos_sources": check.tusdatos_sources,
            "tusdatos_justificacion": check.tusdatos_justificacion,
            "tusdatos_evidencia_paths": check.tusdatos_evidencia_paths,
            "tusdatos_hallazgos_corregidos": check.tusdatos_hallazgos_corregidos,
            "tusdatos_fecha_correccion": check.tusdatos_fecha_correccion.isoformat() if check.tusdatos_fecha_correccion else None,
            "tusdatos_corregido_por": check.tusdatos_corregido_por,
            "tusdatos_last_check": check.tusdatos_last_check.isoformat() if check.tusdatos_last_check else None,
            "created_at": check.created_at.isoformat() if check.created_at else None
        }
    }

@router.get("/pdf/{check_id}", dependencies=[Depends(RequirePermission(["admin.investors.manage", "admin.users.manage", "admin.audits.manage"]))])  # H-183: antes era público
async def download_sarlaft_pdf(check_id: int, db: AsyncSession = Depends(get_db)):
    """
    Descarga el reporte en PDF oficial de la consulta SARLAFT.
    """
    res = await db.execute(select(SarlaftCheck).where(SarlaftCheck.id == check_id))
    check = res.scalars().first()

    if not check or not check.pdf_path:
        raise HTTPException(status_code=404, detail="Reporte PDF no disponible")

    # Clean path to find file on disk
    relative_path = check.pdf_path.lstrip("/")
    if os.path.exists(relative_path):
        return FileResponse(
            path=relative_path, 
            filename=f"Reporte_SARLAFT_{check.document_number}.pdf",
            media_type="application/pdf"
        )

    raise HTTPException(status_code=404, detail="Archivo PDF no encontrado en el servidor")


@router.post("/admin/validate-existing-investors", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def validate_existing_investors(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aprueba administrativamente el SARLAFT ÚNICAMENTE para los usuarios que cuentan con inversiones reales en la tabla 'investors'.
    Revierte y limpia automáticamente cualquier registro erróneo asignado a usuarios sin inversiones.
    """
    from datetime import datetime
    from src.models.investor import Investor

    # 1. Obtener los IDs únicos de usuarios con inversiones reales registradas
    investor_ids_res = await db.execute(select(Investor.user_id).distinct())
    investor_user_ids = set(investor_ids_res.scalars().all())

    # 2. Revertir / eliminar chequeos creados por lote previo para usuarios que NO tienen inversiones
    all_checks_res = await db.execute(select(SarlaftCheck))
    all_checks = all_checks_res.scalars().all()
    reverted_count = 0
    for c in all_checks:
        if (
            c.details
            and isinstance(c.details, dict)
            and c.details.get("source") == "admin_batch_legacy_approval"
            and c.user_id not in investor_user_ids
        ):
            await db.delete(c)
            reverted_count += 1

    # 3. Validar únicamente a usuarios con inversiones reales
    user_query = select(User.id, User.document_id).where(User.id.in_(investor_user_ids))
    res = await db.execute(user_query)
    target_users = res.all()

    updated_count = 0
    now = datetime.utcnow()

    for u_id, u_doc in target_users:
        c_res = await db.execute(
            select(SarlaftCheck).where(SarlaftCheck.user_id == u_id).order_by(SarlaftCheck.id.desc())
        )
        existing_check = c_res.scalars().first()

        if existing_check:
            if (
                existing_check.tusdatos_status == "finalizado"
                and existing_check.risk_level == "CLEAN"
                and not existing_check.has_findings
            ):
                continue

            existing_check.tusdatos_status = "finalizado"
            existing_check.risk_level = "CLEAN"
            existing_check.has_findings = False
            existing_check.tusdatos_hallazgos_corregidos = True
            existing_check.tusdatos_fecha_correccion = now
            existing_check.tusdatos_corregido_por = current_user.id
            existing_check.tusdatos_justificacion = "Aprobado administrativamente por contar con inversiones previas registradas."
            existing_check.tusdatos_msg = "Aprobado por administración"
            existing_check.updated_at = now
            updated_count += 1
        else:
            new_check = SarlaftCheck(
                user_id=u_id,
                document_number=u_doc or f"LEGACY_{u_id}",
                document_type="CC",
                tusdatos_status="finalizado",
                risk_level="CLEAN",
                has_findings=False,
                tusdatos_hallazgos_corregidos=True,
                tusdatos_fecha_correccion=now,
                tusdatos_corregido_por=current_user.id,
                tusdatos_justificacion="Aprobado administrativamente por contar con inversiones previas registradas.",
                tusdatos_msg="Aprobado por administración",
                details={"source": "admin_batch_legacy_approval", "approved_by": current_user.id},
                created_at=now,
                updated_at=now
            )
            db.add(new_check)
            updated_count += 1

    await db.commit()
    msg = f"Validación de inversionistas completada. Se validaron {updated_count} usuarios con inversiones reales."
    if reverted_count > 0:
        msg += f" Se revocó la validación errónea a {reverted_count} usuarios que no tenían inversiones."

    return {
        "message": msg,
        "processed_users": len(target_users),
        "updated_count": updated_count,
        "reverted_count": reverted_count
    }


class SetUserSarlaftStatusRequest(BaseModel):
    user_id: int
    status: str  # "approved" | "pending" | "rejected"
    justification: Optional[str] = None


@router.post("/admin/set-status", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def set_user_sarlaft_status(
    req: SetUserSarlaftStatusRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite a un administrador cambiar individualmente el estado SARLAFT de un usuario:
    - 'approved': Aprueba el SARLAFT, elimina hallazgos y habilita inversiones.
    - 'pending': Restablece el estado a pendiente / en verificación.
    - 'rejected': Marca con alerta de riesgo alto y bloquea inversiones.
    """
    from datetime import datetime

    target_status = req.status.lower().strip()
    if target_status not in ["approved", "pending", "rejected"]:
        raise HTTPException(
            status_code=400,
            detail="Estado inválido. Opciones permitidas: 'approved', 'pending', 'rejected'."
        )

    # Validar que el usuario exista
    user_res = await db.execute(select(User).where(User.id == req.user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Buscar último chequeo
    c_res = await db.execute(
        select(SarlaftCheck).where(SarlaftCheck.user_id == req.user_id).order_by(SarlaftCheck.id.desc())
    )
    check = c_res.scalars().first()
    now = datetime.utcnow()

    if not check:
        check = SarlaftCheck(
            user_id=user.id,
            document_number=user.document_id or f"USER_{user.id}",
            document_type="CC",
            created_at=now
        )
        db.add(check)

    check.updated_at = now

    if target_status == "approved":
        check.tusdatos_status = "finalizado"
        check.risk_level = "CLEAN"
        check.has_findings = False
        check.tusdatos_hallazgos_corregidos = True
        check.tusdatos_fecha_correccion = now
        check.tusdatos_corregido_por = current_user.id
        check.tusdatos_justificacion = req.justification or "Aprobado administrativamente por oficial de cumplimiento."
        check.tusdatos_msg = "Aprobado por administración"
        action_msg = "aprobado"

    elif target_status == "pending":
        check.tusdatos_status = "pending"
        check.risk_level = "CLEAN"
        check.has_findings = False
        check.tusdatos_hallazgos_corregidos = False
        check.tusdatos_fecha_correccion = None
        check.tusdatos_corregido_por = current_user.id
        check.tusdatos_justificacion = req.justification or "Estado restablecido a pendiente para nueva validación."
        check.tusdatos_msg = "En verificación"
        action_msg = "cambiado a pendiente"

    elif target_status == "rejected":
        check.tusdatos_status = "finalizado"
        check.risk_level = "HIGH"
        check.has_findings = True
        check.tusdatos_hallazgos_corregidos = False
        check.tusdatos_fecha_correccion = None
        check.tusdatos_corregido_por = current_user.id
        check.tusdatos_justificacion = req.justification or "Rechazado administrativamente por alerta de cumplimiento."
        check.tusdatos_msg = "Rechazado por administración / Alerta de riesgo"
        action_msg = "marcado como rechazado"

    await db.commit()
    await db.refresh(check)

    return {
        "success": True,
        "message": f"El estado SARLAFT del usuario {user.name} fue {action_msg} exitosamente.",
        "status": target_status,
        "check_id": check.id
    }



