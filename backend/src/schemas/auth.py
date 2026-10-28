import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, Any

from src.schemas.user import UserResponse

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None
    user: Optional[UserResponse] = None
    
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    commercial_id: Optional[int] = None

class InvestorRegisterRequest(BaseModel):
    name: str
    documento: str
    tipo_documento: str
    fecha_expedicion: Optional[str] = None
    email: EmailStr
    password: str
    numero_celular: str
    fecha_nacimiento: str
    ciudad: str
    banco: Optional[str] = None
    tipo_cuenta: Optional[str] = None
    numero_cuenta: Optional[str] = None
    monto: Optional[float] = None
    paquete_id: Optional[int] = None
    periodo_id: Optional[int] = None
    contract_period_id: Optional[int] = None
    comprobante_path: Optional[str] = None
    kyc_docs: Optional[Any] = None
    biometric_verified: Optional[bool] = False
    biometric_similarity: Optional[float] = None
    biometric_attempts: Optional[int] = 0
    requires_manual_review: Optional[bool] = False
    referred_by: Optional[str] = None
    commercial_id: Optional[int] = None

    @field_validator("numero_celular")
    @classmethod
    def validate_numero_celular(cls, v: str) -> str:
        # Celular colombiano de 10 dígitos que empieza por 3 (H-148)
        clean = re.sub(r"[\s\-\(\)\.]", "", (v or "").strip())
        if clean.startswith("+57"):
            clean = clean[3:]
        elif clean.startswith("57") and len(clean) == 12:
            clean = clean[2:]
        if not re.fullmatch(r"3\d{9}", clean):
            raise ValueError("El celular debe ser un número colombiano de 10 dígitos que empiece por 3 (ej. 3001234567).")
        return clean

    @field_validator("numero_cuenta")
    @classmethod
    def validate_numero_cuenta(cls, v: Optional[str]) -> Optional[str]:
        # Solo dígitos (se permiten espacios y guiones al escribir), entre 6 y 20 (H-148)
        if v is None or not v.strip():
            return None
        clean = re.sub(r"[\s\-]", "", v.strip())
        if not re.fullmatch(r"\d{6,20}", clean):
            raise ValueError("El número de cuenta debe tener solo dígitos (entre 6 y 20).")
        return clean

    @field_validator("fecha_nacimiento")
    @classmethod
    def validate_fecha_nacimiento(cls, v: Optional[str]) -> str:
        if not v or not v.strip():
            raise ValueError("La fecha de nacimiento es obligatoria para el cumplimiento legal y KYC.")
        from datetime import datetime, date
        try:
            birth_date = datetime.strptime(v.strip(), "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Formato de fecha de nacimiento inválido (debe ser AAAA-MM-DD).")
        
        today = date.today()
        if birth_date > today:
            raise ValueError("La fecha de nacimiento no puede ser una fecha futura.")
        
        # Calcular mayoría de edad (18 años)
        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        if age < 18:
            raise ValueError(f"El inversionista debe ser mayor de 18 años para celebrar contratos en la plataforma (edad: {age} años).")
        if age > 110:
            raise ValueError("Por favor verifica la fecha de nacimiento ingresada.")
        return v.strip()

    @field_validator("referred_by")
    @classmethod
    def validate_referred_by(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        import re
        v_clean = v.strip().upper()
        if not re.match(r"^[A-Z0-9_-]{2,25}$", v_clean):
            raise ValueError("El código de referido debe tener entre 2 y 25 caracteres alfanuméricos válidos (ej. IG1974).")
        return v_clean


class SendForcePasswordOtpRequest(BaseModel):
    email: EmailStr
    current_password: str

class ForceChangePasswordRequest(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str
    code: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
