"""H-198: formato de documento, teléfono y fecha de nacimiento del perfil."""
from datetime import date

import pytest

from src.core.identity import normalize_document_id, normalize_phone_number, validate_birth_date

HOY = date(2026, 9, 25)


@pytest.mark.parametrize("valor", ["234234dsdsdsd", "abc", "123", "12 34", "1234567890123456"])
def test_documento_invalido(valor):
    with pytest.raises(ValueError):
        normalize_document_id(valor)


def test_documento_valido_se_normaliza():
    assert normalize_document_id("1.020.304.050") == "1020304050"
    assert normalize_document_id(" 12345678 ") == "12345678"


@pytest.mark.parametrize("valor", ["dfsdfsdfff", "12345", "2001234567", "+0123456789"])
def test_telefono_invalido(valor):
    with pytest.raises(ValueError):
        normalize_phone_number(valor)


@pytest.mark.parametrize("valor,esperado", [
    ("300 123 4567", "3001234567"), ("+573001234567", "3001234567"), ("+1 415 555 0123", "+14155550123"),
])
def test_telefono_valido(valor, esperado):
    assert normalize_phone_number(valor) == esperado


@pytest.mark.parametrize("fecha", [HOY, date(2026, 12, 1), date(1890, 1, 1)])
def test_fecha_nacimiento_invalida(fecha):
    with pytest.raises(ValueError):
        validate_birth_date(fecha, HOY)


def test_fecha_nacimiento_valida():
    assert validate_birth_date(date(1990, 5, 5), HOY) == date(1990, 5, 5)
    assert validate_birth_date(date(2026, 9, 24), HOY) == date(2026, 9, 24)  # un menor con tutor sigue siendo posible
