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
