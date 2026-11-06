import pytest
from pydantic import ValidationError

from src.schemas.external_app import CreatePaymentIntentRequest, MAX_PAYMENT_AMOUNT


def _req(amount):
    return CreatePaymentIntentRequest(order_reference="A-1", amount=amount)


@pytest.mark.parametrize("amount", [99_999_999_999_999, 1e15, 1e20, float("inf"), float("nan")])
def test_montos_fuera_de_rango_se_rechazan(amount):
    with pytest.raises(ValidationError):
        _req(amount)


@pytest.mark.parametrize("amount", [0.01, 1000, 294700, MAX_PAYMENT_AMOUNT])
def test_montos_validos_se_aceptan(amount):
    assert _req(amount).amount == amount


def test_monto_no_numerico_se_rechaza():
    with pytest.raises(ValidationError):
        _req("abc")
