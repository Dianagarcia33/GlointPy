"""H-142: fecha de ingreso — sin fechas futuras; una fecha retroactiva exige un motivo que queda registrado."""
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from src.core.timezone import get_colombia_today
from src.schemas.investor import InvestorCreate, InvestorUpdate
from src.services.investor_service import InvestorService

HOY = get_colombia_today()


def dt(delta_dias):
    d = HOY + timedelta(days=delta_dias)
    return datetime(d.year, d.month, d.day)


def test_hoy_no_exige_motivo():
    assert InvestorService.check_retroactive_start_date(dt(0), None, None) is None


def test_sin_fecha_no_exige_motivo():
    assert InvestorService.check_retroactive_start_date(None, None, None) is None


@pytest.mark.parametrize("motivo", [None, "", "   ", "abc"])
def test_retroactiva_sin_motivo_valido_da_422(motivo):
    with pytest.raises(HTTPException) as e:
        InvestorService.check_retroactive_start_date(dt(-3), None, motivo)
    assert e.value.status_code == 422
    assert "motivo" in e.value.detail


def test_retroactiva_con_motivo_devuelve_motivo_limpio():
    assert InvestorService.check_retroactive_start_date(dt(-3), None, "  Firmado con retraso ") == "Firmado con retraso"


def test_editar_sin_cambiar_la_fecha_no_toca_contratos_historicos():
    antigua = dt(-400)
    assert InvestorService.check_retroactive_start_date(antigua, antigua, None) is None


def test_editar_a_otra_fecha_pasada_exige_motivo():
    with pytest.raises(HTTPException):
        InvestorService.check_retroactive_start_date(dt(-5), dt(-400), None)


def test_fecha_futura_sigue_rechazada():
    with pytest.raises(HTTPException) as e:
        InvestorService._ensure_start_date_not_future(dt(1))
    assert e.value.status_code == 422


def test_esquemas_aceptan_el_motivo():
    c = InvestorCreate(user_id=1, package_id=1, period_id=1, start_date=dt(-2), start_date_reason="x" * 10)
    assert c.start_date_reason == "x" * 10
    u = InvestorUpdate(start_date_reason="motivo largo")
    assert "start_date_reason" in u.model_dump(exclude_unset=True)
