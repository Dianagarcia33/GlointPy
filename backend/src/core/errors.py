"""Mensajes de error seguros para devolver al cliente."""
import logging
import traceback

from fastapi import HTTPException
from pydantic import ValidationError

logger = logging.getLogger("gloint.errors")


def public_error_detail(message: str, exc: Exception) -> str:
    """
    Convierte una excepción inesperada en un mensaje apto para el usuario (H-136).

    Nunca devuelve str(exc) de errores internos: el texto de SQLAlchemy/pymysql incluye la
    sentencia SQL, los parámetros, tablas e índices. El detalle completo queda en el log del
    servidor. Los ValueError se consideran mensajes de negocio pensados para el usuario y se
    devuelven tal cual (salvo los de validación de Pydantic, que son técnicos).
    """
    if isinstance(exc, HTTPException):
        return str(exc.detail)  # ya es un mensaje controlado lanzado por la propia app
    if isinstance(exc, ValueError) and not isinstance(exc, ValidationError):
        return str(exc)
    logger.error("%s: %s\n%s", message, exc, "".join(traceback.format_exception(type(exc), exc, exc.__traceback__)))
    print(f"❌ {message}: {type(exc).__name__}: {exc}")
    return f"{message}. Ocurrió un error interno; intenta de nuevo o contacta a soporte."
