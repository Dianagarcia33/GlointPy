from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from src.core.database import get_db
from src.schemas.user import (
    UserResponse, UserCreateAdmin, UserUpdateAdmin, UserPaginatedResponse,
    UserProfileUpdate, UserChangePassword, ForceProfileUpdateRequest
)
from src.schemas.security import AssignRoleToUser
from src.models.user import User
from src.models.security import Role
from src.services.user_service import UserService
from src.api.deps import RequirePermission, get_current_user

router = APIRouter()

@router.get("/me/profile", response_model=UserResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene los datos completos del perfil del usuario en sesión.
    """
    return await UserService.get_user_by_id(db, current_user.id)

@router.put("/me/profile", response_model=UserResponse)
async def update_my_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Actualiza la información de perfil del usuario en sesión y desbloquea must_update_profile.
    """
    return await UserService.update_profile(db, current_user.id, profile_in.model_dump(exclude_unset=True))

@router.post("/me/change-password")
async def change_my_password(
    pwd_in: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Permite al usuario cambiar su contraseña validando la contraseña actual.
    """
    return await UserService.change_password(db, current_user.id, pwd_in.current_password, pwd_in.new_password)

@router.post("/admin/force-profile-update", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def force_profile_update(
    data: ForceProfileUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Fuerza a los usuarios a actualizar sus datos la próxima vez que ingresen/naveguen.
    Puede aplicarse a todos los usuarios o a un listado específico de IDs.
    """
    return await UserService.force_profile_update(db, data.user_ids, data.force_all)

@router.post("/{user_id}/toggle-force-profile", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def toggle_force_profile(
    user_id: int,
    force_value: Optional[bool] = Query(None, description="Valor explícito opcional (true/false). Si se omite, invierte el valor actual."),
    db: AsyncSession = Depends(get_db)
):
    """
    Fuerza o desmarca individualmente la actualización obligatoria de perfil de un usuario.
    """
    return await UserService.toggle_force_profile_update(db, user_id, force_value)

@router.get("/my-children", response_model=List[UserResponse])
async def get_my_children(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene las cuentas de menores vinculadas al usuario en sesión como tutor/padre.
    """
    result = await db.execute(
        select(User)
        .options(
            selectinload(User.roles).selectinload(Role.permissions),
            selectinload(User.bank_accounts),
            selectinload(User.wallet),
            selectinload(User.parent),
            selectinload(User.children)
        )
        .where(User.parent_user_id == current_user.id)
    )
    return result.scalars().all()

@router.get("", response_model=UserPaginatedResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    has_wallet: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la lista de todos los usuarios paginada (para panel admin).
    """
    return await UserService.get_all_users(db, page, limit, search, role_id, is_active, has_wallet)

@router.post("/{user_id}/create-wallet", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def create_user_wallet(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Crea una billetera para un usuario que no tenga una asignada.
    """
    return await UserService.create_wallet_for_user(db, user_id)

@router.post("", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def create_user(user_in: UserCreateAdmin, db: AsyncSession = Depends(get_db)):
    """
    Crea un usuario desde el panel admin (con contraseña temporal).
    """
    return await UserService.create_user_admin(db, user_in.model_dump())

@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def update_user(user_id: int, user_in: UserUpdateAdmin, db: AsyncSession = Depends(get_db)):
    """
    Actualiza la información de un usuario desde el panel admin.
    """
    update_data = user_in.model_dump(exclude_unset=True)
    return await UserService.update_user_admin(db, user_id, update_data)

@router.post("/{user_id}/roles", response_model=UserResponse, dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def assign_roles(user_id: int, assign_data: AssignRoleToUser, db: AsyncSession = Depends(get_db)):
    """
    Asigna un conjunto de roles a un usuario específico.
    Sobrescribe los roles anteriores con los nuevos proporcionados en la lista.
    """
    # 1. Buscar usuario
    result = await db.execute(select(User).options(selectinload(User.roles)).where(User.id == user_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Buscar los roles nuevos
    if assign_data.role_ids:
        roles_result = await db.execute(select(Role).where(Role.id.in_(assign_data.role_ids)))
        new_roles = roles_result.scalars().all()
    else:
        new_roles = []
        
    # 3. Reasignar
    user.roles = new_roles
    
    await db.commit()
    await db.refresh(user)
    
    return user

@router.post("/bulk-upload", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def bulk_upload_users(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    Sube un archivo CSV y crea usuarios masivamente.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV válido.")
    
    content = await file.read()
    try:
        csv_text = content.decode('utf-8')
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="El archivo debe tener codificación UTF-8.")
        
    result = await UserService.bulk_create_users(db, csv_text)
    return result

@router.post("/{user_id}/reset-password", dependencies=[Depends(RequirePermission("admin.users.manage"))])
async def reset_user_password(user_id: int, db: AsyncSession = Depends(get_db)):
    """
    Restablece la contraseña de un usuario a la clave temporal '123456789' y fuerza el cambio de contraseña al ingresar.
    """
    return await UserService.reset_user_password(db, user_id)

@router.get("/statement/global", dependencies=[Depends(RequirePermission(["admin.users.manage", "admin.investors.manage", "admin.payments.manage", "admin.audits.manage", "admin.roles.manage"]))])
async def get_global_statement(
    start_date: Optional[str] = Query(None, description="Fecha inicial formato YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha final formato YYYY-MM-DD"),
    user_id: Optional[int] = Query(None, description="Filtrar por usuario específico"),
    tx_type: Optional[str] = Query(None, description="Filtrar por tipo de transacción"),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el estado de cuenta financiero global consolidado y resumen de retiros para administradores.
    """
    return await UserService.get_global_account_statement(db, start_date, end_date, user_id, tx_type)

@router.get("/{user_id}/statement", dependencies=[Depends(RequirePermission(["admin.users.manage", "admin.investors.manage"]))])
async def get_user_statement(
    user_id: int,
    start_date: Optional[str] = Query(None, description="Fecha inicial formato YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Fecha final formato YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene el estado de cuenta consolidado y resumen de retiros (tipo extracto bancario) de un usuario.
    """
    return await UserService.get_user_account_statement(db, user_id, start_date, end_date)
