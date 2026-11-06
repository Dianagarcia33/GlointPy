"""La tabla de solicitudes muestra si el solicitante está validado por SARLAFT (mismas reglas que bloquean inversiones)."""
import asyncio
import os
from types import SimpleNamespace

import pytest

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from sqlalchemy import BigInteger  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402

import src.models  # noqa: E402,F401
from src.core.database import Base  # noqa: E402
from src.models.investment_request import InvestmentRequest  # noqa: E402
from src.models.package import Package  # noqa: E402
from src.models.sarlaft_check import SarlaftCheck  # noqa: E402
from src.models.user import User  # noqa: E402
from src.schemas.investment_request import InvestmentRequestPaginatedResponse  # noqa: E402
from src.services.investment_request_service import InvestmentRequestService  # noqa: E402
from src.services.sarlaft_status import sarlaft_state  # noqa: E402


@compiles(BigInteger, "sqlite")
def _bigint_como_integer_en_sqlite(_type, _compiler, **_kw):
    return "INTEGER"


def check(tusdatos_status="finalizado", risk="CLEAN", corregidos=False):
    return SimpleNamespace(tusdatos_status=tusdatos_status, risk_level=risk, tusdatos_hallazgos_corregidos=corregidos)


@pytest.mark.parametrize("c, esperado", [
    (None, "none"),
    (check("finalizado", "CLEAN"), "approved"),
    (check("completed", "LOW"), "approved"),
    (check("finalizado", "MEDIUM"), "approved"),
    (check("processing", None), "pending"),
    (check("procesando", None), "pending"),
    (check("pending", "CLEAN"), "pending"),
    (check(None, "CLEAN"), "pending"),
    (check("failed", None), "rejected"),
    (check("error", None), "rejected"),
    (check("finalizado", "HIGH", corregidos=False), "rejected"),
    (check("finalizado", "HIGH", corregidos=True), "approved"),  # un oficial de cumplimiento lo corrigió
])
def test_estado_sarlaft(c, esperado):
    assert sarlaft_state(c)["status"] == esperado


def test_devuelve_el_nivel_de_riesgo():
    assert sarlaft_state(check("finalizado", "LOW")) == {"status": "approved", "risk_level": "LOW"}
    assert sarlaft_state(None) == {"status": "none", "risk_level": None}


def test_la_tabla_de_solicitudes_trae_el_estado_sarlaft_de_cada_usuario():
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            db.add_all([User(id=i, name=f"U{i}", email=f"u{i}@x.co", password_hash="x") for i in range(1, 6)])
            db.add(Package(id=1, value=10_000_000, granted_shares=1))
            await db.commit()
            db.add_all([
                # u1: dos chequeos, cuenta el último (el primero había fallado)
                SarlaftCheck(id=1, user_id=1, tusdatos_status="failed"),
                SarlaftCheck(id=2, user_id=1, tusdatos_status="finalizado", risk_level="CLEAN"),
                SarlaftCheck(id=3, user_id=2, tusdatos_status="processing"),
                SarlaftCheck(id=4, user_id=3, tusdatos_status="finalizado", risk_level="HIGH", tusdatos_hallazgos_corregidos=False),
                # u4 no tiene chequeo; u5 tiene otro usuario con chequeo limpio que no debe contagiarlo
            ])
            for i in range(1, 6):
                db.add(InvestmentRequest(id=i, user_id=i, paquete_inversion_id=1, monto=10_000_000))
            await db.commit()
            page = await InvestmentRequestService.get_investment_requests(db, page=1, limit=20)
            body = InvestmentRequestPaginatedResponse.model_validate(page).model_dump()
        await engine.dispose()
        return {r["user_id"]: (r["sarlaft_status"], r["sarlaft_risk_level"]) for r in body["data"]}

    assert asyncio.run(runner()) == {
        1: ("approved", "CLEAN"), 2: ("pending", "CLEAN"), 3: ("rejected", "HIGH"),
        4: ("none", None), 5: ("none", None),
    }
