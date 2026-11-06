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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas (1 día completo)

    # Sesiones de la app móvil (token de acceso corto + token de refresco por dispositivo)
    MOBILE_ACCESS_TOKEN_MINUTES: int = 15      # vida del token de acceso de la app
    REFRESH_IDLE_DAYS: int = 30                # la sesión del dispositivo vence tras estos días sin usarse
    REFRESH_ABSOLUTE_DAYS: int = 90            # tope absoluto: pasado este plazo hay que iniciar sesión de nuevo
    REFRESH_REUSE_GRACE_SECONDS: int = 60      # tolerancia al reintento de un refresco cuyo resultado se perdió
    MAX_DEVICE_SESSIONS: int = 10              # sesiones móviles simultáneas por usuario
    
    # Base de Datos
    DB_HOST: str
    DB_PORT: int = 3306
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str
    # H-65: auditoría genérica de escrituras e IP fiable del cliente
    AUDIT_HTTP_WRITES_ENABLED: bool = True   # False apaga el registro genérico (no el detallado)
    AUDIT_PROXY_HOPS: int = 1                # proxies de confianza delante de la API (0 = ignorar X-Forwarded-For)
    AUDIT_CLIENT_IP_HEADER: str = ""         # p. ej. "x-real-ip" si el proxy lo SOBRESCRIBE siempre
    SQL_ECHO: bool = False  # Imprime cada consulta SQL en consola (solo para depurar; es costoso)
    
    # Encryption
    BANK_ENCRYPTION_KEY: str = "oI0T7pW5j2X2qQ5G2HwX6mH8uW7lI0_gK2U7gO8yMvw="

    # AWS Settings
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"

    # Resend Email Settings
    RESEND_API_KEY: Optional[str] = None
    SENDER_EMAIL: str = "soporte@gloint.com.co"

    # Mux (transmisión en vivo del evento). Clave de firma de reproducción: la llave privada va en base64.
    MUX_SIGNING_KEY_ID: Optional[str] = None
    MUX_SIGNING_PRIVATE_KEY: Optional[str] = None

    # Gemini AI Settings (Chatbot de Inversión)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    # IMAP Settings (Recepción cPanel)
    IMAP_HOST: str = "host81.latinoamericahosting.com"
    IMAP_PORT: int = 993
    IMAP_USER: Optional[str] = None
    IMAP_PASSWORD: Optional[str] = None

    # Frontend URL for emails
    FRONTEND_URL: str = "http://localhost:5173"

    # Tickeds API
    TICKEDS_API_URL: str = "http://tickeds.glointech.com.co/api/v1/external/tickets"
    TICKEDS_API_EXTERNAL_BASE: str = "http://tickeds.glointech.com.co/api/v1/external"
    TICKEDS_API_UPLOAD_URL: str = "http://tickeds.glointech.com.co/api/v1/upload"
    TICKEDS_API_KEY: str = "gtk_live_glointpy_b13847f78de39d43"

    # Yoint Payments API (Dispersions)
    YOINT_API_URL: str = "https://dev-transaccional-payments.yoint.co"
    YOINT_AUTH_URL: str = "https://payments-dev.auth.us-east-1.amazoncognito.com/oauth2/token"
    YOINT_API_KEY: Optional[str] = None
    YOINT_CLIENT_ID: Optional[str] = None
    YOINT_CLIENT_SECRET: Optional[str] = None
    YOINT_WEBHOOK_SECRET: Optional[str] = None
    YOINT_SERVICE_CODE: str = "1001"

    # Tusdatos.co SARLAFT API (Sandbox / Ambiente de pruebas oficial por defecto)
    TUSDATOS_BASE_URL: str = "https://docs.tusdatos.co"
    TUSDATOS_USERNAME: str = "pruebas"
    TUSDATOS_PASSWORD: str = "password"

    # CORS con credenciales (H-33): solo estos orígenes (CSV) pueden leer respuestas con la cookie de sesión.
    # En staging/producción web y API comparten dominio (no hace falta CORS); en el .env de cada servidor se
    # listan los dominios propios, p. ej. https://gloint.com.co,https://www.gloint.com.co
    CORS_ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"

    # SameSite de la cookie de sesión: "lax" (por defecto). "none" solo como reversa de emergencia.
    COOKIE_SAMESITE: str = "lax"

    # CSRF de la sesión web por cookie (H-33 Fase 2): on | report (solo registra) | off
    CSRF_ENFORCE: str = "on"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def DATABASE_URL(self) -> str:
        # Construye la URL de conexión asíncrona para aiomysql
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    def get_credentialed_origins(self) -> list:
        """Lista blanca de orígenes con credenciales: CORS_ALLOWED_ORIGINS + el origen de FRONTEND_URL."""
        from urllib.parse import urlparse
        from src.core.cors import parse_origins

        origins = parse_origins(self.CORS_ALLOWED_ORIGINS)
        parsed = urlparse((self.FRONTEND_URL or "").strip())
        if parsed.scheme and parsed.netloc:
            front = f"{parsed.scheme}://{parsed.netloc}".lower()
            if front not in origins:
                origins.append(front)
        return origins

# Instancia global de las configuraciones
settings = Settings()
