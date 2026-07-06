from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime

from src.core.database import get_db
from src.api.dependencies.auth_deps import get_current_user
from src.models.user import User
from src.models.user_bank_account import UserBankAccount
from pydantic import BaseModel

router = APIRouter()

class BankAccountCreate(BaseModel):
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    is_primary: bool = False

class BankAccountResponse(BaseModel):
    id: int
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    is_primary: bool

@router.get("/me", response_model=List[BankAccountResponse])
async def get_my_bank_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserBankAccount).where(UserBankAccount.user_id == current_user.id).order_by(UserBankAccount.is_primary.desc(), UserBankAccount.created_at.desc())
    result = await db.execute(stmt)
    accounts = result.scalars().all()
    return accounts

@router.post("/me", response_model=BankAccountResponse)
async def create_bank_account(
    account_in: BankAccountCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Si es primaria, desmarcar las demás
    if account_in.is_primary:
        stmt = select(UserBankAccount).where(UserBankAccount.user_id == current_user.id)
        result = await db.execute(stmt)
        existing = result.scalars().all()
        for acc in existing:
            acc.is_primary = False
            db.add(acc)
            
    # Si no tiene cuentas, la primera es primaria por defecto
    else:
        stmt = select(UserBankAccount).where(UserBankAccount.user_id == current_user.id)
        result = await db.execute(stmt)
        if not result.scalars().first():
            account_in.is_primary = True

    new_acc = UserBankAccount(
        user_id=current_user.id,
        banco=account_in.banco,
        tipo_cuenta=account_in.tipo_cuenta,
        numero_cuenta=account_in.numero_cuenta,
        is_primary=account_in.is_primary,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(new_acc)
    await db.commit()
    await db.refresh(new_acc)
    return new_acc

@router.delete("/me/{account_id}")
async def delete_bank_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(UserBankAccount).where(UserBankAccount.id == account_id, UserBankAccount.user_id == current_user.id)
    result = await db.execute(stmt)
    account = result.scalars().first()
    
    if not account:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada")
        
    await db.delete(account)
    
    # Si era primaria, asignar primaria a la más reciente (si queda alguna)
    if account.is_primary:
        next_stmt = select(UserBankAccount).where(UserBankAccount.user_id == current_user.id).order_by(UserBankAccount.created_at.desc())
        next_res = await db.execute(next_stmt)
        next_acc = next_res.scalars().first()
        if next_acc:
            next_acc.is_primary = True
            db.add(next_acc)
            
    await db.commit()
    return {"message": "Cuenta bancaria eliminada exitosamente"}
