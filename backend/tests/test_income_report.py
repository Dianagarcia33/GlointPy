"""Informe de Ingresos: permisos propios y clasificación automática (Yoint) vs. manual (administrador)."""
from datetime import date, datetime
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.deps import get_current_user
from src.api.v1.endpoints import income_report
from src.core.database import get_db


def make_user(*perms):
    role = SimpleNamespace(name="rol_prueba", permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=1, is_superuser=False, roles=[role], permissions_override=None)


def make_request(req_id, monto, reviewed_at, extra=None, comprobante="/uploads/comprobantes/a.pdf", reviewer="Ana Admin"):
    return SimpleNamespace(
        id=req_id, monto=monto, reviewed_at=reviewed_at, created_at=reviewed_at, extra_data=extra,
        comprobante_path=comprobante, investor_id=10 + req_id,
        user=SimpleNamespace(name="Carlos Inversor", email="carlos@example.com", document_id="1010"),
        reviewer=SimpleNamespace(name=reviewer) if reviewer else None,
    )


@pytest.fixture
def client(monkeypatch):
    async def fake_db():
        yield None

    async def fake_rows(db, start, end):
        return ROWS

    monkeypatch.setattr(income_report, "_load_rows", fake_rows)
    app = FastAPI()
    app.include_router(income_report.router, prefix="/income-report")
    app.dependency_overrides[get_db] = fake_db
    holder = {}
    app.dependency_overrides[get_current_user] = lambda: holder["user"]
    c = TestClient(app)
    c.as_user = lambda u: holder.__setitem__("user", u)
    return c


MANUAL = make_request(1, 5_000_000, datetime(2026, 11, 10, 15, 0))
AUTO = make_request(
    2, 2_000_000, datetime(2026, 11, 11, 2, 30),  # 10 de noviembre 21:30 en Colombia
    extra={"auto_approved_by": "YOINT_GATEWAY", "yoint_payment_method": "PSE", "yoint_order_id": "ORD-1"},
    comprobante=None, reviewer="Super Admin",
)
UPGRADE = make_request(
    3, 10_000_000, datetime(2026, 11, 11, 16, 0),
    extra={"es_aumento_capital": True, "previous_package_value": 4_000_000, "monto_billetera_usado": 1_000_000},
)
ROWS = [income_report._build_row(r, None) for r in (UPGRADE, AUTO, MANUAL)]


def test_sin_permiso_recibe_403(client):
    client.as_user(make_user("admin:daily_yields:view", "admin:investments:manage"))
    assert client.get("/income-report").status_code == 403
    assert client.get("/income-report/export").status_code == 403


def test_ver_no_permite_exportar(client):
    client.as_user(make_user("admin:income_report:view"))
    assert client.get("/income-report").status_code == 200
    assert client.get("/income-report/export").status_code == 403


def test_clasifica_automatico_y_manual():
    manual, auto = income_report._build_row(MANUAL, None), income_report._build_row(AUTO, None)
    assert manual["source"] == "manual" and manual["approved_by"] == "Ana Admin"
    assert auto["source"] == "automatic" and auto["approved_by"] == "Yoint (automático)"
    assert auto["payment_method"] == "PSE" and auto["reference"] == "ORD-1"
    # La aprobación de las 02:30 UTC cae el día anterior en Colombia
    assert auto["day"] == "2026-11-10"


def test_payin_exitoso_cuenta_como_automatico_aunque_falte_la_marca():
    payin = SimpleNamespace(payment_method="NEQUI", order_id="ORD-9")
    row = income_report._build_row(make_request(4, 1_000_000, datetime(2026, 11, 10, 15, 0), comprobante=None), payin)
    assert row["source"] == "automatic" and row["payment_method"] == "Nequi" and row["reference"] == "ORD-9"


def test_aumento_de_capital_cuenta_solo_la_diferencia():
    row = income_report._build_row(UPGRADE, None)
    assert row["package_amount"] == 10_000_000
    assert row["income_amount"] == 6_000_000
    assert row["wallet_used"] == 1_000_000 and row["external_amount"] == 5_000_000


def test_resumen_serie_diaria_y_filtros(client):
    client.as_user(make_user("admin:income_report:view", "admin:income_report:export"))
    body = client.get("/income-report", params={"start_date": "2026-11-10", "end_date": "2026-11-12"}).json()
    assert body["summary"]["total"] == {"count": 3, "amount": 13_000_000, "wallet_used": 1_000_000, "external_amount": 12_000_000}
    assert body["summary"]["automatic"]["amount"] == 2_000_000
    assert body["summary"]["manual"]["amount"] == 11_000_000
    assert [(d["date"], d["automatic_amount"], d["manual_amount"]) for d in body["by_day"]] == [
        ("2026-11-10", 2_000_000, 5_000_000), ("2026-11-11", 0, 6_000_000), ("2026-11-12", 0, 0),
    ]

    only_auto = client.get("/income-report", params={"start_date": "2026-11-10", "end_date": "2026-11-12", "source": "automatic"}).json()
    assert [i["id"] for i in only_auto["items"]] == [2]
    assert only_auto["summary"]["total"]["count"] == 3  # el resumen no cambia con el filtro del detalle

    csv_res = client.get("/income-report/export", params={"start_date": "2026-11-10", "end_date": "2026-11-12", "source": "manual"})
    assert csv_res.status_code == 200
    lines = csv_res.text.strip().splitlines()
    assert len(lines) == 3 and "Manual (administrador)" in lines[1]


def test_rango_invalido(client):
    client.as_user(make_user("admin:income_report:view"))
    assert client.get("/income-report", params={"start_date": "2026-11-12", "end_date": "2026-11-10"}).status_code == 400


def test_limites_utc_del_dia_colombia():
    lo, hi = income_report._utc_bounds(date(2026, 11, 10), date(2026, 11, 10))
    assert lo == datetime(2026, 11, 10, 5, 0) and hi == datetime(2026, 11, 11, 5, 0)
