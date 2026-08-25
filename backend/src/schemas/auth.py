from pydantic import BaseModel, EmailStr
from typing import Optional

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
    ciudad: str
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    monto: float
    paquete_id: int
    comprobante_path: str
    referred_by: Optional[str] = None
    commercial_id: Optional[int] = None

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
