from pydantic import BaseModel, EmailStr

from typing import Optional

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

    class Config:
        from_attributes = True
