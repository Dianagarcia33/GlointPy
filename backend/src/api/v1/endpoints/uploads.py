import os
import mimetypes
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.models.investment_request import InvestmentRequest
from src.models.commercial_sale import CommercialSale
from src.models.withdrawal import Withdrawal

router = APIRouter()

UPLOAD_ROOT = os.path.abspath("uploads")

async def verify_and_serve_file(relative_path: str, request: Request, db: AsyncSession):
    # 1. Resolve and validate physical file path (Anti-path traversal)
    target_path = os.path.abspath(os.path.join(UPLOAD_ROOT, relative_path))
    if not target_path.startswith(UPLOAD_ROOT):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado a la ruta especificada."
        )
    
    if not os.path.exists(target_path) or not os.path.isfile(target_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Archivo no encontrado."
        )

    parts = relative_path.strip("/").split("/")
    category = parts[0] if len(parts) > 1 else "root"
    filename_only = os.path.basename(target_path)

    # 2. Public / semi-public templates assets (letterhead images, general assets)
    if category in ["templates", "public"]:
        mime_type, _ = mimetypes.guess_type(target_path)
        return FileResponse(
            target_path,
            media_type=mime_type or "application/octet-stream",
            headers={"X-Content-Type-Options": "nosniff"}
        )

    # 3. Sensitive files (comprobantes, kyc, sarlaft_reports, settlements, receipts, chat): Require authentication
    try:
        current_user = await get_current_user(request, db=db, token=None)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación para acceder a este documento."
        )

    # 4. Check permissions and ownership
    user_roles = [r.name.lower() for r in getattr(current_user, "roles", []) if hasattr(r, "name")]
    is_privileged = (
        current_user.is_superuser or
        any(r in ["admin", "administrador", "director", "superadmin", "gerente", "comercial", "auditor"] for r in user_roles)
    )

    if not is_privileged:
        # If user is a regular investor, verify ownership of the requested file
        db_relative_path = f"/uploads/{relative_path.lstrip('/')}"
        alt_relative_path = f"uploads/{relative_path.lstrip('/')}"

        if category == "comprobantes":
            # Search in investment requests owned by current user
            stmt = select(InvestmentRequest).where(
                (InvestmentRequest.user_id == current_user.id) &
                (
                    (InvestmentRequest.comprobante_path == db_relative_path) |
                    (InvestmentRequest.comprobante_path == alt_relative_path) |
                    (InvestmentRequest.comprobante_path.like(f"%{filename_only}"))
                )
            )
            res = await db.execute(stmt)
            inv_req = res.scalars().first()
            if not inv_req:
                # Also check commercial sales
                cs_stmt = select(CommercialSale).where(
                    (CommercialSale.commercial_id == current_user.id) &
                    (CommercialSale.comprobante_path.like(f"%{filename_only}"))
                )
                cs_res = await db.execute(cs_stmt)
                if not cs_res.scalars().first():
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No tienes autorización para acceder a este comprobante."
                    )
        elif category == "receipts":
            stmt = select(Withdrawal).where(
                (Withdrawal.user_id == current_user.id) &
                (
                    (Withdrawal.receipt_path == db_relative_path) |
                    (Withdrawal.receipt_path == alt_relative_path) |
                    (Withdrawal.receipt_path.like(f"%{filename_only}"))
                )
            )
            res = await db.execute(stmt)
            if not res.scalars().first():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes autorización para acceder a este recibo de retiro."
                )
        elif category == "kyc":
            # Verify KYC ownership
            user_doc_path = getattr(current_user, "document_path", "") or ""
            if filename_only not in user_doc_path and str(current_user.id) not in relative_path:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes autorización para acceder a este documento de identidad."
                )
        elif category == "sarlaft_reports":
            # Sarlaft reports are strictly restricted to administrative and compliance personnel
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes autorización para acceder a reportes Sarlaft."
            )

    # 5. Serve file securely with anti-sniff and cache control headers
    mime_type, _ = mimetypes.guess_type(target_path)
    return FileResponse(
        target_path,
        media_type=mime_type or "application/octet-stream",
        filename=os.path.basename(target_path),
        headers={
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "Content-Disposition": "inline"
        }
    )

@router.get("/{category}/{file_path:path}")
async def get_secure_upload_categorized(
    category: str,
    file_path: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await verify_and_serve_file(f"{category}/{file_path}", request, db)

@router.get("/{file_path:path}")
async def get_secure_upload_root(
    file_path: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    return await verify_and_serve_file(file_path, request, db)
