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


# --- H-135: opción explícita «último día del mes» (valor 0) ---------------------------------------
@pytest.mark.parametrize("y,m,d,esperado", [
    (2027, 2, 28, True), (2027, 2, 27, False), (2028, 2, 29, True),
    (2026, 11, 30, True), (2026, 12, 31, True), (2026, 12, 30, False),
])
def test_ventana_ultimo_dia_del_mes(y, m, d, esperado):
    assert activo(recurrente(0, 0), y, m, d) is esperado


def test_ventana_del_15_al_ultimo_dia():
    assert activo(recurrente(15, 0), 2027, 2, 14) is False
    assert activo(recurrente(15, 0), 2027, 2, 15) is True
    assert activo(recurrente(15, 0), 2027, 2, 28) is True
    assert activo(recurrente(15, 0), 2026, 12, 31) is True


def test_ventanas_existentes_no_cambian():
    assert activo(recurrente(15, 15), 2026, 10, 15) is True
    assert activo(recurrente(15, 15), 2026, 10, 16) is False
    assert activo(recurrente(1, 31), 2027, 2, 10) is True
    assert activo(recurrente(25, 5), 2026, 10, 3) is True   # ventana que cruza de mes


def test_validacion_acepta_cero_y_rechaza_vacio():
    from fastapi import HTTPException
    from src.services.system_event_service import validate_event_data
    ok = validate_event_data({"type": "retiro", "is_recurring": True, "recurrence_start_day": 0, "recurrence_end_day": 0})
    assert ok["recurrence_start_day"] == 0
    with pytest.raises(HTTPException):
        validate_event_data({"type": "retiro", "is_recurring": True, "recurrence_start_day": None, "recurrence_end_day": 5})


def test_schema_acepta_cero_pero_no_32():
    from pydantic import ValidationError
    from src.schemas.system_event import SystemEventCreate
    assert SystemEventCreate(type="retiro", is_recurring=True, recurrence_start_day=0, recurrence_end_day=0)
    with pytest.raises(ValidationError):
        SystemEventCreate(type="retiro", is_recurring=True, recurrence_start_day=32, recurrence_end_day=1)
