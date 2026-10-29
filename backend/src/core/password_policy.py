"""Política de contraseña única para web, apps y API (la misma que ya exige el frontend)."""
from __future__ import annotations

import re

POLICY_MESSAGE = (
    "La contraseña debe tener al menos 8 caracteres, con mayúscula, minúscula, número y un carácter especial."
)


def is_valid_password(password: str) -> bool:
    return bool(
        isinstance(password, str)
        and len(password) >= 8
        and re.search(r"[A-Z]", password)
        and re.search(r"[a-z]", password)
        and re.search(r"[0-9]", password)
        and re.search(r"[^A-Za-z0-9]", password)
    )


def ensure_valid_password(password: str) -> None:
    """Lanza HTTP 400 con el mensaje de la política si la contraseña no la cumple."""
    if not is_valid_password(password):
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=POLICY_MESSAGE)
