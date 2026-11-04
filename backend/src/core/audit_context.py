"""Marca por petición: indica si ya se escribió un registro de auditoría detallado (H-65).

El middleware genérico crea un diccionario por petición; `log_audit_trail` lo marca para que
el middleware no duplique la entrada.
"""
from contextvars import ContextVar
from typing import Optional

audit_request_ctx: ContextVar[Optional[dict]] = ContextVar("audit_request_ctx", default=None)


def mark_detailed_logged() -> None:
    ctx = audit_request_ctx.get()
    if ctx is not None:
        ctx["detailed"] = True


def resolve_client_ip(headers, client_host: Optional[str]) -> Optional[str]:
    """IP del cliente para auditoría, resistente a falsificación.

    `X-Forwarded-For` lo puede escribir el propio cliente: el proxy AÑADE su observación al FINAL.
    Por eso no se toma el primer valor sino el que está `AUDIT_PROXY_HOPS` saltos desde la derecha.
    Orden: cabecera dedicada (solo si el proxy la sobrescribe) > salto de confianza de XFF >
    IP de la conexión. `headers` es cualquier mapeo con `.get(nombre_en_minúsculas)`.
    """
    from src.core.config import settings

    dedicated = (settings.AUDIT_CLIENT_IP_HEADER or "").strip().lower()
    if dedicated:
        v = headers.get(dedicated)
        if v:
            return v.split(",")[0].strip()[:50] or None
    hops = settings.AUDIT_PROXY_HOPS
    fwd = headers.get("x-forwarded-for")
    if fwd and hops > 0:
        parts = [p.strip() for p in fwd.split(",") if p.strip()]
        if len(parts) >= hops:
            return parts[-hops][:50]
        if parts:
            return parts[0][:50]
    return str(client_host)[:50] if client_host else None
