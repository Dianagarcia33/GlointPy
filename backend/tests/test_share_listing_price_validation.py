"""H-238: validación del precio de una oferta de venta de acciones.

No define un mínimo de negocio (REQUIERE DECISIÓN): solo rechaza valores no válidos.
"""
import pytest
from pydantic import ValidationError

from src.schemas.share_market import ShareListingCreate


@pytest.mark.parametrize("price", [0, 0.0, -1, -0.01, float("nan"), float("inf"), "abc", None, 99999999999999])
def test_precio_invalido_se_rechaza(price):
    with pytest.raises(ValidationError):
        ShareListingCreate(shares_quantity=1, price_per_share=price)


@pytest.mark.parametrize("price", [0.01, 1, 1931, 5000.5, 9_999_999_999_999.99])
def test_precio_positivo_valido_se_acepta(price):
    assert ShareListingCreate(shares_quantity=1, price_per_share=price).price_per_share == price
