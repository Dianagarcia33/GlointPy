"""Al aprobar una solicitud se generan solos los contratos (plantillas de tipo «contract»); un aumento genera la nueva versión."""
import asyncio
import os
from datetime import datetime

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from sqlalchemy import BigInteger, select  # noqa: E402
from sqlalchemy.ext.compiler import compiles  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

import src.models  # noqa: E402,F401  (registra todas las tablas)
from src.core.database import Base  # noqa: E402
from src.models.investor import Investor  # noqa: E402
from src.models.investor_document import InvestorDocument  # noqa: E402
from src.models.package import Package  # noqa: E402
from src.models.period import Period  # noqa: E402
from src.models.template import Template  # noqa: E402
from src.models.user import User  # noqa: E402
from src.services.investor_document_service import InvestorDocumentService as Docs  # noqa: E402



@compiles(BigInteger, "sqlite")
def _bigint_como_integer_en_sqlite(_type, _compiler, **_kw):
    """SQLite solo autoincrementa las llaves INTEGER; en MySQL (producción) el tipo no cambia."""
    return "INTEGER"


TPL_CONTRATO = "Contrato de {nombre_completo} en {ciudad} por {paquete_accion_adquirido}"


def _run(coro_factory):
    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            db.add_all([
                User(id=1, name="Ana Perez", email="a@x.co", password_hash="x", city="Medellín", document_id="123"),
                Package(id=1, value=10_000_000, granted_shares=10), Package(id=2, value=20_000_000, granted_shares=20),
                Period(id=1, percentage=2.0, months=12, days=365),
                Template(id=1, name="Contrato de inversión", type="contract", html_content=TPL_CONTRATO),
                Template(id=2, name="Pagaré", type=" Contract ", html_content="Pagaré {codigo_inversion}"),
                Template(id=3, name="Carta de bienvenida", type="welcome", html_content="Hola {nombre}"),
                Template(id=4, name="Contrato vacío", type="contract", html_content="   "),
                Investor(id=1, assigned_code="GLO-1", user_id=1, package_id=1, period_id=1,
                         start_date=datetime(2026, 11, 1), created_at=datetime(2026, 11, 1)),
            ])
            await db.commit()
            result = await coro_factory(db, maker)
        await engine.dispose()
        return result
    return asyncio.run(runner())


async def _docs(db):
    return (await db.execute(select(InvestorDocument).order_by(InvestorDocument.id))).scalars().all()


def test_un_contrato_nuevo_genera_solo_las_plantillas_de_tipo_contract():
    async def case(db, _maker):
        ids = await Docs.auto_generate_contracts(db, 1, is_upgrade=False)
        docs = await _docs(db)
        return ids, [(d.template_id, d.title, d.html_content) for d in docs]

    ids, docs = _run(case)
    assert len(ids) == 2  # contrato y pagaré (el tipo se compara sin importar mayúsculas ni espacios); no la bienvenida ni la vacía
    assert docs[0] == (1, "Contrato de inversión - GLO-1", "Contrato de Ana Perez en Medellín por $10.000.000 COP")
    assert docs[1][0] == 2 and docs[1][2] == "Pagaré GLO-1"


def test_aprobar_dos_veces_o_reintentar_no_duplica_el_contrato_nuevo():
    async def case(db, _maker):
        await Docs.auto_generate_contracts(db, 1, is_upgrade=False)
        again = await Docs.auto_generate_contracts(db, 1, is_upgrade=False)
        return again, len(await _docs(db))

    again, total = _run(case)
    assert again == [] and total == 2


def test_un_aumento_genera_una_nueva_version_y_conserva_la_anterior():
    async def case(db, _maker):
        await Docs.auto_generate_contracts(db, 1, is_upgrade=False)
        inv = (await db.execute(select(Investor).where(Investor.id == 1))).scalars().first()
        inv.package_id = 2  # lo que hace la aprobación del aumento
        await db.commit()
        await Docs.auto_generate_contracts(db, 1, is_upgrade=True)
        return [(d.template_id, d.title, d.html_content) for d in await _docs(db)]

    docs = _run(case)
    assert len(docs) == 4
    assert docs[0][2].endswith("$10.000.000 COP")  # la versión anterior no se toca
    nuevo = [d for d in docs if d[0] == 1][1]
    assert nuevo == (1, "Contrato de inversión (v2 - Actualización) - GLO-1", "Contrato de Ana Perez en Medellín por $20.000.000 COP")


