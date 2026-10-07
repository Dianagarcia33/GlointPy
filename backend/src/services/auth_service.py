import datetime
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, Request

from src.models.user import User
from src.models.security import Role
from src.schemas.auth import LoginRequest, RegisterRequest, ForceChangePasswordRequest, InvestorRegisterRequest
from src.core.security import verify_password, get_password_hash, create_access_token, create_password_reset_token, verify_password_reset_token
from src.services.email_service import EmailService

class AuthService:
    
    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: LoginRequest, request: Request = None) -> User:
        from src.core.rate_limiter import login_rate_limiter

        if request:
            login_rate_limiter.check_rate_limit(request)

        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.parent),
                selectinload(User.children)
            )
            .where(User.email == login_data.email)
        )
        user = result.scalars().first()
        
        if not user:
            if request:
                login_rate_limiter.record_failed_attempt(request)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        # Check if account is locked
        if user.locked_until and user.locked_until > datetime.datetime.utcnow():
            if request:
                login_rate_limiter.record_failed_attempt(request)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Tu cuenta está bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo más tarde.",
            )
            
        if not verify_password(login_data.password, user.password_hash):
            if request:
                login_rate_limiter.record_failed_attempt(request)

            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            if user.failed_login_attempts >= 5:
                user.locked_until = datetime.datetime.utcnow() + timedelta(minutes=15)
                await db.commit()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta de nuevo en 15 minutos.",
                )
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        # Success: reset counters
        if request:
            login_rate_limiter.reset_attempts(request)

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
        is_admin = any(role.name.lower() in ("superadmin", "admin", "administrador") for role in user.roles)
        
        if user.must_change_password and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="MUST_CHANGE_PASSWORD"
            )
            
        return user


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

        # H-70: Validar código de referido si fue suministrado
        if data.referred_by:
            clean_ref = data.referred_by.strip().upper()
            ref_check = await db.execute(select(Investor.id).where(Investor.assigned_code == clean_ref))
            if not ref_check.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El código de referido '{clean_ref}' no es válido o no existe en la plataforma."
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

        dob = None
        if data.fecha_nacimiento:
            try:
                dob = datetime.strptime(data.fecha_nacimiento, "%Y-%m-%d")
            except Exception:
                dob = None

        new_user = User(
            name=data.name,
            email=data.email,
            password_hash=get_password_hash(data.password),
            document_id=data.documento,
            phone_number=data.numero_celular,
            date_of_birth=dob,
            commercial_id=data.commercial_id
        )
        
        db.add(new_user)
        await db.flush()

        # Inserción directa en la tabla pivot para asegurar el rol
        await db.execute(insert(user_roles).values(user_id=new_user.id, role_id=role.id))

        from decimal import Decimal
        from src.models.wallet import Wallet, WalletStatus

        wallet = Wallet(
            user_id=new_user.id,
            balance=Decimal("0.00"),
            currency="COP",
            status=WalletStatus.ACTIVE
        )
        db.add(wallet)

        if data.banco and data.numero_cuenta:
            bank_acc = UserBankAccount(
                user_id=new_user.id,
                banco=data.banco,
                tipo_cuenta=data.tipo_cuenta or "Ahorros",
                numero_cuenta=data.numero_cuenta
            )
            db.add(bank_acc)

        # Si se enviaron datos de paquete y comprobante (llamadas heredadas), crear solicitud de inversión
        if data.paquete_id and data.monto and data.comprobante_path:
            req = InvestmentRequest(
                user_id=new_user.id,
                investor_id=None,
                paquete_inversion_id=data.paquete_id,
                monto=data.monto,
                comprobante_path=data.comprobante_path,
                extra_data={
                    "nombre_completo": data.name,
                    "tipo_documento": data.tipo_documento,
                    "documento": data.documento,
                    "fecha_nacimiento": data.fecha_nacimiento,
                    "fecha_expedicion": getattr(data, "fecha_expedicion", None),
                    "numero_celular": data.numero_celular,
                    "ciudad": data.ciudad,
                    "banco": data.banco,
                    "tipo_cuenta": data.tipo_cuenta,
                    "numero_cuenta": data.numero_cuenta,
                    "kyc_docs": getattr(data, "kyc_docs", None),
                    "contract_period_id": getattr(data, "contract_period_id", None) or getattr(data, "periodo_id", None),
                    "referred_by": getattr(data, "referred_by", None),
                    "commercial_id": getattr(data, "commercial_id", None),
                    "biometrics": {
                        "verified": getattr(data, "biometric_verified", False),
                        "similarity": getattr(data, "biometric_similarity", None),
                        "attempts": getattr(data, "biometric_attempts", 0),
                        "requires_manual_review": getattr(data, "requires_manual_review", False),
                    }
                }
            )
            db.add(req)

        await db.commit()

        # Lanzar validación de antecedentes SARLAFT en segundo plano con Tusdatos.co
        try:
            from src.services.tusdatos_service import TusdatosService
            import asyncio

            kyc_metadata = {
                "kyc_docs": getattr(data, "kyc_docs", None),
                "biometrics": {
                    "verified": getattr(data, "biometric_verified", False),
                    "similarity": getattr(data, "biometric_similarity", None),
                    "attempts": getattr(data, "biometric_attempts", 0),
                    "requires_manual_review": getattr(data, "requires_manual_review", False),
                },
                "fecha_nacimiento": data.fecha_nacimiento,
                "fecha_expedicion": getattr(data, "fecha_expedicion", None),
                "ciudad": data.ciudad,
                "numero_celular": data.numero_celular
            }

            asyncio.create_task(
                TusdatosService.execute_full_sarlaft_check_background(
                    user_id=new_user.id,
                    document_number=data.documento,
                    document_type=data.tipo_documento,
                    fecha_expedicion=getattr(data, "fecha_expedicion", None),
                    initial_details=kyc_metadata
                )
            )
        except Exception as e:
            print(f"Error al iniciar validación SARLAFT en background: {e}")

        # Enviar correo corporativo de bienvenida y notificación de revisión de cuenta
        try:
            from src.services.email_service import EmailService
            import asyncio

            asyncio.create_task(
                EmailService.send_welcome_and_review_email(
                    to_email=new_user.email,
                    user_name=new_user.name,
                    document_id=new_user.document_id or data.documento,
                    document_type=data.tipo_documento or "CC"
                )
            )
        except Exception as mail_err:
            print(f"Error al programar correo de bienvenida para {new_user.email}: {mail_err}")

        # Si el inversionista seleccionó un Directivo de Inversiones, notificar al Directivo
        if data.commercial_id:
            try:
                from src.services.push_notification_service import PushNotificationService
                await PushNotificationService.create_and_send_notification(
                    db=db,
                    user_id=int(data.commercial_id),
                    title="¡Nuevo Inversionista Asignado!",
                    message=f"El usuario {data.name} ({data.email}) se ha registrado en la plataforma y te ha seleccionado como su Directivo de Inversiones.",
                    type="sistema",
                    link="/dashboard/commercial"
                )
            except Exception as err:
                logger.warning(f"Error enviando notificación al Directivo #{data.commercial_id}: {err}")
        
        # Reload user with roles, permissions, parent and children explicitly loaded to prevent MissingGreenlet during FastAPI serialization
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.parent),
                selectinload(User.children)
            )
            .where(User.id == new_user.id)
        )
        return result.scalars().first()

    @staticmethod
    async def force_change_password(db: AsyncSession, data: ForceChangePasswordRequest) -> User:
        result = await db.execute(
            select(User)
            .options(
                selectinload(User.roles).selectinload(Role.permissions),
                selectinload(User.parent),
                selectinload(User.children)
            )
            .where(User.email == data.email)
        )
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

        # Validar el código OTP enviado al correo (H-76)
        from datetime import datetime
        from src.models.withdrawal_verification_code import WithdrawalVerificationCode

        code_res = await db.execute(
            select(WithdrawalVerificationCode)
            .where(
                WithdrawalVerificationCode.user_id == user.id,
                WithdrawalVerificationCode.code == data.code.strip(),
                WithdrawalVerificationCode.used_at == None
            )
            .order_by(WithdrawalVerificationCode.created_at.desc())
        )
        verification = code_res.scalars().first()
        if not verification:
            raise HTTPException(status_code=400, detail="Código de verificación OTP incorrecto o ya utilizado.")

        expires_at = verification.expires_at.replace(tzinfo=None) if verification.expires_at.tzinfo else verification.expires_at
        if expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="El código de verificación ha expirado. Por favor solicita uno nuevo.")

        verification.used_at = datetime.utcnow()
            
        user.password_hash = get_password_hash(data.new_password)
        user.must_change_password = False
        
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def send_force_password_otp(db: AsyncSession, email: str, current_password: str) -> dict:
        import random
        from datetime import datetime, timedelta
        from src.models.withdrawal_verification_code import WithdrawalVerificationCode

        result = await db.execute(
            select(User).where(User.email == email)
        )
        user = result.scalars().first()
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )

        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )

        if not user.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario no requiere cambio de contraseña obligatorio.",
            )

        code = f"{random.randint(100000, 999999)}"
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        verification = WithdrawalVerificationCode(
            user_id=user.id,
            code=code,
            expires_at=expires_at,
            attempts="0"
        )
        db.add(verification)
        await db.commit()

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Código de Verificación - Cambio de Contraseña</title>
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
                    <h1>Cambio de Contraseña - Gloint</h1>
                </div>
                <div class="content">
                    <p>Hola <strong>{user.name}</strong>,</p>
                    <p>Has ingresado con una contraseña temporal y se requiere el cambio obligatorio de tu contraseña por seguridad.</p>
                    <p>Para autorizar la asignación de tu nueva contraseña, ingresa el siguiente código de verificación de 6 dígitos:</p>
                    <div class="code-box">
                        <p class="code">{code}</p>
                    </div>
                    <p style="font-size: 14px; color: #64748b; text-align: center;">Este código expirará en 10 minutos por motivos de seguridad.</p>
                    <p style="margin-top: 30px;">Si tú no iniciaste este proceso, por favor contacta de inmediato al soporte técnico de Gloint.</p>
                </div>
                <div class="footer">
                    <p>&copy; {datetime.now().year} Gloint. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """

        EmailService.send_html_email(
            to_email=user.email,
            subject="Código de Verificación - Cambio de Contraseña Gloint",
            html_content=html_content
        )

        return {"message": "Código de verificación enviado exitosamente a tu correo electrónico."}

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str, background_tasks=None) -> bool:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user or not user.is_active:
            # Por razones de seguridad (evitar enumeración de usuarios), 
            # devolvemos True o un mensaje genérico aunque no exista el usuario.
            return True
            
        token = create_password_reset_token(user.email, user.password_hash)
        # Enviar email en segundo plano si background_tasks está disponible
        if background_tasks:
            background_tasks.add_task(EmailService.send_password_reset_email, user.email, token)
        else:
            EmailService.send_password_reset_email(user.email, token)
        return True


    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> bool:
        print("[RESET_PASSWORD] Inicio de reset_password...", flush=True)
        payload = verify_password_reset_token(token)
        if not payload:
            print("[RESET_PASSWORD] Token o payload inválido", flush=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado."
            )
            
        email = payload.get("sub")
        hash_fragment = payload.get("hash_fragment")
        print(f"[RESET_PASSWORD] Usuario identificado: {email}", flush=True)
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        
        if not user or not user.is_active:
            print("[RESET_PASSWORD] Usuario no encontrado o inactivo", flush=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token inválido o expirado."
            )
            
        # Verificar que el hash siga siendo el mismo (el token no se ha invalidado)
        current_hash_fragment = user.password_hash[-10:] if user.password_hash else ""
        if hash_fragment != current_hash_fragment:
            print(f"[RESET_PASSWORD] Token expirado/utilizado (hash fragment no coincide)", flush=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Este enlace ya fue utilizado o es inválido."
            )
            
        print("[RESET_PASSWORD] Hasheando nueva contraseña...", flush=True)
        from starlette.concurrency import run_in_threadpool
        user.password_hash = await run_in_threadpool(get_password_hash, new_password)
        user.must_change_password = False
        
        print("[RESET_PASSWORD] Ejecutando db.commit()...", flush=True)
        await db.commit()
        print("[RESET_PASSWORD] ¡Contraseña cambiada exitosamente!", flush=True)
        return True

