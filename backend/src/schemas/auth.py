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
    contract_period_id: int
    kyc_docs: list[str]
    fecha_nacimiento: Optional[str] = None
    comprobante_path: str
    referred_by: Optional[str] = None
    commercial_id: Optional[int] = None


class ForceChangePasswordRequest(BaseModel):
    email: EmailStr
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
