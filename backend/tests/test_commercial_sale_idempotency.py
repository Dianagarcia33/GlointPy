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
        sale_type=CommercialSaleType.contrato_nuevo, commission_amount=Decimal("35000"),
    )
    db = FakeDB(duplicate=dup)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(css.register_commercial_sale(db, 5, payload()))
    assert exc.value.status_code == 409
    assert "Venta #77" in exc.value.detail
    assert db.added == []


def test_duplicate_check_is_locking_read_serialized_per_advisor():
    db = FakeDB(duplicate=SimpleNamespace(
        id=1, commercial_id=5, commercial=None, sale_type=CommercialSaleType.contrato_nuevo,
        commission_amount=Decimal("35000")))
    with pytest.raises(HTTPException):
        asyncio.run(css.register_commercial_sale(db, 5, payload()))
    locking = [q for q in db.queries if "FOR UPDATE" in q]
    assert any("FROM users" in q for q in locking), "debe bloquear la fila del asesor"
    assert any("FROM commercial_sales" in q for q in locking), "la búsqueda de duplicados debe ser lectura bloqueante"


def _dup(sale_type, commission):
    return SimpleNamespace(id=74, commercial_id=5, commercial=SimpleNamespace(name="Betzy"),
                           sale_type=sale_type, commission_amount=Decimal(commission))


def test_h153_contrato_nuevo_y_referido_no_coexisten():
    """Ya hay un 'referido' ($18.000) y se intenta 'contrato_nuevo' (3 % = $30.000) sobre la misma venta."""
    db = FakeDB(duplicate=_dup(CommercialSaleType.referido, "18000"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(css.register_commercial_sale(db, 5, payload()))
    assert exc.value.status_code == 409
    assert "no pueden coexistir" in exc.value.detail
    assert "anule primero la venta #74" in exc.value.detail  # la nueva tendría mayor valor
    assert db.added == []


def test_h153_referido_nuevo_sobre_contrato_existente_prevalece_el_existente():
    db = FakeDB(duplicate=_dup(CommercialSaleType.contrato_nuevo, "35000"))
    data = CommercialSaleCreate(client_document="1010", sale_type=CommercialSaleType.referido,
                                referrer_code="IG1197", amount=Decimal("1000000"), sale_date=date(2026, 8, 20))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(css.register_commercial_sale(db, 5, data))
    assert exc.value.status_code == 409
    assert "prevalece la comisión de mayor valor, que es la ya registrada" in exc.value.detail
    assert db.added == []


def test_h153_regla_provisional_mayor_valor():
    assert css.prevailing_commission(Decimal("18000"), Decimal("35000")) == "candidate"
    assert css.prevailing_commission(Decimal("35000"), Decimal("18000")) == "existing"
    assert css.prevailing_commission(Decimal("35000"), Decimal("35000")) == "existing"


# ---- H-154: % manual limitado a las tarifas vigentes y con motivo ----
def manual(rate=None, amount=None, reason="Acuerdo comercial aprobado por gerencia"):
    return CommercialSaleCreate(
        client_document="1010", sale_type=CommercialSaleType.contrato_nuevo, amount=Decimal("1000000"),
        sale_date=date(2026, 8, 20), custom_commission_rate=rate, custom_commission_amount=amount,
        custom_rate_reason=reason)


def run_admin(data):
    return asyncio.run(css.register_commercial_sale(FakeDB(), 5, data, is_admin=True))


def test_h154_rango_toma_las_tarifas_vigentes():
    assert css.MIN_MANUAL_RATE == Decimal("0.018") and css.MAX_MANUAL_RATE == Decimal("0.035")


@pytest.mark.parametrize("rate", [Decimal("0.5"), Decimal("0.017"), Decimal("0.036"), Decimal("0")])
def test_h154_rechaza_porcentaje_fuera_de_rango(rate):
    with pytest.raises(HTTPException) as exc:
        run_admin(manual(rate=rate))
    assert exc.value.status_code == 422 and "entre 1.8% y 3.5%" in exc.value.detail


def test_h154_rechaza_monto_manual_cuyo_porcentaje_sale_del_rango():
    with pytest.raises(HTTPException) as exc:
        run_admin(manual(amount=Decimal("500000")))  # 50 %
    assert exc.value.status_code == 422


@pytest.mark.parametrize("rate", [Decimal("0.018"), Decimal("0.025"), Decimal("0.035")])
def test_h154_acepta_porcentaje_dentro_del_rango(rate):
    sale = run_admin(manual(rate=rate))
    assert sale.commission_rate == rate and sale.commission_amount == Decimal("1000000") * rate


def test_h154_exige_motivo_y_no_lo_acepta_vacio():
    with pytest.raises(ValueError):
        manual(rate=Decimal("0.025"), reason="  corto ")
    with pytest.raises(HTTPException) as exc:
        css.validate_manual_commission_rate(Decimal("0.025"), None)
    assert exc.value.status_code == 422 and "motivo" in exc.value.detail


def test_h154_asesor_no_admin_no_puede_fijar_comision():
    with pytest.raises(HTTPException) as exc:
        asyncio.run(css.register_commercial_sale(FakeDB(), 5, manual(rate=Decimal("0.025"))))
    assert exc.value.status_code == 403
