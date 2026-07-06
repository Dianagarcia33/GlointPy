from pydantic import BaseModel, EmailStr

from typing import Optional, List

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Optional['UserResponse'] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_active: bool
    roles_list: List[str] = []
    permissions: List[str] = []

    class Config:
        from_attributes = True

from datetime import date

class InvestorRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    tipo_documento: str
    documento: str
    numero_celular: str
    ciudad: str
    fecha_nacimiento: Optional[date] = None
    banco: str
    tipo_cuenta: str
    numero_cuenta: str
    paquete_id: Optional[int] = None
    monto: float
    comprobante_path: Optional[str] = None
    contract_period_id: Optional[int] = None
    kyc_docs: Optional[List[str]] = None
