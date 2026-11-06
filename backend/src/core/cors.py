"""Política CORS de la API (H-33).

Antes: `allow_origin_regex=".*"` + `allow_credentials=True`. Starlette reflejaba CUALQUIER origen con
`Access-Control-Allow-Credentials: true`, así que cualquier sitio podía leer respuestas autenticadas con la
cookie de sesión del usuario.

Ahora hay dos políticas, y se elige una según la cabecera `Origin` de cada petición:
  - Origen en la lista blanca (front propio / desarrollo local): se refleja el origen y se permiten credenciales.
  - Cualquier otro origen o sin `Origin`: `Access-Control-Allow-Origin: *` y SIN credenciales. Así siguen
    funcionando los formularios web del CRM y las landings (X-API-Key, sin cookies), pero el navegador no
    entrega al sitio ajeno una respuesta obtenida con la cookie de sesión.
"""
from typing import Iterable, List

from starlette.middleware.cors import CORSMiddleware
from starlette.types import ASGIApp, Message, Receive, Scope, Send


def normalize_origin(origin: str) -> str:
    """Un origen se compara en minúsculas y sin barra final."""
    return origin.strip().rstrip("/").lower()


def parse_origins(raw: str) -> List[str]:
    """Convierte 'a, b/ ,,c' en ['a', 'b', 'c'] (sin vacíos ni duplicados, conservando el orden)."""
    seen: List[str] = []
    for item in (raw or "").split(","):
        value = normalize_origin(item)
        if value and value not in seen:
            seen.append(value)
    return seen


class SplitCORSMiddleware:
    """Aplica la política con credenciales solo a los orígenes de la lista blanca."""

    def __init__(self, app: ASGIApp, credentialed_origins: Iterable[str]) -> None:
        self.credentialed_origins = {normalize_origin(o) for o in credentialed_origins if o and o.strip()}
        self.credentialed = CORSMiddleware(
            app,
            allow_origins=sorted(self.credentialed_origins),
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        # allow_headers=["*"] hace que el preflight refleje las cabeceras pedidas (incluida Authorization)
        self.public = CORSMiddleware(
            app,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.public(scope, receive, send)
            return

        origin = ""
        for name, value in scope.get("headers", []):
            if name == b"origin":
                origin = normalize_origin(value.decode("latin-1"))
                break

        policy = self.credentialed if origin and origin in self.credentialed_origins else self.public

        async def send_with_vary(message: Message) -> None:
            # La respuesta depende del Origin: los cachés no deben mezclar ambas políticas
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                has_vary_origin = any(
                    k.lower() == b"vary" and b"origin" in v.lower() for k, v in headers
                )
                if not has_vary_origin:
                    headers.append((b"vary", b"Origin"))
                message = {**message, "headers": headers}
            await send(message)

        await policy(scope, receive, send_with_vary)
