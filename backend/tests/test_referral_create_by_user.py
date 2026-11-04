import asyncio
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from src.schemas.potential_referral import PotentialReferralCreate
from src.services.potential_referral_service import PotentialReferralService


def _result(all_=None, first=None):
    r = MagicMock()
    r.scalars.return_value.all.return_value = all_ or []
    r.scalars.return_value.first.return_value = first
    return r


def _data(code=None):
    return PotentialReferralCreate(nombre="Ref", telefono="3001234567", codigo_referido=code)


def test_usuario_sin_contrato_no_registra_referidos_a_nombre_de_otro():
    # H-228: antes caía en "el primer inversionista de la base"
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[_result([]), _result(first=NS(id=1, document_id=None))])
    db.add = MagicMock()
    db.commit = AsyncMock()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(PotentialReferralService.create_by_user(db, 1, _data()))
    assert exc.value.status_code == 400
    db.add.assert_not_called()


def test_con_contrato_el_referido_queda_en_el_contrato_y_con_su_codigo():
    inv = NS(id=7, assigned_code="IG013")
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[_result([inv])])
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    ref = asyncio.run(PotentialReferralService.create_by_user(db, 5, _data(code="IG999")))
    assert ref.investor_id == 7 and ref.codigo_referido == "IG013"
    ref2 = asyncio.run(PotentialReferralService.create_by_user(
        MagicMock(execute=AsyncMock(side_effect=[_result([inv])]), add=MagicMock(), commit=AsyncMock(), refresh=AsyncMock()), 5, _data(code="IG013")))
    assert ref2.codigo_referido == "IG013"
