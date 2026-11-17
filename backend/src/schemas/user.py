from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator, model_validator
from typing import List, Optional, Any, Dict
from datetime import datetime
from src.schemas.security import RoleResponse
from src.schemas.user_bank_account import UserBankAccountResponse
from src.schemas.wallet import WalletResponse
from src.core.person_name import compose_full_name, clean_part


class NamePartsMixin(BaseModel):
    """Primer nombre y primer apellido obligatorios; segundo nombre y segundo apellido opcionales.
    `name` (nombre completo) se calcula; si un cliente antiguo solo manda `name`, se acepta tal cual."""
    name: Optional[str] = None
    first_name: Optional[str] = Field(None, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    second_last_name: Optional[str] = Field(None, max_length=100)

    @model_validator(mode='after')
    def _compose_name(self):
        if clean_part(self.first_name) or clean_part(self.last_name):
            if not clean_part(self.first_name):
                raise ValueError("El primer nombre es obligatorio.")
            if not clean_part(self.last_name):
                raise ValueError("El primer apellido es obligatorio.")
            self.first_name = clean_part(self.first_name)
            self.middle_name = clean_part(self.middle_name)
            self.last_name = clean_part(self.last_name)
            self.second_last_name = clean_part(self.second_last_name)
            self.name = compose_full_name(self.first_name, self.middle_name, self.last_name, self.second_last_name)
        elif not clean_part(self.name):
            raise ValueError("El primer nombre y el primer apellido son obligatorios.")
        return self


class UserBase(NamePartsMixin):
    email: EmailStr
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    parent_user_id: Optional[int] = None

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
    if d == today:
        raise ValueError("La fecha de nacimiento debe ser anterior a hoy.")  # H-198
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
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    second_last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    must_change_password: Optional[bool] = None
    date_of_birth: Optional[Any] = None
    permissions_override: Optional[Dict[str, bool]] = None
    parent_user_id: Optional[int] = None

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_empty_date(cls, v):
        return _validate_date_of_birth(v)

class UserUpdateAdmin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: Optional[str] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    middle_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    second_last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: Optional[bool] = None
    date_of_birth: Optional[Any] = None
    role_ids: Optional[List[int]] = None
    parent_user_id: Optional[int] = None
    must_update_profile: Optional[bool] = None

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

class UserProfileUpdate(NamePartsMixin):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    document_id: Optional[str] = Field(None, max_length=50)
    phone_number: Optional[str] = Field(None, max_length=50)
    date_of_birth: Optional[Any] = None
    # Cuenta con la que seguirá iniciando sesión cuando su documento está en varias cuentas
    keep_account_id: Optional[int] = None

    @field_validator('date_of_birth', mode='before')
    @classmethod
    def parse_empty_date(cls, v):
        return _validate_date_of_birth(v)

class DuplicateAccountOut(BaseModel):
    id: int
    email: str
    is_self: bool

class DuplicateAccountsResponse(BaseModel):
    accounts: List[DuplicateAccountOut] = []
    keep_account_id: Optional[int] = None

class UserChangePassword(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=100)

class ForceProfileUpdateRequest(BaseModel):
    user_ids: Optional[List[int]] = None
    force_all: bool = False

class UserSummaryOut(BaseModel):
    id: int
    name: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    second_last_name: Optional[str] = None
    email: str
    document_id: Optional[str] = None
    date_of_birth: Optional[Any] = None
    parent_user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class UserResponse(BaseModel):
    id: int
    name: str
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    second_last_name: Optional[str] = None
    email: str
    document_id: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    is_active: bool
    is_superuser: bool
    must_change_password: bool
    must_update_profile: bool = False
    date_of_birth: Optional[Any] = None
    permissions_override: Optional[Any] = None
    parent_user_id: Optional[int] = None
    parent: Optional[UserSummaryOut] = None
    children: List[UserSummaryOut] = []
    # Cuántas cuentas comparten su documento (solo se calcula en el listado del admin) y con cuál eligió quedarse
    duplicate_document_count: int = 0
    unify_keep_user_id: Optional[int] = None
    created_at: Any
    updated_at: Any
    
    # Devuelve los roles y permisos asociados
    roles: List[RoleResponse] = []
    permissions: Optional[List[str]] = []
    temp_password: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def check_unloaded_relations(cls, data: Any) -> Any:
        if hasattr(data, '_sa_instance_state'):
            state = data._sa_instance_state
            loaded_data = {}
            if hasattr(data, '__table__'):
                for col in data.__table__.columns:
                    loaded_data[col.name] = getattr(data, col.name, None)
            else:
                for k, v in state.dict.items():
                    loaded_data[k] = v

            # Safe relationship access avoiding MissingGreenlet
            from sqlalchemy.orm.base import NO_VALUE
            r = state.dict.get('roles', [])
            loaded_data['roles'] = r if (isinstance(r, list) and r is not NO_VALUE) else []
            p = state.dict.get('parent', None)
            loaded_data['parent'] = None if p is NO_VALUE else p
            c = state.dict.get('children', [])
            loaded_data['children'] = c if (isinstance(c, list) and c is not NO_VALUE) else []
            if 'bank_accounts' in state.dict and state.dict['bank_accounts'] is not NO_VALUE:
                loaded_data['bank_accounts'] = state.dict['bank_accounts']
            if 'wallet' in state.dict and state.dict['wallet'] is not NO_VALUE:
                loaded_data['wallet'] = state.dict['wallet']

            loaded_data['permissions_override'] = getattr(data, 'permissions_override', None)
            loaded_data['permissions'] = getattr(data, 'permissions', [])
            loaded_data['temp_password'] = getattr(data, 'temp_password', None)
            loaded_data['duplicate_document_count'] = getattr(data, 'duplicate_document_count', 0) or 0

            for field in ('id', 'name', 'email', 'is_active', 'is_superuser', 'must_change_password', 'must_update_profile', 'created_at', 'updated_at', 'temp_password'):
                if field not in loaded_data and hasattr(data, field):
                    loaded_data[field] = getattr(data, field)

            return loaded_data
        return data

class UserWithBankAccountsResponse(UserResponse):
    bank_accounts: List[UserBankAccountResponse] = []
    wallet: Optional[WalletResponse] = None

class UserPaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    data: List[UserWithBankAccountsResponse]
