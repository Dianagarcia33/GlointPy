from fastapi import APIRouter, Depends, HTTPException, status, Form, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.models.investment_request import InvestmentRequest, InvestmentStatus
from src.models.paquete_inversion import PaqueteInversion
from src.models.investor import Investor
from src.schemas.investment_schema import InvestmentRequestResponse, PaqueteInversionBase

router = APIRouter()

@router.get("/packages", response_model=List[PaqueteInversionBase])
async def get_investment_packages(db: AsyncSession = Depends(get_db)):
    """Retrieve all available investment packages."""
    result = await db.execute(select(PaqueteInversion).order_by(PaqueteInversion.acciones_otorgadas.asc()))
    return result.scalars().all()

@router.get("/me", response_model=List[InvestmentRequestResponse])
async def get_my_investments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    try:
        # Usar ORM para traer inversiones activas (investors) asociadas al usuario actual
        stmt = (
            select(Investor)
            .options(selectinload(Investor.paquete))
            .where(Investor.user_id == current_user.id)
            .order_by(Investor.created_at.desc())
        )
        
        result = await db.execute(stmt)
        investor_records = result.scalars().all()

        from src.models.contract_accelerations import ContractAcceleration
        from sqlalchemy import func
        investor_ids = [inv.id for inv in investor_records]
        accelerations = {}
        if investor_ids:
            acc_stmt = select(
                ContractAcceleration.investor_id,
                func.sum(ContractAcceleration.days_to_reduce).label("total_reduction")
            ).where(ContractAcceleration.investor_id.in_(investor_ids)).group_by(ContractAcceleration.investor_id)
            acc_res = await db.execute(acc_stmt)
            for row in acc_res.all():
                accelerations[row.investor_id] = float(row.total_reduction)

        investments = []
        for inv in investor_records:
            total = float(inv.total_contrato) if inv.total_contrato else 0.0
            rendimiento = float(inv.rendimiento_total_contrato) if inv.rendimiento_total_contrato else 0.0
            monto = total - rendimiento
            if monto <= 0:
                monto = total

            status_val = "approved"
            if inv.estado and inv.estado.lower() != 'activo':
                status_val = "finished"

            # Configurar los campos para el schema de respuesta
            investments.append({
                "id": inv.id,
                "user_id": inv.user_id,
                "monto": monto,
                "status": status_val,
                "created_at": inv.created_at,
                "total_contrato": inv.total_contrato,
                "rendimiento_total_contrato": inv.rendimiento_total_contrato,
                "liquidacion_diaria_rendimiento": inv.liquidacion_diaria_rendimiento,
                "dias_contrato": inv.dias_contrato,
                "codigo_asignado": inv.codigo_asignado,
                "fecha_ingreso": inv.fecha_ingreso,
                "fecha_finalizacion": inv.fecha_finalizacion,
                "aceleracion_dias": accelerations.get(inv.id, 0.0),
                "paquete": {
                    "id": inv.paquete_inversion_adquirido if inv.paquete_inversion_adquirido else 0,
                    "paquete_accion_adquirido": inv.paquete.paquete_accion_adquirido if inv.paquete else f"Paquete {inv.paquete_inversion_adquirido}",
                    "acciones_otorgadas": inv.acciones_otorgadas if inv.acciones_otorgadas is not None else (inv.paquete.acciones_otorgadas if inv.paquete else 0)
                }
            })

        from sqlalchemy import or_
        req_stmt = (
            select(InvestmentRequest)
            .options(selectinload(InvestmentRequest.paquete))
            .where(InvestmentRequest.user_id == current_user.id)
            .where(or_(
                InvestmentRequest.status == InvestmentStatus.pending,
                InvestmentRequest.status == InvestmentStatus.rejected
            ))
            .order_by(InvestmentRequest.created_at.desc())
        )
        req_res = await db.execute(req_stmt)
        requests = req_res.scalars().all()

        for req in requests:
            
            dias = 547
            if req.extra_data and isinstance(req.extra_data, dict):
                dias = req.extra_data.get("periodo_contrato", 547)

            investments.append({
                "id": req.id,
                "user_id": req.user_id,
                "monto": req.monto,
                "status": req.status.value if hasattr(req.status, 'value') else req.status,
                "created_at": req.created_at,
                "total_contrato": None,
                "rendimiento_total_contrato": None,
                "liquidacion_diaria_rendimiento": None,
                "dias_contrato": dias,
                "codigo_asignado": None,
                "fecha_ingreso": None,
                "fecha_finalizacion": None,
                "aceleracion_dias": 0.0,
                "paquete": {
                    "id": req.paquete_inversion_id,
                    "paquete_accion_adquirido": req.paquete.paquete_accion_adquirido if req.paquete else f"Paquete {req.paquete_inversion_id}",
                    "acciones_otorgadas": req.paquete.acciones_otorgadas if req.paquete else 0
                }
            })

        return investments
    except Exception as e:
        import traceback
        trace = traceback.format_exc()
        print(f"Error fetching investments:\n{trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener inversiones: {str(e)}\n\n{trace}"
        )

@router.post("/requests")
async def create_investment_request(
    paquete_inversion_id: int = Form(...),
    monto: float = Form(...),
    periodo_contrato: int = Form(...),
    monto_billetera_usado: float = Form(0),
    codigo_referido: str = Form(""),
    comprobantes: List[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    import os
    import uuid
    import json
    
    # Save files if provided
    comprobantes_paths = []
    if comprobantes:
        upload_dir = "uploads/comprobantes_solicitudes"
        os.makedirs(upload_dir, exist_ok=True)
        for file in comprobantes:
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(upload_dir, unique_filename)
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            comprobantes_paths.append(file_path)

    extra_data = {
        "periodo_contrato": periodo_contrato,
    }
    
    if monto_billetera_usado > 0:
        extra_data["monto_billetera_usado"] = monto_billetera_usado
        
    if codigo_referido.strip():
        extra_data["codigo_referido"] = codigo_referido.strip()
        
    # Guardar paths de múltiples comprobantes (si solo hay uno se guarda como string directo)
    comprobante_path_main = comprobantes_paths[0] if comprobantes_paths else None
    if len(comprobantes_paths) > 1:
        extra_data["comprobantes_extra"] = comprobantes_paths[1:]

    new_request = InvestmentRequest(
        user_id=current_user.id,
        paquete_inversion_id=paquete_inversion_id,
        monto=monto,
        comprobante_path=comprobante_path_main,
        extra_data=extra_data
    )

    db.add(new_request)
    try:
        await db.commit()
        await db.refresh(new_request)
        return {"message": "Solicitud de inversión creada exitosamente", "id": new_request.id}
    except Exception as e:
        await db.rollback()
        import traceback
        trace = traceback.format_exc()
        print(f"Error creating investment request:\n{trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar la solicitud de inversión: {str(e)}"
        )
