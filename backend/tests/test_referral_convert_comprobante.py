import asyncio
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from src.services.potential_referral_service import PotentialReferralService
from src.schemas.potential_referral import PotentialReferralConvertRequest


def _payload(**over):
    base = dict(name="X", email="nuevo@example.com", tipo_documento="CC", documento="1", numero_celular="3001234567",
                ciudad="Bogotá", banco="B", tipo_cuenta="Ahorros", numero_cuenta="1", contract_period_id=1, monto=100)
    base.update(over)
    return PotentialReferralConvertRequest(**base)


def _db():
    """Sesión simulada: el referido existe y el correo no está registrado."""
    def result(first):
        r = MagicMock()
        r.scalars.return_value.first.return_value = first
        return r
    db = MagicMock()
    db.execute = AsyncMock(side_effect=[result(NS(id=1, codigo_referido="IG1")), result(None), result(None)])
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


@pytest.mark.parametrize("path", [None, ""])
def test_convertir_sin_comprobante_se_rechaza_y_no_crea_nada(path):
    db = _db()
    with pytest.raises(HTTPException) as exc:
        asyncio.run(PotentialReferralService.convert_to_investment_request(db, 1, _payload(comprobante_path=path)))
    assert exc.value.status_code == 422
    db.add.assert_not_called()
    db.commit.assert_not_awaited()
