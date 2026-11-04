"""H-107: el servidor decide por sí mismo el resultado biométrico del registro de inversionista.

El cliente (asistente de registro) ya compara cédula vs. selfie, pero lo que declara
(`biometric_verified`, `biometric_similarity`) no es de fiar. Aquí se repite la comparación
sobre los archivos KYC ya subidos (`/auth/public/upload-file`), validando antes las rutas
que manda el cliente para que no se pueda leer nada fuera de esa carpeta.
"""
import asyncio
import logging
import os
import re
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

KYC_UPLOAD_DIR = os.path.join("uploads", "comprobantes")
_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")
# upload-file guarda siempre "/uploads/comprobantes/<uuid4><ext>"
_KYC_PATH_RE = re.compile(r"^/uploads/comprobantes/([0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})(\.[A-Za-z]+)$")


def resolve_kyc_file(path: Any) -> Optional[str]:
    """Devuelve la ruta local de un archivo KYC subido por el flujo oficial, o None si no es válida."""
    if not isinstance(path, str):
        return None
    m = _KYC_PATH_RE.match(path)
    if not m or m.group(2).lower() not in _IMAGE_EXTS:
        return None
    base = os.path.realpath(KYC_UPLOAD_DIR)
    full = os.path.join(base, m.group(1) + m.group(2))
    if os.path.islink(full) or not os.path.isfile(full):
        return None
    if os.path.dirname(os.path.realpath(full)) != base:
        return None
    return full


def _read(path: str) -> bytes:
    with open(path, "rb") as f:
        return f.read()


def _result(verified: bool, similarity: Optional[float], attempts: Any, reason: str, message: str) -> Dict[str, Any]:
    try:
        attempts = max(0, min(int(attempts or 0), 3))
    except (TypeError, ValueError):
        attempts = 0
    return {
        "verified": verified,
        "similarity": similarity,
        "attempts": attempts,
        "requires_manual_review": not verified,
        "source": "server",
        "reason": reason,
        "message": message,
    }


async def verify_registration_biometrics(kyc_docs: Any, client_requires_manual_review: bool = False,
                                         client_attempts: Any = 0) -> Dict[str, Any]:
    """Recalcula en el servidor la coincidencia cédula (frente) vs. selfie. Nunca lanza excepciones."""
    attempts = client_attempts
    if client_requires_manual_review:
        # El cliente ya agotó los intentos: va a revisión manual, no se gasta otra llamada a Rekognition.
        return _result(False, None, attempts, "client_manual_review", "El solicitante agotó los intentos; pasa a revisión manual.")

    if not isinstance(kyc_docs, (list, tuple)) or len(kyc_docs) < 3:
        return _result(False, None, attempts, "kyc_docs_invalid", "No se recibieron los documentos KYC esperados (frente, reverso y selfie).")
    front = resolve_kyc_file(kyc_docs[0])
    selfie = resolve_kyc_file(kyc_docs[2])
    if not front or not selfie:
        logger.warning("H-107: rutas KYC inválidas o inexistentes en el registro")
        return _result(False, None, attempts, "kyc_docs_invalid", "Las rutas de los documentos KYC no son válidas o no existen en el servidor.")

    try:
        from src.services.ocr_service import ocr_service
        doc_bytes = await asyncio.to_thread(_read, front)
        selfie_bytes = await asyncio.to_thread(_read, selfie)
        res = await asyncio.to_thread(ocr_service.compare_faces, doc_bytes, selfie_bytes)
    except Exception as e:
        logger.error("H-107: no se pudo verificar la biometría en el servidor: %s", e)
        return _result(False, None, attempts, "service_error", "Servicio biométrico no disponible; requiere revisión manual.")

    if res.get("matched") is True:
        return _result(True, res.get("similarity"), attempts, "server_match", res.get("message") or "")
    sim = res.get("similarity")
    return _result(False, sim if sim else None, attempts, "server_no_match", res.get("message") or "")
