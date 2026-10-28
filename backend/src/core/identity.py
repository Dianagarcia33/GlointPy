"""
Validación de datos de identidad del perfil (H-198): documento, teléfono y fecha de nacimiento.

Cada función devuelve el valor normalizado o lanza ValueError con un mensaje listo para mostrar.
El documento admite solo dígitos (se aceptan puntos, espacios y guiones al escribirlo); el teléfono,
un celular colombiano de 10 dígitos que empieza por 3 o un número internacional con prefijo +.
"""
import re
from datetime import date

MAX_AGE_YEARS = 110


def normalize_document_id(value: str) -> str:
    clean = re.sub(r"[\s\.\-]", "", (value or "").strip())
    if not re.fullmatch(r"\d{5,15}", clean):
        raise ValueError("El documento de identidad debe contener solo números (entre 5 y 15 dígitos).")
    return clean


def normalize_phone_number(value: str) -> str:
    raw = (value or "").strip()
    clean = re.sub(r"[\s\-\(\)\.]", "", raw)
    if clean.startswith("+57"):
        clean = clean[3:]
    elif clean.startswith("57") and len(clean) == 12 and clean.isdigit():
        clean = clean[2:]
    if re.fullmatch(r"3\d{9}", clean):
        return clean  # celular colombiano
    if re.fullmatch(r"\+[1-9]\d{7,14}", re.sub(r"[\s\-\(\)\.]", "", raw)):
        return re.sub(r"[\s\-\(\)\.]", "", raw)  # internacional (E.164)
    raise ValueError(
        "El teléfono debe ser un celular colombiano de 10 dígitos que empiece por 3 (ej. 3001234567) "
        "o un número internacional con el prefijo + (ej. +14155550123)."
    )


def validate_birth_date(value: date, today: date = None) -> date:
    today = today or date.today()
    if value >= today:
        raise ValueError("La fecha de nacimiento debe ser anterior a hoy.")
    age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
    if age > MAX_AGE_YEARS:
        raise ValueError("Por favor verifica la fecha de nacimiento ingresada.")
    return value
