from datetime import datetime, timedelta
from typing import Union, Any
import bcrypt
from jose import jwt
from src.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica si la contraseña en texto plano coincide con el hash (ej. el de Laravel)."""
    try:
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
            
        # PHP/Laravel usa $2y$, pero la librería bcrypt de Python prefiere $2b$
        if hashed_password.startswith(b'$2y$'):
            hashed_password = b'$2b$' + hashed_password[4:]
            
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hashea una contraseña usando bcrypt (ideal para nuevos registros)."""
    if isinstance(password, str):
        password = password.encode('utf-8')
    return bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """Genera el token JWT de acceso (24 horas)."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        minutes = getattr(settings, 'ACCESS_TOKEN_EXPIRE_MINUTES', 1440)
        expire = datetime.utcnow() + timedelta(minutes=minutes)
        
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    """Genera el Refresh Token (7 días)."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
        
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.SECRET_KEY, 
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt

def create_password_reset_token(email: str, password_hash: str) -> str:
    """Genera un token temporal para recuperación de contraseña."""
    expire = datetime.utcnow() + timedelta(minutes=15)
    # Incluimos un pedazo del hash de la contraseña actual para que el token se invalide 
    # automáticamente si la contraseña es cambiada por otro medio o si se usa el token una vez.
    to_encode = {
        "exp": expire,
        "sub": email,
        "type": "reset_password",
        "hash_fragment": password_hash[-10:] if password_hash else ""
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def verify_password_reset_token(token: str) -> dict:
    """Verifica y decodifica un token de recuperación. Devuelve el payload si es válido."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "reset_password":
            return None
        return payload
    except Exception:
        return None
