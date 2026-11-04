"""H-135: una ventana recurrente de día 30/31 abre el último día de meses más cortos."""
from datetime import datetime
from types import SimpleNamespace as NS
from zoneinfo import ZoneInfo

import pytest

from src.services.system_event_service import SystemEventService

TZ = ZoneInfo("America/Bogota")


def recurrente(inicio, fin):
    return NS(is_active=True, is_recurring=True, recurrence_start_day=inicio, recurrence_end_day=fin,
              start_date=None, end_date=None)


def activo(ev, y, m, d):
    return SystemEventService.is_event_instance_active(ev, datetime(y, m, d, 12, 0, tzinfo=TZ))


@pytest.mark.parametrize("y,m,d,esperado", [
    (2027, 2, 28, True),    # febrero 2027 (28 días): el día 30 se toma como el 28
    (2027, 2, 27, False),
    (2028, 2, 29, True),    # bisiesto
    (2026, 11, 30, True),   # noviembre (30 días), "día 30"
    (2026, 10, 30, True),
    (2026, 10, 29, False),
])
def test_ventana_dia_30_abre_el_ultimo_dia_del_mes(y, m, d, esperado):
    assert activo(recurrente(30, 30), y, m, d) is esperado


def test_ventana_dia_31_abre_el_ultimo_dia_en_noviembre():
    assert activo(recurrente(31, 31), 2026, 11, 30) is True
    assert activo(recurrente(31, 31), 2026, 11, 29) is False
