"""Revocación de sesiones: la versión de sesión viaja en el token y subirla invalida los tokens anteriores."""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from jose import jwt

from src.api.deps import get_current_user
from src.core.config import settings
from src.core.security import (
    create_access_token,
    create_password_reset_token,
    get_password_hash,
)
from src.core.session_revocation import is_session_current, revoke_user_sessions, token_version_of
from src.services.auth_service import AuthService
from src.services.user_service import UserService


def run(coro):
    return asyncio.run(coro)


def decode(token):
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


class FakeResult:
    def __init__(self, obj=None, row=None):
        self._obj, self._row = obj, row

    def scalars(self):
        return self

    def first(self):
        return self._row if self._row is not None else self._obj


class FakeDB:
    """Devuelve, en orden, los resultados preparados; cuenta los commit."""

    def __init__(self, *results):
        self.results = list(results)
        self.commits = 0

    async def execute(self, *_args, **_kwargs):
        return self.results.pop(0)

    async def commit(self):
        self.commits += 1

    async def rollback(self):
        pass

    async def refresh(self, _obj):
        pass


def user(tv=0, **kw):
    base = dict(id=1, is_active=True, token_version=tv, roles=[], is_superuser=False)
    base.update(kw)
    return SimpleNamespace(**base)


# ── Emisión ───────────────────────────────────────────────────────────────────────

def test_el_token_lleva_la_version_de_sesion():
    payload = decode(create_access_token(subject=7, token_version=3))
    assert payload["tv"] == 3 and payload["sub"] == "7" and "iat" in payload


def test_sin_version_se_emite_como_cero():
    assert decode(create_access_token(subject=7))["tv"] == 0


# ── Validación ────────────────────────────────────────────────────────────────────

def test_token_con_la_version_vigente_es_valido():
    assert run(is_session_current(FakeDB(), {"tv": 2}, user(tv=2)))


def test_token_viejo_deja_de_valer_tras_revocar():
    u = user(tv=0)
    token_payload = decode(create_access_token(subject=1, token_version=u.token_version))
    assert run(is_session_current(FakeDB(), token_payload, u))
    run(revoke_user_sessions(FakeDB(), u))
    assert u.token_version == 1
    assert not run(is_session_current(FakeDB(), token_payload, u))


def test_token_anterior_a_la_funcion_sigue_valiendo_hasta_que_se_revoque():
    legacy = {"sub": "1"}  # sin claim tv
    assert run(is_session_current(FakeDB(), legacy, user(tv=0)))
    assert not run(is_session_current(FakeDB(), legacy, user(tv=1)))


def test_version_mal_formada_no_vale():
    assert token_version_of({"tv": "abc"}) is None
    assert not run(is_session_current(FakeDB(), {"tv": "abc"}, user(tv=0)))


def test_revocar_devuelve_la_nueva_version_y_acumula():
    u = user(tv=4)
    assert run(revoke_user_sessions(FakeDB(), u)) == 5
    assert run(revoke_user_sessions(FakeDB(), u)) == 6


# ── Sesiones de supervisión (tutor -> menor) ──────────────────────────────────────

def supervisor_row(tv, active=True):
    return FakeResult(row=SimpleNamespace(token_version=tv, is_active=active))


def test_sesion_de_supervision_vale_mientras_el_tutor_conserve_su_version():
    payload = {"tv": 0, "imp_by": 9, "imp_tv": 2}
    assert run(is_session_current(FakeDB(supervisor_row(2)), payload, user(tv=0)))


def test_sesion_de_supervision_cae_si_el_tutor_pierde_sus_sesiones():
    payload = {"tv": 0, "imp_by": 9, "imp_tv": 2}
    assert not run(is_session_current(FakeDB(supervisor_row(3)), payload, user(tv=0)))


def test_sesion_de_supervision_cae_si_el_tutor_esta_inactivo_o_no_existe():
    payload = {"tv": 0, "imp_by": 9, "imp_tv": 0}
    assert not run(is_session_current(FakeDB(supervisor_row(0, active=False)), payload, user()))
    assert not run(is_session_current(FakeDB(FakeResult(row=None)), payload, user()))
    # FakeResult(row=None) usa el objeto vacío: first() -> None
    assert not run(is_session_current(FakeDB(FakeResult()), payload, user()))


# ── Dependencia de FastAPI ────────────────────────────────────────────────────────

def request():
    return SimpleNamespace(cookies={}, query_params={})


def test_get_current_user_rechaza_un_token_revocado():
    stale = create_access_token(subject=1, token_version=0)
    db = FakeDB(FakeResult(obj=user(tv=1)))
    with pytest.raises(HTTPException) as exc:
        run(get_current_user(request(), db, stale))
    assert exc.value.status_code == 401


