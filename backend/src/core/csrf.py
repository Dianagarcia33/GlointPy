"""Protección CSRF para la sesión web por cookie HttpOnly (H-33, Fase 2).

Regla: una petición que cambia estado (POST/PUT/PATCH/DELETE) y se autentica SOLO con la cookie
`access_token` (sin cabecera `Authorization`) debe traer `X-Gloint-Client: web` y, si el navegador envía
`Origin`, éste debe ser propio (mismo host) o estar en la lista blanca de CORS.

Por qué basta: una cabecera personalizada obliga a un preflight CORS en peticiones cross-origin y ese preflight
solo lo pasan los orígenes de la lista blanca (src/core/cors.py); además la cookie es SameSite=Lax.
No aplica a: métodos seguros, peticiones con `Authorization: Bearer` (app móvil, API externa), ni a las que no
traen cookie (formularios con X-API-Key, webhooks): un navegador ajeno sin credenciales no envía la cookie.
"""
import logging
from typing import Iterable, Optional
from urllib.parse import urlparse

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from src.core.cors import normalize_origin

logger = logging.getLogger("csrf")

CSRF_HEADER = b"x-gloint-client"
CSRF_VALUE = "web"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
# Autentican por X-API-Key / secreto propio, no por la cookie de sesión
DEFAULT_EXEMPT_PREFIXES = ("/api/v1/webhooks", "/api/v1/crm/public")


def origin_allowed(origin: Optional[str], host: Optional[str], allowed: Iterable[str]) -> bool:
    """True si `origin` es el propio host de la petición o está en la lista blanca."""
    if not origin:
        return True
    origin_n = normalize_origin(origin)
    if origin_n in {normalize_origin(o) for o in allowed}:
        return True
    if host:
        return urlparse(origin_n).netloc == host.strip().lower()
    return False


def _headers(scope: Scope) -> dict:
    return {k.lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}


def request_host(headers: dict) -> str:
    """Host público: el proxy puede reescribir Host, así que se prefiere X-Forwarded-Host."""
    return (headers.get(b"x-forwarded-host") or headers.get(b"host") or "").split(",")[0].strip().lower()


def has_session_cookie(headers: dict) -> bool:
    cookie = headers.get(b"cookie", "")
    return any(p.strip().startswith("access_token=") for p in cookie.split(";"))


class CSRFMiddleware:
    def __init__(self, app: ASGIApp, allowed_origins: Iterable[str], mode: str = "on",
                 exempt_prefixes: Iterable[str] = DEFAULT_EXEMPT_PREFIXES) -> None:
        self.app = app
        self.allowed_origins = list(allowed_origins)
        self.mode = (mode or "on").lower()  # on | report | off
        self.exempt_prefixes = tuple(exempt_prefixes)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or self.mode == "off" or scope["method"] not in UNSAFE_METHODS:
            await self.app(scope, receive, send)
            return

        headers = _headers(scope)
        path = scope.get("path", "")
        needs_check = (
            has_session_cookie(headers)
            and b"authorization" not in headers
            and not path.startswith(self.exempt_prefixes)
        )
        if needs_check:
            reason = None
            if headers.get(CSRF_HEADER, "").strip().lower() != CSRF_VALUE:
                reason = "falta la cabecera X-Gloint-Client"
            else:
                origin = headers.get(b"origin") or (
                    "{0.scheme}://{0.netloc}".format(urlparse(headers[b"referer"])) if headers.get(b"referer") else None
                )
                if not origin_allowed(origin, request_host(headers), self.allowed_origins):
                    reason = "origen no permitido"
            if reason:
                logger.warning("CSRF (%s) %s %s: %s", self.mode, scope["method"], path, reason)
                if self.mode == "on":
                    response = JSONResponse(status_code=403, content={"detail": "Solicitud rechazada por seguridad (CSRF)."})
                    await response(scope, receive, send)
                    return
        await self.app(scope, receive, send)
