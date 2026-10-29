import datetime
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status, Request

from src.models.user import User
from src.models.security import Role
from src.schemas.auth import LoginRequest, RegisterRequest, ForceChangePasswordRequest, InvestorRegisterRequest
from src.core.security import averify_password, aget_password_hash, get_password_hash, create_access_token, create_password_reset_token, verify_password_reset_token
from src.services.email_service import EmailService
from src.core.session_revocation import revoke_user_sessions, close_live_connections
from src.core.password_policy import ensure_valid_password

# Código OTP del cambio obligatorio de contraseña: propósito propio e intentos máximos por código
FORCE_PASSWORD_PURPOSE = "force_password_change"
MAX_OTP_ATTEMPTS = 5

# Correos de recuperación: máx. 3 por dirección cada hora (evita llenar el buzón de otra persona desde varias IP)
RESET_EMAIL_MAX = 3
RESET_EMAIL_WINDOW_SECONDS = 3600
_reset_email_log: dict = {}


def _reset_email_allowed(email: str) -> bool:
    import time
    now = time.time()
    key = (email or "").strip().lower()
    recent = [t for t in _reset_email_log.get(key, []) if now - t < RESET_EMAIL_WINDOW_SECONDS]
    if len(recent) >= RESET_EMAIL_MAX:
        _reset_email_log[key] = recent
        return False
    recent.append(now)
    _reset_email_log[key] = recent
    return True


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
            
        if not await averify_password(login_data.password, user.password_hash):
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
            password_hash=await aget_password_hash(data.password),
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
            
        if not await averify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )
            
        if not user.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario no requiere un cambio de contraseña obligatorio."
            )

        # La política se valida antes de tocar el OTP: una clave débil no debe quemar el código
        ensure_valid_password(data.new_password)

        # Validar el código OTP enviado al correo (H-76)
        import secrets
        from datetime import datetime
        from src.models.withdrawal_verification_code import WithdrawalVerificationCode

        code_res = await db.execute(
            select(WithdrawalVerificationCode)
            .where(
                WithdrawalVerificationCode.user_id == user.id,
                WithdrawalVerificationCode.purpose == FORCE_PASSWORD_PURPOSE,
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

        if not secrets.compare_digest(str(verification.code), (data.code or "").strip()):
            try:
                attempts = int(verification.attempts or 0) + 1
            except (TypeError, ValueError):
                attempts = 1
            verification.attempts = str(attempts)
            remaining = max(0, MAX_OTP_ATTEMPTS - attempts)
            if remaining == 0:
                verification.used_at = datetime.utcnow()  # agotó los intentos: hay que pedir un código nuevo
            await db.commit()
            extra = f" Te quedan {remaining} intento{'s' if remaining != 1 else ''}." if remaining else " Solicita un nuevo código."
            raise HTTPException(status_code=400, detail="Código de verificación OTP incorrecto o ya utilizado." + extra)

        verification.used_at = datetime.utcnow()
            
        user.password_hash = await aget_password_hash(data.new_password)
        user.must_change_password = False
        # Las sesiones anteriores (con la clave temporal) dejan de valer; el endpoint emite un token nuevo
        await revoke_user_sessions(db, user)
        
        await db.commit()
        await db.refresh(user)
        await close_live_connections(user.id)
        return user

    @staticmethod
    async def send_force_password_otp(db: AsyncSession, email: str, current_password: str) -> dict:
        import secrets
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

        if not await averify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Correo o contraseña incorrectos",
            )

        if not user.must_change_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El usuario no requiere cambio de contraseña obligatorio.",
            )

        code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        # Solo un código vigente por usuario para este propósito: los anteriores quedan invalidados
        await db.execute(
            WithdrawalVerificationCode.__table__.update()
            .where(WithdrawalVerificationCode.user_id == user.id)
            .where(WithdrawalVerificationCode.purpose == FORCE_PASSWORD_PURPOSE)
            .where(WithdrawalVerificationCode.used_at == None)
            .values(used_at=datetime.utcnow())
        )

        verification = WithdrawalVerificationCode(
            user_id=user.id,
            code=code,
            expires_at=expires_at,
            attempts="0",
            purpose=FORCE_PASSWORD_PURPOSE
        )
        db.add(verification)
        await db.commit()

        from src.services.email_template_service import EmailTemplateService
        subject, html_content = EmailTemplateService.get_otp_verification_template(
            user_name=user.name or "Usuario",
            code=code,
            purpose="Cambio Obligatorio de Contraseña",
            action_details="Has ingresado con una clave temporal y se requiere el cambio obligatorio de tu contraseña por seguridad.",
            expires_minutes=10
        )

        EmailService.send_html_email(
            to_email=user.email,
            subject=subject,
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
            
        if not _reset_email_allowed(user.email):
            # Demasiadas solicitudes para esta dirección: no se envía otro correo, pero la respuesta es idéntica
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
        ensure_valid_password(new_password)
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
        # Revoca las sesiones abiertas: si la cuenta estaba comprometida, el atacante pierde su token
        await revoke_user_sessions(db, user)
        
        print("[RESET_PASSWORD] Ejecutando db.commit()...", flush=True)
        await db.commit()
        await close_live_connections(user.id)
        print("[RESET_PASSWORD] ¡Contraseña cambiada exitosamente!", flush=True)
        return True

