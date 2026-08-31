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
    email: EmailStr
    password: str
    numero_celular: str
    fecha_nacimiento: str
    ciudad: str
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    monto: float
    paquete_id: int
    periodo_id: Optional[int] = None
    contract_period_id: Optional[int] = None
    comprobante_path: str
    kyc_docs: Optional[Any] = None
    referred_by: Optional[str] = None
    commercial_id: Optional[int] = None

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


class ForceChangePasswordRequest(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
