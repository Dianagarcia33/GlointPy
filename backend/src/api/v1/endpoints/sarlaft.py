from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
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

@router.get("/pdf/{check_id}")
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


class BatchValidateInvestorsRequest(BaseModel):
    all_users: bool = False


@router.post("/admin/validate-existing-investors", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def validate_existing_investors(
    data: Optional[BatchValidateInvestorsRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Aprueba administrativamente el SARLAFT para usuarios que ya cuentan con inversiones en el sistema (o todos si all_users=True).
    Crea o actualiza su registro SarlaftCheck como 'finalizado' con risk_level='CLEAN'.
    """
    from datetime import datetime
    from src.models.investor import Investor
    from src.models.investment_request import InvestmentRequest

    all_users = data.all_users if data else False

    if all_users:
        user_query = select(User.id, User.document_id)
    else:
        investor_ids_q = select(Investor.user_id).distinct()
        req_ids_q = select(InvestmentRequest.user_id).distinct()
        combined = investor_ids_q.union(req_ids_q)
        user_query = select(User.id, User.document_id).where(User.id.in_(combined))

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
    return {
        "message": f"Se validaron y aprobaron {updated_count} usuario(s) exitosamente.",
        "processed_users": len(target_users),
        "updated_count": updated_count
    }

