"""
Validación común de comprobantes de pago (H-190).

Se comprueban tres cosas antes de guardar un archivo: la extensión permitida (imagen PNG/JPG/WEBP o PDF),
el tamaño máximo (10 MB) y que el contenido real corresponda a esa extensión (firma del archivo), para que
un .csv, un .html o un ejecutable renombrado a .png no se acepte como comprobante.
"""
import os
from typing import Optional

from fastapi import HTTPException, status

RECEIPT_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".pdf")
MAX_RECEIPT_BYTES = 10 * 1024 * 1024
RECEIPT_FORMATS_MESSAGE = "Formato de comprobante no válido. Use una imagen (JPG, PNG, WEBP) o un PDF."


def _matches_signature(ext: str, head: bytes) -> bool:
    if ext in (".jpg", ".jpeg"):
        return head.startswith(b"\xff\xd8\xff")
    if ext == ".png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == ".webp":
        return head[:4] == b"RIFF" and head[8:12] == b"WEBP"
    if ext == ".pdf":
        return b"%PDF-" in head[:1024]
    return False


def validate_receipt_upload(filename: Optional[str], content: bytes) -> str:
    """Devuelve la extensión validada (en minúsculas) o responde 400 con un mensaje claro."""
    name = filename or ""
    ext = os.path.splitext(name)[1].lower()
    if ext not in RECEIPT_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'El archivo "{name or "sin nombre"}" no es un tipo permitido. {RECEIPT_FORMATS_MESSAGE}',
        )
    if len(content) > MAX_RECEIPT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'El archivo "{name}" supera el tamaño máximo permitido de 10 MB.',
        )
    if not _matches_signature(ext, content[:16] if ext != ".pdf" else content[:1024]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'El contenido de "{name}" no corresponde a un archivo {ext[1:].upper()} válido.',
        )
    return ext
