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
