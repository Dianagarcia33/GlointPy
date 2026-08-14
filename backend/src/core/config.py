from __future__ import annotations
import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Entorno
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "super_secret_key_change_me_in_production"
    ALGORITHM: str = "HS256"
    
    # Base de Datos
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    
    # Encryption
    BANK_ENCRYPTION_KEY: str = "oI0T7pW5j2X2qQ5G2HwX6mH8uW7lI0_gK2U7gO8yMvw="

    # AWS Settings
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    # Resend Email Settings
    RESEND_API_KEY: Optional[str] = None
    SENDER_EMAIL: str = "soporte@gloint.com.co"
    
    # IMAP Settings (Recepción cPanel)
    IMAP_HOST: str = "host81.latinoamericahosting.com"
    IMAP_PORT: int = 993
    IMAP_USER: Optional[str] = None
    IMAP_PASSWORD: Optional[str] = None

    # Frontend URL for emails
    FRONTEND_URL: str = "http://localhost:5173"

    # Tickeds API
    TICKEDS_API_URL: str = "https://tickeds.glointech.com.co/api/v1/external/tickets"
    TICKEDS_API_KEY: str = "gtk_live_glointpy_b13847f78de39d43"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def DATABASE_URL(self) -> str:
        # Construye la URL de conexión asíncrona para aiomysql
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

# Instancia global de las configuraciones
settings = Settings()
