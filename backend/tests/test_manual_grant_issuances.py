"""H-204: las asignaciones manuales de acciones descuentan del fondo de emisiones."""
import asyncio
from types import SimpleNamespace

from src.services import share_market_service as sms
from src.services.share_market_service import ShareMarketService


class FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)


class FakeDB:
    def __init__(self, issuances):
        self.issuances = issuances
        self.added = []

    async def execute(self, _query):
        return FakeResult(self.issuances)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        pass


def make_issuance(id_, total, available):
    return SimpleNamespace(id=id_, total_shares_issued=total, available_shares=available)


def run(db, qty, monkeypatch):
    async def price(_db):
        return 50000.0

    async def available(_db):
        return sum(i.available_shares for i in db.issuances)

    monkeypatch.setattr(ShareMarketService, "get_current_price", staticmethod(price))
    monkeypatch.setattr(ShareMarketService, "get_current_available_shares", staticmethod(available))
    asyncio.run(ShareMarketService._apply_manual_grant_to_issuances(db, qty, 1, 975, "Bonificacion", 1893))


def test_grant_descuenta_de_la_emision_mas_antigua(monkeypatch):
    db = FakeDB([make_issuance(1, 5000, 5000), make_issuance(2, 62500, 62500)])
    run(db, 20, monkeypatch)
    assert [i.available_shares for i in db.issuances] == [4980, 62500]
    history = db.added[-1]
    assert history.previous_available_shares == 67500 and history.new_available_shares == 67480


def test_grant_sin_cupo_crea_emision_de_ajuste(monkeypatch):
    db = FakeDB([make_issuance(1, 10, 5)])
    run(db, 8, monkeypatch)
    assert db.issuances[0].available_shares == 0
    adjustment = db.added[0]
    assert adjustment.total_shares_issued == 3 and adjustment.available_shares == 0


def test_deduccion_repone_la_emision_con_cupo(monkeypatch):
    db = FakeDB([make_issuance(1, 100, 90)])
    run(db, -4, monkeypatch)
    assert db.issuances[0].available_shares == 94
