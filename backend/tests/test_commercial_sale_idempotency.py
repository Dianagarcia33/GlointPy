"""H-153: el alta de venta es idempotente frente a doble envío (409 sin segunda comisión)."""
import asyncio
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy.dialects import mysql

from src.models.commercial_sale import CommercialSaleType
from src.schemas.commercial_sale import CommercialSaleCreate
from src.services import commercial_sale_service as css


class FakeResult:
    def __init__(self, row=None):
        self._row = row

    def scalars(self):
        return SimpleNamespace(first=lambda: self._row)

    def scalar(self):
        return None


class FakeDB:
    def __init__(self, duplicate=None):
        self.duplicate = duplicate
        self.queries = []
        self.added = []

    async def execute(self, query):
        sql = str(query.compile(dialect=mysql.dialect()))
        self.queries.append(sql)
        # La consulta de duplicados es la que filtra por commercial_sales.sale_date
        if "commercial_sales.sale_date" in sql:
            return FakeResult(self.duplicate)
        return FakeResult(None)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        pass

    async def refresh(self, _obj):
        pass


def payload():
    return CommercialSaleCreate(
        client_document="1010",
        client_name="Cliente Prueba",
        sale_type=CommercialSaleType.contrato_nuevo,
        amount=Decimal("1000000"),
        sale_date=date(2026, 8, 20),
    )


@pytest.fixture(autouse=True)
def stub_classification(monkeypatch):
    async def fake_check(_db, _doc):
        return {"is_existing_client": False, "client_document": "1010", "client_name": "Cliente Prueba"}

    monkeypatch.setattr(css, "check_client_classification", fake_check)


def test_duplicate_returns_409_and_creates_nothing():
    dup = SimpleNamespace(
        id=77, commercial_id=5, commercial=SimpleNamespace(name="Betzy"),
        sale_type=CommercialSaleType.contrato_nuevo,
    )
    db = FakeDB(duplicate=dup)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(css.register_commercial_sale(db, 5, payload()))
    assert exc.value.status_code == 409
    assert "Venta #77" in exc.value.detail
    assert db.added == []


def test_duplicate_check_is_locking_read_serialized_per_advisor():
    db = FakeDB(duplicate=SimpleNamespace(
        id=1, commercial_id=5, commercial=None, sale_type=CommercialSaleType.referido))
    with pytest.raises(HTTPException):
        asyncio.run(css.register_commercial_sale(db, 5, payload()))
    locking = [q for q in db.queries if "FOR UPDATE" in q]
    assert any("FROM users" in q for q in locking), "debe bloquear la fila del asesor"
    assert any("FROM commercial_sales" in q for q in locking), "la búsqueda de duplicados debe ser lectura bloqueante"
