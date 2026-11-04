"""H-114: los tramos de capital no se solapan, el orden se deriva del capital mínimo y los huecos solo avisan."""
import asyncio
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from src.services.investment_rank_service import InvestmentRankService as S


def rk(id, name, mn, mx, order, active=True):
    return NS(id=id, name=name, slug=name.lower(), min_investment=mn, max_investment=mx, order=order,
              is_active=active, bonus_percentage=0, color="#fff", icon="t", priority_withdrawal=False, benefits=[],
              updated_at=None)


class FakeResult:
    def __init__(self, items):
        self._items = items

    def scalars(self):
        return self

    def all(self):
        return list(self._items)

    def first(self):
        return self._items[0] if self._items else None


class FakeDB:
    """Los SELECT con is_active devuelven los rangos activos; el resto (nombre/slug) no encuentra nada."""
    def __init__(self, ranks):
        self.ranks = ranks
        self.commit = AsyncMock()
        self.refresh = AsyncMock()

    async def execute(self, stmt):
        if "is_active" in str(stmt).split("WHERE")[-1]:
            excl = {v for k, v in stmt.compile().params.items() if k.startswith("id_")}
            return FakeResult([r for r in self.ranks if r.is_active and r.id not in excl])
        return FakeResult([])

    async def flush(self):
        pass

    def add(self, obj):
        obj.id = max(r.id for r in self.ranks) + 1
        self.ranks.append(obj)


def _por_id(monkeypatch, ranks):
    async def get(db, rank_id):
        return next(r for r in ranks if r.id == rank_id)
    monkeypatch.setattr(S, "get_rank_by_id", get)


def base():
    return [
        rk(1, "Bronce", 0, 4_999_999, 1), rk(2, "Plata", 5_000_000, 19_999_999, 2),
        rk(3, "Oro", 20_000_000, 49_999_999, 3), rk(4, "Platino", 50_000_000, 99_999_999, 4),
        rk(5, "Diamante Black", 100_000_000, None, 5),
    ]


def test_cinco_rangos_actuales_no_cambian_ni_tienen_huecos():
    ranks = base()
    assert S.derive_order(ranks) == {1: 1, 2: 2, 3: 3, 4: 4, 5: 5}
    assert S.detect_gaps(ranks) == []


def test_rango_identico_a_bronce_se_rechaza():
    db = FakeDB(base())
    with pytest.raises(HTTPException) as e:
        asyncio.run(S.create_rank(db, {"name": "Copia", "min_investment": 0, "max_investment": 4_999_999}))
    assert e.value.status_code == 400 and "solapa" in e.value.detail


def test_solape_parcial_al_editar_se_rechaza(monkeypatch):
    ranks = base()
    _por_id(monkeypatch, ranks)
    db = FakeDB(ranks)
    with pytest.raises(HTTPException):
        asyncio.run(S.update_rank(db, 4, {"min_investment": 40_000_000}))


def test_orden_manual_incoherente_se_ignora_y_se_deriva():
    ranks = base()
    db = FakeDB(ranks)
    # QA Zafiro: 100 M exactos chocan con Diamante; uso un tramo libre entre Plata y Oro tras ajustar Oro
    ranks[2].min_investment = 30_000_000  # (dato de prueba) deja libre 20M-29.999.999
    nuevo = asyncio.run(S.create_rank(db, {"name": "Zafiro", "min_investment": 20_000_000,
                                           "max_investment": 29_999_999, "order": 99}))
    assert nuevo.order == 3          # no 99: se deriva del capital
    assert {r.name: r.order for r in ranks}["Oro"] == 4
    assert {r.name: r.order for r in ranks}["Diamante Black"] == 6


def test_orden_se_rederiva_al_editar_capital(monkeypatch):
    ranks = base()
    _por_id(monkeypatch, ranks)
    db = FakeDB(ranks)
    asyncio.run(S.update_rank(db, 1, {"min_investment": 0, "order": 50}))
    assert ranks[0].order == 1


def test_hueco_entre_tramos_genera_aviso_sin_bloquear(monkeypatch):
    ranks = base()
    _por_id(monkeypatch, ranks)
    ranks[3].min_investment = 60_000_000  # Oro termina en 49.999.999 y Platino empieza en 60 M
    avisos = S.detect_gaps(ranks)
    assert len(avisos) == 1 and "Oro" in avisos[0] and "Platino" in avisos[0]
    db = FakeDB(ranks)
    asyncio.run(S.update_rank(db, 4, {"min_investment": 60_000_000}))  # no lanza


def test_lectura_devuelve_orden_derivado_aunque_el_almacenado_sea_incoherente():
    ranks = base()
    ranks[0].order = 9  # almacenado incoherente
    assert S.derive_order(ranks)[1] == 1
