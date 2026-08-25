from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from typing import List, Optional, Any, Dict
from datetime import datetime
from src.schemas.security import RoleResponse
from src.schemas.user_bank_account import UserBankAccountResponse
from src.schemas.wallet import WalletResponse

class UserBase(BaseModel):
    name: str
    email: EmailStr
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False

class UserCreate(UserBase):
    password: str

def _validate_date_of_birth(v):
    if v == "" or v == "null" or v is None:
        return None
    from datetime import datetime, date
    if isinstance(v, str):
        try:
            d = datetime.strptime(v.split("T")[0], "%Y-%m-%d").date()
        except ValueError:
            raise ValueError("Formato de fecha de nacimiento inválido (debe ser AAAA-MM-DD).")
    elif isinstance(v, (datetime, date)):
        d = v.date() if isinstance(v, datetime) else v
    else:
        return v
    
    today = date.today()
    if d > today:
        raise ValueError("La fecha de nacimiento no puede ser una fecha futura.")
    return d

class UserCreateAdmin(UserBase):
    model_config = ConfigDict(extra="ignore")
    document_id: str = Field(..., min_length=3, max_length=50, description="Documento de identidad obligatorio")
    date_of_birth: Optional[Any] = None
    role_ids: List[int] = Field(..., min_length=1, description="Debe asignarse al menos un rol al usuario")

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_empty_date(cls, v):
        return _validate_date_of_birth(v)

    @field_validator('role_ids')
    @classmethod
    def validate_roles(cls, v):
        if not v or len(v) == 0:
            raise ValueError("Debe asignarse al menos un rol al usuario")
        return v

class UserUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    must_change_password: Optional[bool] = None
    date_of_birth: Optional[Any] = None
    permissions_override: Optional[Dict[str, bool]] = None

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_empty_date(cls, v):
        return _validate_date_of_birth(v)

class UserUpdateAdmin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    date_of_birth: Optional[Any] = None
    role_ids: Optional[List[int]] = None

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_empty_date(cls, v):
        return _validate_date_of_birth(v)

    @field_validator('role_ids')
    @classmethod
    def validate_roles(cls, v):
        if v is not None and len(v) == 0:
            raise ValueError("El usuario debe tener al menos un rol asignado")
        return v

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    is_superuser: bool
    must_change_password: bool
    date_of_birth: Optional[Any] = None
    permissions_override: Optional[Any] = None
    created_at: Any
    updated_at: Any
    
    # Devuelve los roles y permisos asociados
    roles: List[RoleResponse] = []
    permissions: Optional[List[str]] = []
    
    model_config = ConfigDict(from_attributes=True)

class UserWithBankAccountsResponse(UserResponse):
    bank_accounts: List[UserBankAccountResponse] = []
    wallet: Optional[WalletResponse] = None

class UserPaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[UserWithBankAccountsResponse]
