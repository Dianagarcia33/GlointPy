from sqlalchemy import select, func
from sqlalchemy.dialects import postgresql

from src.models.investor import Investor
from src.schemas.investor import InvestorPaginatedResponse
from src.services.investor_service import InvestorService


def test_condicion_cuenta_solo_aceleraciones_aplicadas_con_dias_reducidos():
    sql = str(select(func.count(Investor.id)).where(InvestorService.accelerated_contract_condition())
              .compile(dialect=postgresql.dialect()))
    assert "contract_accelerations" in sql and "EXISTS" in sql.upper()
    assert "applied IS true" in sql.lower() or "applied is true" in sql.lower()
    assert "days_to_reduce >" in sql


def test_respuesta_expone_total_global_de_acelerados():
    r = InvestorPaginatedResponse(data=[], total=1750, accelerated_total=133)
    assert r.model_dump()["accelerated_total"] == 133
