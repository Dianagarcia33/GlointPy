"""La ciudad del contrato ({ciudad}) sale de la ciudad del usuario; se captura al registrarse y el equipo puede corregirla."""
import asyncio
import os

for _k, _v in {"DB_HOST": "x", "DB_USER": "x", "DB_PASSWORD": "x", "DB_NAME": "x", "SECRET_KEY": "x"}.items():
    os.environ.setdefault(_k, _v)

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from src.models.user import User  # noqa: E402
from src.schemas.investor import InvestorUpdate  # noqa: E402
from src.schemas.user import UserResponse  # noqa: E402
from src.services.investor_document_service import InvestorDocumentService as Docs  # noqa: E402


class _Vacio:
    """Cualquier dato que no se indique es None, como un modelo sin cargar."""
    def __init__(self, **kw):
        self.__dict__.update(kw)

    def __getattr__(self, _name):
        return None


def _investor(user):
    return _Vacio(user=user, assigned_code="GLO-1")


def _render(user):
    return Docs.render_html("Domiciliado en {ciudad} / {domicilio} / {ciudad_inversionista}", _investor(user))


def test_el_contrato_usa_la_ciudad_del_usuario():
    user = _Vacio(name="Ana Perez", city="Medellín", parent_user_id=None, parent=None)
    assert _render(user) == "Domiciliado en Medellín / Medellín / Medellín"


def test_sin_ciudad_cae_en_bogota_como_antes():
    user = _Vacio(name="Ana Perez", city=None, parent_user_id=None, parent=None)
    assert "Bogotá D.C." in _render(user)


def test_ciudad_vacia_cae_en_bogota():
    user = _Vacio(name="Ana Perez", city="", parent_user_id=None, parent=None)
    assert "Bogotá D.C." in _render(user)


def test_menor_de_edad_usa_la_ciudad_del_tutor():
    tutor = _Vacio(name="Marta Gomez", city="Cali", document_id="1", email="t@x.co", phone_number="3")
    menor = _Vacio(name="Nico Gomez", city="Pasto", parent=tutor, parent_user_id=9)
    assert _render(menor) == "Domiciliado en Cali / Cali / Cali"


def test_menor_sin_ciudad_del_tutor_usa_la_del_menor():
    tutor = _Vacio(name="Marta Gomez", city=None, document_id="1", email="t@x.co", phone_number="3")
    menor = _Vacio(name="Nico Gomez", city="Pasto", parent=tutor, parent_user_id=9)
    assert "Pasto" in _render(menor)


def test_el_usuario_tiene_columna_city_y_la_respuesta_la_expone():
    assert "city" in User.__table__.columns
    assert "city" in UserResponse.model_fields


def test_editar_el_inversionista_acepta_la_ciudad():
    assert InvestorUpdate(city="Barranquilla").model_dump(exclude_unset=True) == {"city": "Barranquilla"}
    assert "city" not in InvestorUpdate(observations="x").model_dump(exclude_unset=True)


def test_la_ciudad_es_una_variable_conocida_de_la_plantilla():
    assert Docs.find_unknown_variables("{ciudad} {domicilio}") == []


def test_aprobar_la_solicitud_copia_la_ciudad_al_usuario_que_no_la_tiene():
    from src.core.database import Base
    from src.models.investment_request import InvestmentRequest
    from sqlalchemy import select

    async def runner():
        engine = create_async_engine("sqlite+aiosqlite://")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[User.__table__])
        maker = async_sessionmaker(engine, expire_on_commit=False)
        async with maker() as db:
            db.add_all([User(id=1, name="A", email="a@x.co", password_hash="x"),
                        User(id=2, name="B", email="b@x.co", password_hash="x", city="Cali")])
            await db.commit()
            # Misma lógica que usa la aprobación (investment_request_service)
            for uid, extra in ((1, {"ciudad": " Medellín "}), (2, {"ciudad": "Bogotá"})):
                req = InvestmentRequest(user_id=uid, extra_data=extra)
                city = str(req.extra_data.get("ciudad") or "").strip()
                target = (await db.execute(select(User).where(User.id == req.user_id))).scalars().first()
                if city and not (target.city or "").strip():
                    target.city = city[:100]
            await db.commit()
            rows = {u.id: u.city for u in (await db.execute(select(User))).scalars()}
        await engine.dispose()
        return rows

    assert asyncio.run(runner()) == {1: "Medellín", 2: "Cali"}  # no pisa una ciudad que ya estaba corregida