def test_un_aumento_no_toca_el_historial_del_contrato():
    from src.models.contract_history import ContractHistory

    async def case(db, _maker):
        await Docs.auto_generate_contracts(db, 1, is_upgrade=True)
        return len((await db.execute(select(ContractHistory))).scalars().all())

    assert _run(case) == 0  # el historial lo escribe la aprobación; aquí no se duplica


def test_sin_plantillas_de_contrato_no_hace_nada():
    async def case(db, _maker):
        for t in (await db.execute(select(Template))).scalars().all():
            t.type = "otro"
        await db.commit()
        return await Docs.auto_generate_contracts(db, 1), len(await _docs(db))

    assert _run(case) == ([], 0)


def test_si_falla_la_generacion_no_lanza_error(monkeypatch):
    import src.core.database as database

    def roto():
        raise RuntimeError("sin base de datos")

    monkeypatch.setattr(database, "async_session_maker", roto)
    assert asyncio.run(Docs.auto_generate_contracts_safely(1, is_upgrade=False)) == []


def test_la_version_segura_usa_su_propia_sesion(monkeypatch):
    import src.core.database as database

    async def case(_db, maker):
        monkeypatch.setattr(database, "async_session_maker", maker)
        ids = await Docs.auto_generate_contracts_safely(1, is_upgrade=False)
        return ids

    assert len(_run(case)) == 2


def test_el_primer_documento_manual_sin_titulo_personalizado_ya_tiene_titulo():
    from src.schemas.investor_document import InvestorDocumentGenerateRequest

    async def case(db, _maker):
        doc = await Docs.generate_and_save(db, InvestorDocumentGenerateRequest(investor_id=1, template_id=1))
        return doc.title

    assert _run(case) == "Contrato de inversión - GLO-1"


# ---------------------------------------------------------------- de punta a punta: aprobar la solicitud
def _aprobar(monkeypatch, extra_pedidos):
    """Aprueba solicitudes reales (en orden) y devuelve los documentos que quedaron."""
    import src.core.database as database
    from src.models.investment_request import InvestmentRequest
    from src.services.email_service import EmailService
    from src.services.investment_request_service import InvestmentRequestService

    monkeypatch.setattr(EmailService, "send_investment_activated_email", staticmethod(lambda **kw: None), raising=False)

    async def case(db, maker):
        monkeypatch.setattr(database, "async_session_maker", maker)
        # No hay contrato previo: el de las pruebas anteriores se borra para partir de una inversión nueva
        inv = (await db.execute(select(Investor).where(Investor.id == 1))).scalars().first()
        await db.delete(inv)
        await db.commit()
        for i, extra in enumerate(extra_pedidos, start=1):
            db.add(InvestmentRequest(id=i, user_id=1, paquete_inversion_id=extra.pop("paquete"), monto=extra.pop("monto"),
                                     extra_data={"contract_period_id": 1, **extra}))
            await db.commit()
            await InvestmentRequestService.approve_request(db, i, user_id=1)
        return [(d.investor_id, d.title, d.html_content) for d in await _docs(db)]
    return _run(case)


def test_aprobar_una_solicitud_nueva_genera_el_contrato(monkeypatch):
    docs = _aprobar(monkeypatch, [{"paquete": 1, "monto": 10_000_000}])
    assert [d[1] for d in docs] == ["Contrato de inversión - IG1000", "Pagaré - IG1000"]
    assert "Ana Perez en Medellín por $10.000.000 COP" in docs[0][2]


def test_aprobar_un_aumento_genera_la_nueva_version_y_no_reemplaza_nada(monkeypatch):
    docs = _aprobar(monkeypatch, [
        {"paquete": 1, "monto": 10_000_000},
        {"paquete": 2, "monto": 20_000_000, "es_aumento_capital": True},
    ])
    assert len(docs) == 4
    assert len({d[0] for d in docs}) == 1  # el aumento actualiza el mismo contrato, no crea otro inversionista
    assert "$10.000.000 COP" in docs[0][2]  # el contrato original queda tal cual
    assert "(v2 - Actualización)" in docs[2][1] and "$20.000.000 COP" in docs[2][2]


def test_una_segunda_inversion_nueva_es_otro_contrato_y_no_toca_el_primero(monkeypatch):
    docs = _aprobar(monkeypatch, [{"paquete": 1, "monto": 10_000_000}, {"paquete": 2, "monto": 20_000_000}])
    assert len(docs) == 4
    assert len({d[0] for d in docs}) == 2
    assert not any("v2" in d[1] for d in docs)
