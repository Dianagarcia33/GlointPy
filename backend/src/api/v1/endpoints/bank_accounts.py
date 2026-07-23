import os
import random
from datetime import datetime, timedelta
from typing import Optional, List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, status, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.models.user_bank_account import UserBankAccount
from src.models.withdrawal_verification_code import WithdrawalVerificationCode
from src.services.email_service import EmailService
from src.services.user_bank_account_service import bulk_create_bank_accounts

router = APIRouter()

class BankAccountRequest(BaseModel):
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    code: str

class BankAccountUpdateRequest(BaseModel):
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    code: str

class DeleteBankAccountRequest(BaseModel):
    code: str

@router.get("/me")
async def get_my_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get active bank accounts for the currently logged-in investor.
    """
    res = await db.execute(
        select(UserBankAccount)
        .where(
            UserBankAccount.user_id == current_user.id,
            UserBankAccount.is_active == True
        )
        .order_by(UserBankAccount.id.desc())
    )
    accounts = res.scalars().all()
    return [
        {
            "id": acc.id,
            "user_id": acc.user_id,
            "banco": acc.banco,
            "tipo_cuenta": acc.tipo_cuenta,
            "numero_cuenta": acc.numero_cuenta,
            "is_active": acc.is_active,
            "created_at": acc.created_at.isoformat() if acc.created_at else None
        }
        for acc in accounts
    ]

@router.post("/send-otp")
async def send_bank_account_otp(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate and email a 6-digit OTP code to authorize bank account changes in Bóveda Bancaria.
    """
    code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    verification = WithdrawalVerificationCode(
        user_id=current_user.id,
        code=code,
        expires_at=expires_at,
        attempts="0"
    )
    db.add(verification)
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Código de Verificación - Bóveda Bancaria</title>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f7f9fc; }}
            .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
            .header {{ background-color: #0f172a; padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: 0.5px; }}
            .content {{ padding: 40px 30px; }}
            .code-box {{ background-color: #f0fdf4; border: 2px dashed #16a34a; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }}
            .code {{ font-size: 36px; font-weight: bold; color: #15803d; letter-spacing: 5px; margin: 0; }}
            .footer {{ background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }}
            .footer p {{ margin: 0; color: #64748b; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Bóveda Bancaria - Gloint</h1>
            </div>
            <div class="content">
                <p>Hola <strong>{current_user.name}</strong>,</p>
                <p>Has solicitado realizar una operación en tu <strong>Bóveda Bancaria</strong> (Agregar, Editar o Eliminar cuenta bancaria).</p>
                <p>Para autorizar esta acción, ingresa el siguiente código de verificación de 6 dígitos:</p>
                <div class="code-box">
                    <p class="code">{code}</p>
                </div>
                <p style="font-size: 14px; color: #64748b; text-align: center;">Este código expirará en 10 minutos por motivos de seguridad.</p>
                <p style="margin-top: 30px;">Si no realizaste esta solicitud, por favor ignora este mensaje y contacta a nuestro equipo de soporte.</p>
            </div>
            <div class="footer">
                <p>&copy; {datetime.now().year} Gloint. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    EmailService.send_html_email(
        to_email=current_user.email,
        subject="Código de Verificación - Bóveda Bancaria Gloint",
        html_content=html_content
    )
    
    return {"message": "Código de verificación enviado a tu correo electrónico."}

async def _verify_otp_code(user_id: int, code: str, db: AsyncSession):
    code_res = await db.execute(
        select(WithdrawalVerificationCode)
        .where(
            WithdrawalVerificationCode.user_id == user_id,
            WithdrawalVerificationCode.code == code.strip(),
            WithdrawalVerificationCode.used_at == None
        )
    )
    verification = code_res.scalars().first()
    if not verification:
        raise HTTPException(status_code=400, detail="Código de verificación inválido o ya utilizado.")
        
    expires_at = verification.expires_at.replace(tzinfo=None) if verification.expires_at.tzinfo else verification.expires_at
    if expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="El código de verificación ha expirado. Por favor solicita uno nuevo.")
        
    verification.used_at = datetime.utcnow()
    return verification

@router.post("/me")
async def create_my_bank_account(
    req: BankAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new bank account for the current user after validating the 6-digit OTP code.
    """
    await _verify_otp_code(current_user.id, req.code, db)
    
    new_acc = UserBankAccount(
        user_id=current_user.id,
        banco=req.banco.strip(),
        tipo_cuenta=req.tipo_cuenta.strip(),
        numero_cuenta=req.numero_cuenta.strip(),
        is_active=True
    )
    db.add(new_acc)
    
    try:
        await db.commit()
        await db.refresh(new_acc)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Cuenta bancaria agregada exitosamente", "id": new_acc.id}

@router.put("/me/{account_id}")
async def update_my_bank_account(
    account_id: int,
    req: BankAccountUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing bank account for the current user after validating the OTP code.
    """
    await _verify_otp_code(current_user.id, req.code, db)
    
    acc_res = await db.execute(
        select(UserBankAccount)
        .where(
            UserBankAccount.id == account_id,
            UserBankAccount.user_id == current_user.id
        )
    )
    acc = acc_res.scalars().first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada.")
        
    if req.banco:
        acc.banco = req.banco.strip()
    if req.tipo_cuenta:
        acc.tipo_cuenta = req.tipo_cuenta.strip()
    if req.numero_cuenta:
        acc.numero_cuenta = req.numero_cuenta.strip()
        
    try:
        await db.commit()
        await db.refresh(acc)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Cuenta bancaria actualizada exitosamente."}

@router.post("/me/{account_id}/delete")
async def delete_my_bank_account(
    account_id: int,
    req: DeleteBankAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deactivate a bank account after validating the OTP code.
    """
    await _verify_otp_code(current_user.id, req.code, db)
    
    acc_res = await db.execute(
        select(UserBankAccount)
        .where(
            UserBankAccount.id == account_id,
            UserBankAccount.user_id == current_user.id
        )
    )
    acc = acc_res.scalars().first()
    if not acc:
        raise HTTPException(status_code=404, detail="Cuenta bancaria no encontrada.")
        
    acc.is_active = False
    
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Cuenta bancaria eliminada de la bóveda exitosamente."}

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.investors.manage"))])
async def bulk_upload_bank_accounts(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Upload a CSV file and load bank accounts for users in bulk.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    success_count, errors = await bulk_create_bank_accounts(db, content)
    return {"success_count": success_count, "errors": errors}
