"""H-107: la biometría del registro la decide el servidor; lo que declara el cliente se ignora. Sin llamadas reales a AWS."""
import asyncio
import os
import uuid

import pytest

from src.services import biometric_verification as bv


def run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


@pytest.fixture
def uploads(tmp_path, monkeypatch):
    d = tmp_path / "uploads" / "comprobantes"
    d.mkdir(parents=True)
    monkeypatch.setattr(bv, "KYC_UPLOAD_DIR", str(d))

    def make(ext=".jpg"):
        name = str(uuid.uuid4()) + ext
        (d / name).write_bytes(b"\xff\xd8img")
        return "/uploads/comprobantes/" + name

    return make


class FakeOcr:
    def __init__(self, result=None, exc=None):
        self.result, self.exc, self.calls = result, exc, 0

    def compare_faces(self, a, b, threshold=80.0):
        self.calls += 1
        if self.exc:
            raise self.exc
        return self.result


def patch_ocr(monkeypatch, fake):
    import src.services.ocr_service as mod
    monkeypatch.setattr(mod, "ocr_service", fake, raising=False)


def test_caso_feliz(uploads, monkeypatch):
    fake = FakeOcr({"matched": True, "similarity": 93.4, "message": "ok"})
    patch_ocr(monkeypatch, fake)
    r = run(bv.verify_registration_biometrics([uploads(), uploads(), uploads()], False, 1))
    assert r["verified"] is True and r["similarity"] == 93.4
    assert r["requires_manual_review"] is False and r["attempts"] == 1 and fake.calls == 1


def test_cliente_miente_servidor_calcula_no_coincide(uploads, monkeypatch):
    patch_ocr(monkeypatch, FakeOcr({"matched": False, "similarity": 12.0, "message": "no"}))
    # el cliente declaraba verificado con 99%; esos campos ni siquiera entran a la función
    r = run(bv.verify_registration_biometrics([uploads(), uploads(), uploads()], False, 0))
    assert r["verified"] is False and r["requires_manual_review"] is True
    assert r["reason"] == "server_no_match" and r["similarity"] == 12.0


def test_aws_caido_no_falla_y_no_verifica(uploads, monkeypatch):
    patch_ocr(monkeypatch, FakeOcr(exc=RuntimeError("AWS caído")))
    r = run(bv.verify_registration_biometrics([uploads(), uploads(), uploads()], False, 0))
    assert r["verified"] is False and r["requires_manual_review"] is True and r["reason"] == "service_error"


def test_aws_no_configurado_no_verifica(uploads, monkeypatch):
    patch_ocr(monkeypatch, FakeOcr({"matched": False, "similarity": 0.0, "message": "no configurado"}))
    r = run(bv.verify_registration_biometrics([uploads(), uploads(), uploads()], False, 0))
    assert r["verified"] is False and r["requires_manual_review"] is True


@pytest.mark.parametrize("bad", [
    "/uploads/comprobantes/../../etc/passwd",
    "/uploads/comprobantes/../secret.jpg",
    "../../etc/passwd",
    "/etc/passwd",
    "/uploads/comprobantes/" + "a" * 36 + ".jpg",       # no es un uuid válido
    "/uploads/comprobantes/" + str(uuid.uuid4()) + ".jpg",  # no existe
    "/uploads/comprobantes/" + str(uuid.uuid4()) + ".pdf",
    None, 123, {"a": 1},
])
def test_rutas_invalidas_o_traversal(uploads, monkeypatch, bad):
    fake = FakeOcr({"matched": True, "similarity": 99.0, "message": "ok"})
    patch_ocr(monkeypatch, fake)
    r = run(bv.verify_registration_biometrics([bad, uploads(), uploads()], False, 0))
    assert r["verified"] is False and r["reason"] == "kyc_docs_invalid" and fake.calls == 0
    r = run(bv.verify_registration_biometrics([uploads(), uploads(), bad], False, 0))
    assert r["verified"] is False and fake.calls == 0


@pytest.mark.parametrize("docs", [None, [], ["x"], "texto", {"front": "x"}])
def test_kyc_docs_malformado(docs):
    assert run(bv.verify_registration_biometrics(docs, False, 0))["verified"] is False


def test_symlink_no_se_sigue(uploads, tmp_path, monkeypatch):
    fake = FakeOcr({"matched": True, "similarity": 99.0, "message": "ok"})
    patch_ocr(monkeypatch, fake)
    ruta = uploads()
    outside = tmp_path / "fuera.jpg"
    outside.write_bytes(b"x")
    link_name = str(uuid.uuid4()) + ".jpg"
    os.symlink(str(outside), os.path.join(bv.KYC_UPLOAD_DIR, link_name))
    r = run(bv.verify_registration_biometrics([ruta, ruta, "/uploads/comprobantes/" + link_name], False, 0))
    assert r["verified"] is False and fake.calls == 0


def test_revision_manual_declarada_no_llama_a_aws(uploads, monkeypatch):
    fake = FakeOcr({"matched": True, "similarity": 99.0, "message": "ok"})
    patch_ocr(monkeypatch, fake)
    r = run(bv.verify_registration_biometrics([uploads(), uploads(), uploads()], True, 3))
    assert r["verified"] is False and r["requires_manual_review"] is True and fake.calls == 0 and r["attempts"] == 3


def test_intentos_se_acotan():
    assert run(bv.verify_registration_biometrics(None, False, 9999))["attempts"] == 3
    assert run(bv.verify_registration_biometrics(None, False, "x"))["attempts"] == 0
