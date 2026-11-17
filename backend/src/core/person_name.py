"""Nombre de persona separado: primer nombre, segundo nombre (opcional), primer apellido y segundo apellido (opcional)."""
from typing import Optional

NAME_PART_FIELDS = ("first_name", "middle_name", "last_name", "second_last_name")


def clean_part(value: Optional[str]) -> Optional[str]:
    value = " ".join((value or "").split())
    return value or None


def compose_full_name(first_name=None, middle_name=None, last_name=None, second_last_name=None) -> str:
    parts = (clean_part(p) for p in (first_name, middle_name, last_name, second_last_name))
    return " ".join(p for p in parts if p)


def apply_name_parts(user, data: dict) -> None:
    """Copia al usuario las partes presentes en `data` y recalcula `user.name` a partir de las partes guardadas."""
    touched = False
    for field in NAME_PART_FIELDS:
        if field in data:
            setattr(user, field, clean_part(data[field]))
            touched = True
    if touched:
        full = compose_full_name(user.first_name, user.middle_name, user.last_name, user.second_last_name)
        if full:
            user.name = full
