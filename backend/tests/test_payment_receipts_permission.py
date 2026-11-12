"""Los comprobantes de pago ajenos se abren con el permiso admin:payment_receipts:view (caso: contabilidad)."""
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from src.api.v1.endpoints import uploads
from src.core.database import get_db


class EmptyResult:
    def scalars(self):
        return self

    def first(self):
        return None


class FakeDb:
    """Ningún comprobante pertenece al usuario: solo el permiso o el rol pueden abrirlo."""
    async def execute(self, *_args, **_kwargs):
        return EmptyResult()


def make_user(role_name, *perms):
    role = SimpleNamespace(name=role_name, permissions=[SimpleNamespace(name=p) for p in perms])
    return SimpleNamespace(id=7, is_superuser=False, roles=[role], permissions_override=None, document_path="")


@pytest.fixture
def client(tmp_path, monkeypatch):
    for category in ("comprobantes", "receipts", "kyc"):
        (tmp_path / category).mkdir()
        (tmp_path / category / "archivo.pdf").write_bytes(b"%PDF-1.4 prueba")
    monkeypatch.setattr(uploads, "UPLOAD_ROOT", str(tmp_path))

    holder = {}

    async def fake_current_user(request, db=None, token=None):
        return holder["user"]

    async def fake_db():
        yield FakeDb()

    monkeypatch.setattr(uploads, "get_current_user", fake_current_user)
    app = FastAPI()
    app.include_router(uploads.router, prefix="/uploads")
    app.dependency_overrides[get_db] = fake_db
    app.dependency_overrides[uploads.get_db] = fake_db
    c = TestClient(app)
    c.as_user = lambda u: holder.__setitem__("user", u)
    return c


def test_contabilidad_sin_el_permiso_no_abre_comprobantes_ajenos(client):
    client.as_user(make_user("contabilidad", "admin:payments:manage", "admin:withdrawals:manage"))
    assert client.get("/uploads/comprobantes/archivo.pdf").status_code == 403


@pytest.mark.parametrize("category", ["comprobantes", "receipts"])
def test_contabilidad_con_el_permiso_abre_comprobantes_y_recibos(client, category):
    client.as_user(make_user("contabilidad", "admin:payment_receipts:view"))
    res = client.get(f"/uploads/{category}/archivo.pdf")
    assert res.status_code == 200 and res.content.startswith(b"%PDF")


def test_el_permiso_no_abre_documentos_de_identidad(client):
    client.as_user(make_user("contabilidad", "admin:payment_receipts:view"))
    assert client.get("/uploads/kyc/archivo.pdf").status_code == 403


def test_inversionista_sigue_sin_ver_comprobantes_ajenos(client):
    client.as_user(make_user("inversionista", "wallets:view"))
    assert client.get("/uploads/comprobantes/archivo.pdf").status_code == 403
