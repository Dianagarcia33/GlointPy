"""Regresión de las ventanas de Fechas del Sistema (H-133, H-193): cada tipo de evento abre su ventana."""
import asyncio
from datetime import datetime
from types import SimpleNamespace as NS
from zoneinfo import ZoneInfo

import pytest

from src.services.system_event_service import (
    SHARES_SALE_EVENT_TYPES,
    WITHDRAWAL_EVENT_TYPES,
    SystemEventService,
    normalize_event_type,
)

TZ = ZoneInfo("America/Bogota")
NOW = datetime(2026, 9, 25, 17, 0, tzinfo=TZ)


def make_event(event_type, start=None, end=None, active=True):
    return NS(
        type=event_type, is_active=active, is_recurring=False,
        recurrence_start_day=None, recurrence_end_day=None,
        start_date=start or datetime(2026, 9, 25, 16, 10),
        end_date=end or datetime(2026, 9, 25, 23, 11),
    )


class FakeDb:
    """Base mínima: execute() devuelve los eventos activos que se le dieron."""
    def __init__(self, events):
        self.events = events

    async def execute(self, _query):
        events = [e for e in self.events if e.is_active]
        return NS(scalars=lambda: NS(all=lambda: events))


class FrozenDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return NOW


def is_active(db, types, monkeypatch):
    import src.services.system_event_service as module
    monkeypatch.setattr(module, "datetime", FrozenDatetime)  # "ahora" = 25/09/2026 17:00 (Bogotá)
    return asyncio.run(SystemEventService.is_any_event_active(db, types))


@pytest.mark.parametrize("stored", ["mercado_acciones", "Mercado Acciones", "MERCADO-ACCIONES", "venta_acciones", "Mercado de Acciones"])
def test_evento_mercado_abre_la_ventana_de_venta(stored, monkeypatch):
    assert is_active(FakeDb([make_event(stored)]), SHARES_SALE_EVENT_TYPES, monkeypatch)


@pytest.mark.parametrize("stored", ["retiro", "Retiros", "fechas_retiro", "withdrawal"])
def test_evento_retiro_abre_la_ventana_de_retiros(stored, monkeypatch):
    assert is_active(FakeDb([make_event(stored)]), WITHDRAWAL_EVENT_TYPES, monkeypatch)


def test_un_tipo_no_abre_la_ventana_del_otro(monkeypatch):
    assert not is_active(FakeDb([make_event("retiro")]), SHARES_SALE_EVENT_TYPES, monkeypatch)
    assert not is_active(FakeDb([make_event("mercado_acciones")]), WITHDRAWAL_EVENT_TYPES, monkeypatch)


def test_evento_inactivo_o_fuera_de_rango_no_abre(monkeypatch):
    assert not is_active(FakeDb([make_event("mercado_acciones", active=False)]), SHARES_SALE_EVENT_TYPES, monkeypatch)
    fuera = make_event("mercado_acciones", start=datetime(2026, 9, 24, 8, 0), end=datetime(2026, 9, 24, 9, 0))
    assert not is_active(FakeDb([fuera]), SHARES_SALE_EVENT_TYPES, monkeypatch)


def test_normalizacion_de_tipos():
    assert normalize_event_type("Mercado Acciónes ") == "mercado_acciones"
    assert normalize_event_type("fechas-retiro") == "fechas_retiro"
