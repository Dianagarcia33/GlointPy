"""H-238: el precio de una oferta de acciones es SIEMPRE el precio oficial vigente (lo fija el
administrador). Cualquier precio enviado por el cliente se ignora."""
import asyncio
from decimal import Decimal

import pytest

from src.schemas.share_market import ShareListingCreate
from src.services.share_market_service import ShareMarketService
from src.services import share_market_service as svc


@pytest.mark.parametrize("price", [None, 0, -1, 0.01, 5000, 1e30, "abc", float("nan")])
def test_schema_acepta_cualquier_precio_y_no_falla(price):
    # Compatibilidad: clientes viejos siguen enviando el campo; no debe dar 422 ni 500.
    ShareListingCreate(shares_quantity=1, price_per_share=price)


def test_schema_sin_precio_es_valido():
    assert ShareListingCreate(shares_quantity=3).price_per_share is None


class FakeDB:
    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        for o in self.added:
            o.id = 7

    async def commit(self):
        pass

    async def refresh(self, _o):
        pass


def _run_create(monkeypatch, official, sent_price):
    async def window(*_a, **_k):
        return True

    async def portfolio(*_a, **_k):
        return {"shares_available_for_sale": 100}

    async def official_price(_db):
        return official

    async def movement(*_a, **_k):
        return None

    monkeypatch.setattr(svc.SystemEventService, "is_any_event_active", window)
    monkeypatch.setattr(ShareMarketService, "get_user_portfolio", portfolio)
    monkeypatch.setattr(ShareMarketService, "get_current_price", official_price)
    monkeypatch.setattr(ShareMarketService, "record_share_movement", movement)
    db = FakeDB()
    listing = asyncio.run(
        ShareMarketService.create_listing(db, 1, 10, sent_price)
    )
    return listing


@pytest.mark.parametrize("sent", [None, 1, 0.01, 5000, 1e30])
def test_oferta_usa_precio_oficial_sin_importar_el_enviado(monkeypatch, sent):
    listing = _run_create(monkeypatch, 1931.0, sent)
    assert listing.price_per_share == Decimal("1931.0")
    assert listing.shares_total == 10


def test_sin_precio_oficial_valido_se_rechaza(monkeypatch):
    from fastapi import HTTPException
    with pytest.raises(HTTPException):
        _run_create(monkeypatch, 0.0, 5000)
