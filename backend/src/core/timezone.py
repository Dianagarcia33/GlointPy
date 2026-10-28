from datetime import datetime, date, timezone, timedelta
from zoneinfo import ZoneInfo

try:
    BOGOTA_TZ = ZoneInfo("America/Bogota")
except Exception:
    BOGOTA_TZ = timezone(timedelta(hours=-5))

def get_colombia_now() -> datetime:
    """
    Retorna la fecha y hora actual en la zona horaria oficial de Colombia (America/Bogota, UTC-5).
    """
    return datetime.now(BOGOTA_TZ)

def get_colombia_today() -> date:
    """
    Retorna la fecha calendario actual (date) en la zona horaria oficial de Colombia (America/Bogota, UTC-5).
    Evita el error de frontera donde UTC avanza al día siguiente a partir de las 19:00 COT.
    """
    return datetime.now(BOGOTA_TZ).date()


# ---------------------------------------------------------------------------------------------
# Marcas de tiempo en hora Colombia hacia el cliente (H-152)
#
# La base de datos guarda las marcas de tiempo en UTC (datetime.utcnow) sin zona. La API las
# entrega en hora Colombia con la zona explícita ('2026-09-24T18:52:36-05:00'), así todas las
# fechas que ve el usuario (y cualquier sistema que consuma la API) están en la misma zona.
# Solo se convierten los campos que son marcas de tiempo; las fechas de negocio (start_date,
# end_date, fecha_ingreso, fecha_solicitud...) son días u horas locales y se dejan como están.
# ---------------------------------------------------------------------------------------------
import re as _re

_TIMESTAMP_KEY = _re.compile(r"(_at|^statement_date|^fecha_aprobacion|^fecha_procesamiento|^timestamp)$")
_ISO_DATETIME = _re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$")


def to_colombia_iso(value: str) -> str:
    """'2026-09-24T23:52:36' (UTC sin zona) -> '2026-09-24T18:52:36-05:00'."""
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(BOGOTA_TZ).isoformat()


def colombia_timestamps(obj):
    """Recorre un JSON (dict/list) y pasa a hora Colombia las marcas de tiempo."""
    if isinstance(obj, list):
        return [colombia_timestamps(item) for item in obj]
    if isinstance(obj, dict):
        out = {}
        for key, val in obj.items():
            if isinstance(val, str):
                if isinstance(key, str) and _TIMESTAMP_KEY.search(key) and _ISO_DATETIME.match(val):
                    val = to_colombia_iso(val)
            elif isinstance(val, (dict, list)):
                val = colombia_timestamps(val)
            out[key] = val
        return out
    return obj
