"""H-91: la distribución de beneficiarios debe sumar exactamente 100 % (422 con mensaje en español)."""
import asyncio
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from src.schemas.beneficiary import BeneficiaryCreate, BeneficiaryDistributionItem, BeneficiaryUpdate
from src.services import beneficiary_service as mod
from src.services.beneficiary_service import BeneficiaryService, validar_distribucion_completa


def test_suma_exacta_100_pasa():
    validar_distribucion_completa([60, 40])
    validar_distribucion_completa([33.33, 33.33, 33.34])
    validar_distribucion_completa(["100.00"])


@pytest.mark.parametrize("valores", [[70], [60, 30], [60, 41], [], [99.99]])
def test_suma_distinta_de_100_da_422(valores):
    with pytest.raises(HTTPException) as e:
        validar_distribucion_completa(valores)
    assert e.value.status_code == 422
    assert "100 %" in e.value.detail


def _db():
    db = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _existentes(monkeypatch, pcts):
    benefs = [NS(id=i + 1, user_id=7, percentage=p) for i, p in enumerate(pcts)]
    monkeypatch.setattr(BeneficiaryService, "get_all_by_user", AsyncMock(return_value=benefs))
    return benefs


def test_crear_con_70_se_bloquea(monkeypatch):
    _existentes(monkeypatch, [])
    db = _db()
    with pytest.raises(HTTPException) as e:
        asyncio.run(BeneficiaryService.create(db, 7, BeneficiaryCreate(name="Ana", percentage=70)))
    assert e.value.status_code == 422
    db.add.assert_not_called()


def test_crear_completando_100_se_guarda(monkeypatch):
    _existentes(monkeypatch, [70])
    db = _db()
    asyncio.run(BeneficiaryService.create(db, 7, BeneficiaryCreate(name="Ana", percentage=30)))
    db.add.assert_called_once()


def test_editar_a_70_se_bloquea(monkeypatch):
    benefs = _existentes(monkeypatch, [100])
    monkeypatch.setattr(BeneficiaryService, "get_by_id", AsyncMock(return_value=benefs[0]))
    with pytest.raises(HTTPException) as e:
        asyncio.run(BeneficiaryService.update(_db(), 1, 7, BeneficiaryUpdate(percentage=70)))
    assert e.value.status_code == 422


def test_editar_sin_tocar_porcentaje_no_valida_total(monkeypatch):
    benefs = _existentes(monkeypatch, [70])  # dato histórico incompleto
    monkeypatch.setattr(BeneficiaryService, "get_by_id", AsyncMock(return_value=benefs[0]))
    asyncio.run(BeneficiaryService.update(_db(), 1, 7, BeneficiaryUpdate(phone="300")))
    assert benefs[0].phone == "300"


def test_guardado_atomico_reparte_100(monkeypatch):
    benefs = _existentes(monkeypatch, [100])
    db = _db()
    items = [BeneficiaryDistributionItem(id=1, percentage=60), BeneficiaryDistributionItem(name="Luis", percentage=40)]
    asyncio.run(BeneficiaryService.save_distribution(db, 7, items))
    assert benefs[0].percentage == 60
    db.add.assert_called_once()
    db.commit.assert_awaited_once()


def test_guardado_atomico_incompleto_no_modifica_nada(monkeypatch):
    benefs = _existentes(monkeypatch, [100])
    db = _db()
    items = [BeneficiaryDistributionItem(id=1, percentage=60), BeneficiaryDistributionItem(name="Luis", percentage=30)]
    with pytest.raises(HTTPException) as e:
        asyncio.run(BeneficiaryService.save_distribution(db, 7, items))
    assert e.value.status_code == 422
    assert benefs[0].percentage == 100
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


def test_guardado_atomico_id_ajeno_404(monkeypatch):
    _existentes(monkeypatch, [100])
    with pytest.raises(HTTPException) as e:
        asyncio.run(BeneficiaryService.save_distribution(_db(), 7, [BeneficiaryDistributionItem(id=99, percentage=100)]))
    assert e.value.status_code == 404
