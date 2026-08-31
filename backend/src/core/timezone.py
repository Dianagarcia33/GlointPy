from datetime import datetime, date
from zoneinfo import ZoneInfo

BOGOTA_TZ = ZoneInfo("America/Bogota")

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
