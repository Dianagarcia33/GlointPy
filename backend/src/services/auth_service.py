import datetime
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
from src.models.user import User
from src.models.security import Role
from src.schemas.auth import LoginRequest, RegisterRequest, ForceChangePasswordRequest, InvestorRegisterRequest
from src.core.security import verify_password, get_password_hash, create_access_token, create_password_reset_token, verify_password_reset_token
from src.services.email_service import EmailService

class AuthService:
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: LoginRequest) -> User:
        result = await db.execute(select(User).options(selectinload(User.roles).selectinload(Role.permissions)).where(User.email == login_data.email))
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        if not verify_password(login_data.password, user.password_hash):
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.datetime.utcnow() + timedelta(minutes=15)
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        # Success: reset counters
        if (user.failed_login_attempts or 0) > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            await db.commit()
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Usuario inactivo, contacte al administrador"
            )
            
        # Verificar si es usuario administrativo (para no exigirle cambio de contraseña)
        # Consideraremos "administrativo" a cualquiera que no sea exclusivamente inversionista o cliente.
        is_admin = any(role.name.lower() in ("superadmin", "admin", "administrador") for role in user.roles)
        
        if user.must_change_password and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MUST_CHANGE_PASSWORD"
            )
            
        return user

    @staticmethod
    async def register_user(db: AsyncSession, register_data: RegisterRequest) -> User:
        # Check si ya existe
        existing = await db.execute(select(User).where(User.email == register_data.email))
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está registrado."
            )
            
        new_user = User(
            name=register_data.name,
            email=register_data.email,
            password_hash=get_password_hash(register_data.password)
        )
        
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def register_investor(db: AsyncSession, data: InvestorRegisterRequest) -> User:
        import uuid
        from src.models.user_bank_account import UserBankAccount
        from src.models.investor import Investor
        from src.models.investment_request import InvestmentRequest

        # Check si ya existe
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo ya está registrado."
            )

        from sqlalchemy import insert
        from src.models.security import user_roles

        # Buscar el rol (investor o inversionista)
        role_result = await db.execute(select(Role).where(Role.name.ilike("%invest%")))
        role = role_result.scalars().first()
        
        if not role:
            role_result = await db.execute(select(Role).where(Role.name.ilike("%inversionista%")))
            role = role_result.scalars().first()
            
        if not role:
            # Crear el rol automáticamente si no existe en la base de datos
            role = Role(
                name="Investor",
                description="Rol creado automáticamente por el sistema de registro",
                is_system_role="1"
            )
            db.add(role)
            await db.flush()

        new_user = User(
            name=data.name,
            email=data.email,
            password_hash=get_password_hash(data.password),
            document_id=data.documento,
            phone_number=data.numero_celular,
        )
        
        db.add(new_user)
        await db.flush()

        # Inserción directa en la tabla pivot para asegurar el rol
        await db.execute(insert(user_roles).values(user_id=new_user.id, role_id=role.id))

        bank_acc = UserBankAccount(
            user_id=new_user.id,
            banco=data.banco,
            tipo_cuenta=data.tipo_cuenta,
            numero_cuenta=data.numero_cuenta
        )
        db.add(bank_acc)

        req = InvestmentRequest(
            user_id=new_user.id,
            investor_id=None,
            paquete_inversion_id=data.paquete_id,
            monto=data.monto,
            comprobante_path=data.comprobante_path,
            extra_data={
                "kyc_docs": data.kyc_docs,
                "ciudad": data.ciudad,
                "fecha_nacimiento": data.fecha_nacimiento,
                "tipo_documento": data.tipo_documento,
                "contract_period_id": data.contract_period_id
            }
        )
        db.add(req)

        await db.commit()
        
        # Reload user with roles and permissions explicitly loaded to prevent MissingGreenlet during FastAPI serialization
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .where(User.id == new_user.id)
        )
        return result.scalars().first()

    @staticmethod
    async def force_change_password(db: AsyncSession, data: ForceChangePasswordRequest) -> User:
        result = await db.execute(select(User).options(selectinload(User.roles).selectinload(Role.permissions)).where(User.email == data.email))
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        if not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        if not user.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario no requiere un cambio de contraseña obligatorio."
            )
            
        user.password_hash = get_password_hash(data.new_password)
        user.must_change_password = False
        
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> bool:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user or not user.is_active:
            # Por razones de seguridad (evitar enumeración de usuarios), 
            # devolvemos True o un mensaje genérico aunque no exista el usuario.
            return True
            
        token = create_password_reset_token(user.email, user.password_hash)
        # Enviar email
        EmailService.send_password_reset_email(user.email, token)
        return True

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
        payload = verify_password_reset_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado."
            )
            
        email = payload.get("sub")
        hash_fragment = payload.get("hash_fragment")
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado."
            )
            
        # Verificar que el hash siga siendo el mismo (el token no se ha invalidado)
        current_hash_fragment = user.password_hash[-10:] if user.password_hash else ""
        if hash_fragment != current_hash_fragment:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este enlace ya fue utilizado o es inválido."
            )
            
        # Cambiar la contraseña
        user.password_hash = get_password_hash(new_password)
        # Si tenía el flag de obligatoriedad, lo quitamos
        user.must_change_password = False
        
        await db.commit()
        return True