def test_get_current_user_acepta_el_token_vigente():
    fresh = create_access_token(subject=1, token_version=1)
    u = user(tv=1)
    assert run(get_current_user(request(), FakeDB(FakeResult(obj=u)), fresh)) is u


# ── Servicios que deben revocar ───────────────────────────────────────────────────

def test_restablecer_contrasena_revoca_las_sesiones():
    old_hash = get_password_hash("Vieja123!")
    u = user(tv=0, email="a@b.co", password_hash=old_hash, must_change_password=True)
    token = create_password_reset_token(u.email, old_hash)
    db = FakeDB(FakeResult(obj=u))
    run(AuthService.reset_password(db, token, "Nueva456!"))
    assert u.token_version == 1 and u.must_change_password is False and db.commits == 1


def test_cambio_propio_de_contrasena_revoca_y_devuelve_la_version_nueva():
    u = user(tv=2, password_hash=get_password_hash("Actual123!"), must_change_password=False,
             failed_login_attempts=3, locked_until=None)
    db = FakeDB(FakeResult(obj=u))
    res = run(UserService.change_password(db, 1, "Actual123!", "Nueva456!"))
    assert res["token_version"] == 3 and u.token_version == 3
    assert u.failed_login_attempts == 0


def test_cambio_propio_con_clave_actual_incorrecta_no_revoca():
    u = user(tv=2, password_hash=get_password_hash("Actual123!"))
    db = FakeDB(FakeResult(obj=u))
    with pytest.raises(HTTPException):
        run(UserService.change_password(db, 1, "Otra999!", "Nueva456!"))
    assert u.token_version == 2 and db.commits == 0


def test_el_administrador_puede_cerrar_las_sesiones_de_un_usuario():
    target = user(tv=0, id=5)
    admin = user(tv=0, id=1)
    db = FakeDB(FakeResult(obj=target))
    res = run(UserService.revoke_sessions(db, 5, current_user=admin))
    assert target.token_version == 1 and res["user_id"] == 5 and db.commits == 1


def test_un_admin_no_puede_cerrar_las_sesiones_de_un_superadmin():
    target = user(tv=0, id=5, is_superuser=True)
    admin = user(tv=0, id=1)
    with pytest.raises(HTTPException) as exc:
        run(UserService.revoke_sessions(FakeDB(FakeResult(obj=target)), 5, current_user=admin))
    assert exc.value.status_code == 403 and target.token_version == 0


def test_un_superadmin_si_puede_cerrar_las_sesiones_de_otro_superadmin():
    target = user(tv=0, id=5, is_superuser=True)
    caller = user(tv=0, id=1, is_superuser=True)
    run(UserService.revoke_sessions(FakeDB(FakeResult(obj=target)), 5, current_user=caller))
    assert target.token_version == 1


def test_revocar_sesiones_de_un_usuario_inexistente_da_404():
    with pytest.raises(HTTPException) as exc:
        run(UserService.revoke_sessions(FakeDB(FakeResult()), 99, current_user=user()))
    assert exc.value.status_code == 404


# ── WebSockets abiertos ───────────────────────────────────────────────────────────

class FakeSocket:
    def __init__(self, fail=False):
        self.closed, self.fail = None, fail

    async def close(self, code=None, reason=None):
        if self.fail:
            raise RuntimeError("ya cerrado")
        self.closed = (code, reason)


def test_revocar_cierra_los_websockets_abiertos_del_usuario():
    from src.services.chat_service import ConnectionManager
    m = ConnectionManager()
    a, b, ajeno = FakeSocket(), FakeSocket(fail=True), FakeSocket()
    m.user_connections = {7: {a, b}, 8: {ajeno}}
    run(m.close_user_connections(7))
    assert a.closed[0] == 1008 and ajeno.closed is None   # el que falla no impide cerrar los demás


def test_cerrar_conexiones_nunca_lanza(monkeypatch):
    from src.core import session_revocation as sr
    from src.services import chat_service

    async def boom(*_a, **_k):
        raise RuntimeError("falló")

    monkeypatch.setattr(chat_service.manager, "close_user_connections", boom)
    run(sr.close_live_connections(1))  # no debe propagar


def test_el_cambio_de_contrasena_cierra_los_websockets(monkeypatch):
    from src.core import session_revocation as sr
    from src.services import chat_service
    cerrados = []

    async def registrar(user_id, reason="x"):
        cerrados.append(user_id)

    monkeypatch.setattr(chat_service.manager, "close_user_connections", registrar)
    u = user(tv=0, id=42, password_hash=get_password_hash("Actual123!"), must_change_password=False,
             failed_login_attempts=0, locked_until=None)
    run(UserService.change_password(FakeDB(FakeResult(obj=u)), 42, "Actual123!", "Nueva456!"))
    assert cerrados == [42]
