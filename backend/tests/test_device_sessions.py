"""Sesiones de dispositivo (app móvil): refresco con rotación, reutilización, vencimientos y revocación."""
import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from jose import jwt

from src.api.v1.endpoints import auth as auth_ep
from src.core.config import settings
from src.core.rate_limiter import refresh_failure_limiter
from src.core.session_revocation import is_session_current
from src.models.user_session import UserSession
from src.schemas.auth import ClientInfo
from src.services.auth_service import AuthService
from src.services.device_session_service import (
    DeviceSessionService,
    SESSION_ERROR,
    parse_refresh_token,
)


def run(coro):
    return asyncio.run(coro)


class FakeResult:
    def __init__(self, items=None):
        self.items = list(items or [])

    def scalars(self):
        return self

    def all(self):
        return self.items

    def first(self):
        return self.items[0] if self.items else None


class FakeDB:
    def __init__(self, *results):
        self.results, self.commits, self.added = list(results), 0, []

    async def execute(self, *_a, **_k):
        return self.results.pop(0)

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        for i, obj in enumerate(self.added, start=1):
            if getattr(obj, "id", None) is None:
                obj.id = 100 + i

    async def commit(self):
        self.commits += 1


def user(**kw):
    base = dict(id=1, is_active=True, token_version=0, email="a@b.co", roles=[], name="Ana")
    base.update(kw)
    return SimpleNamespace(**base)


def client(device="iphone-12345678"):
    return ClientInfo(device_id=device, device_name="iPhone de Ana", platform="ios", app_version="1.0.0")


def abrir(u=None):
    """Abre una sesión con FakeDB y devuelve (sesión, refresh_token, usuario)."""
    u = u or user()
    db = FakeDB(FakeResult([]), FakeResult([]))
    session, token = run(DeviceSessionService.create_session(db, u, client(), ip="1.2.3.4"))
    return session, token, u


def refrescar(session, u, token, ip="1.2.3.4"):
    db = FakeDB(FakeResult([session]), FakeResult([u]))
    return run(DeviceSessionService.refresh(db, token, ip=ip)), db


# ── Formato del token ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("malo", [None, "", "abc", "x.y", "0.secreto", "-3.secreto", "5."])
def test_formatos_invalidos_del_token_de_refresco(malo):
    assert parse_refresh_token(malo) is None


def test_formato_valido_del_token_de_refresco():
    assert parse_refresh_token("12.abcDEF_-123") == (12, "abcDEF_-123")


# ── Creación ──────────────────────────────────────────────────────────────────────

def test_crear_sesion_guarda_solo_el_hash_y_devuelve_el_token_una_vez():
    session, token, u = abrir()
    sid, secret = parse_refresh_token(token)
    assert sid == session.id and secret not in session.token_hash and len(session.token_hash) == 64
    assert session.device_id == "iphone-12345678" and session.platform == "ios"
    assert session.token_version == 0 and session.revoked_at is None
    assert session.expires_at > datetime.utcnow() + timedelta(days=settings.REFRESH_ABSOLUTE_DAYS - 1)


def test_iniciar_sesion_de_nuevo_en_el_mismo_dispositivo_reemplaza_la_anterior():
    vieja = UserSession(id=7, user_id=1, device_id="iphone-12345678", token_hash="x", token_version=0,
                        created_at=datetime.utcnow(), last_used_at=datetime.utcnow(),
                        expires_at=datetime.utcnow() + timedelta(days=5))
    db = FakeDB(FakeResult([vieja]), FakeResult([]))
    run(DeviceSessionService.create_session(db, user(), client(), ip=None))
    assert vieja.revoked_at is not None and vieja.revoked_reason == "replaced"


def test_el_tope_de_sesiones_cierra_la_menos_usada():
    ahora = datetime.utcnow()
    activas = [
        UserSession(id=i, user_id=1, device_id=f"otro-dispositivo-{i}", token_hash="x", token_version=0,
                    created_at=ahora, last_used_at=ahora - timedelta(days=10 - i), expires_at=ahora + timedelta(days=30))
        for i in range(settings.MAX_DEVICE_SESSIONS)
    ]
    db = FakeDB(FakeResult([]), FakeResult(activas))  # ya hay MAX activas, ordenadas de más antigua a más reciente
    run(DeviceSessionService.create_session(db, user(), client(), ip=None))
    cerradas = [s for s in activas if s.revoked_at is not None]
    assert len(cerradas) == 1 and cerradas[0] is activas[0] and cerradas[0].revoked_reason == "limit"


# ── Refresco y rotación ───────────────────────────────────────────────────────────

def test_el_refresco_rota_el_token_y_el_anterior_pasa_a_prev():
    session, token, u = abrir()
    hash_inicial = session.token_hash
    (s, nuevo, usuario), db = refrescar(session, u, token)
    assert nuevo != token and s is session and usuario is u
    assert session.prev_token_hash == hash_inicial and session.token_hash != hash_inicial
    assert session.rotated_at is not None and db.commits == 1


def test_el_nuevo_token_sigue_funcionando_y_el_anterior_dentro_de_la_tolerancia_tambien():
    session, token, u = abrir()
    (_, t1, _), _ = refrescar(session, u, token)           # rotación normal
    (_, t2, _), _ = refrescar(session, u, t1)              # el nuevo sirve
    (_, t3, _), _ = refrescar(session, u, t1)              # t1 ya rotado, pero dentro de la tolerancia: reintento
    assert len({token, t1, t2, t3}) == 4 and session.revoked_at is None


def test_reusar_un_token_ya_rotado_fuera_de_la_tolerancia_revoca_la_sesion():
    session, token, u = abrir()
    (_, t1, _), _ = refrescar(session, u, token)
    session.rotated_at = datetime.utcnow() - timedelta(seconds=settings.REFRESH_REUSE_GRACE_SECONDS + 30)
    with pytest.raises(HTTPException) as exc:
        refrescar(session, u, token)                       # se presenta el token viejo
    assert exc.value.status_code == 401 and exc.value.detail == SESSION_ERROR
    assert session.revoked_at is not None and session.revoked_reason == "reuse_detected"
    with pytest.raises(HTTPException):
        refrescar(session, u, t1)                          # y el nuevo ya tampoco vale


def test_un_secreto_incorrecto_no_toca_la_sesion():
    session, token, u = abrir()
    sid, _ = parse_refresh_token(token)
    with pytest.raises(HTTPException) as exc:
        refrescar(session, u, f"{sid}.secreto-adivinado")
    assert exc.value.status_code == 401 and session.revoked_at is None


def test_token_inexistente_o_malformado_da_401_generico():
    for malo in ("no-es-un-token", "999.algo-largo-aqui"):
        with pytest.raises(HTTPException) as exc:
            run(DeviceSessionService.refresh(FakeDB(FakeResult([])), malo))
        assert exc.value.status_code == 401 and exc.value.detail == SESSION_ERROR


def test_sesion_revocada_no_refresca():
    session, token, u = abrir()
    session.revoked_at = datetime.utcnow()
    with pytest.raises(HTTPException):
        refrescar(session, u, token)


def test_sesion_vencida_por_limite_absoluto():
    session, token, u = abrir()
    session.expires_at = datetime.utcnow() - timedelta(seconds=1)
    with pytest.raises(HTTPException):
        refrescar(session, u, token)
    assert session.revoked_reason == "expired"


def test_sesion_vencida_por_inactividad():
    session, token, u = abrir()
    session.last_used_at = datetime.utcnow() - timedelta(days=settings.REFRESH_IDLE_DAYS + 1)
    with pytest.raises(HTTPException):
        refrescar(session, u, token)
    assert session.revoked_reason == "expired"


def test_usuario_inactivo_no_refresca():
    session, token, u = abrir()
    u.is_active = False
    with pytest.raises(HTTPException):
        refrescar(session, u, token)
    assert session.revoked_reason == "inactive"


def test_cambiar_la_version_de_sesion_del_usuario_invalida_el_refresco():
    session, token, u = abrir()
    u.token_version = 1  # p. ej. cambió su contraseña desde otro dispositivo
    with pytest.raises(HTTPException):
        refrescar(session, u, token)
    assert session.revoked_reason == "version"


# ── Token de acceso del dispositivo ───────────────────────────────────────────────

def test_el_token_de_acceso_es_corto_y_lleva_la_sesion_y_la_version():
    session, token, u = abrir(user(token_version=3))
    resp = DeviceSessionService.token_response(u, session, token)
    claims = jwt.decode(resp["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert claims["sid"] == session.id and claims["tv"] == 3 and claims["sub"] == "1"
    vida = claims["exp"] - claims["iat"]
    assert abs(vida - settings.MOBILE_ACCESS_TOKEN_MINUTES * 60) <= 2
    assert resp["expires_in"] == settings.MOBILE_ACCESS_TOKEN_MINUTES * 60 and resp["refresh_token"] == token


def row(**kw):
    base = dict(user_id=1, revoked_at=None, expires_at=datetime.utcnow() + timedelta(days=1))
    base.update(kw)
    return SimpleNamespace(**base)


class RowResult:
    def __init__(self, r):
        self.r = r

    def first(self):
        return self.r


def test_validar_el_access_token_comprueba_que_la_sesion_del_dispositivo_siga_vigente():
    payload = {"tv": 0, "sid": 5}
    assert run(is_session_current(FakeDB(RowResult(row())), payload, user()))
    assert not run(is_session_current(FakeDB(RowResult(row(revoked_at=datetime.utcnow()))), payload, user()))
    assert not run(is_session_current(FakeDB(RowResult(row(user_id=99))), payload, user()))
    assert not run(is_session_current(FakeDB(RowResult(row(expires_at=datetime.utcnow() - timedelta(seconds=1)))), payload, user()))
    assert not run(is_session_current(FakeDB(RowResult(None)), payload, user()))
    assert not run(is_session_current(FakeDB(), {"tv": 0, "sid": "no-numerico"}, user()))


def test_un_token_sin_sid_no_consulta_sesiones():
    assert run(is_session_current(FakeDB(), {"tv": 0}, user()))  # FakeDB vacío: no debe ejecutar nada


# ── Cerrar, listar, mantener viva ────────────────────────────────────────────────

def test_cerrar_la_sesion_del_dispositivo_con_su_refresco():
    session, token, u = abrir()
    run(DeviceSessionService.revoke_by_refresh_token(FakeDB(FakeResult([session])), token))
    assert session.revoked_at is not None and session.revoked_reason == "logout"


def test_cerrar_con_un_secreto_incorrecto_no_hace_nada():
    session, token, u = abrir()
    sid, _ = parse_refresh_token(token)
    run(DeviceSessionService.revoke_by_refresh_token(FakeDB(FakeResult([session])), f"{sid}.otro-secreto"))
    assert session.revoked_at is None


def test_listar_solo_las_vigentes():
    ahora = datetime.utcnow()

    def s(i, **kw):
        base = dict(id=i, user_id=1, device_id=f"d-{i}-xxxxxx", token_hash="x", token_version=0, created_at=ahora,
                    last_used_at=ahora, expires_at=ahora + timedelta(days=5))
        base.update(kw)
        return UserSession(**base)

    filas = [s(1), s(2, token_version=9), s(3, expires_at=ahora - timedelta(days=1))]
    vigentes = run(DeviceSessionService.list_sessions(FakeDB(FakeResult(filas)), user()))
    assert [x.id for x in vigentes] == [1]


def test_el_usuario_solo_cierra_sus_propias_sesiones():
    session, _, u = abrir()
    assert run(DeviceSessionService.revoke_user_session(FakeDB(FakeResult([session])), u, session.id)) is True
    assert session.revoked_reason == "user"
    assert run(DeviceSessionService.revoke_user_session(FakeDB(FakeResult([])), u, 12345)) is False


def test_tras_cambiar_la_clave_el_dispositivo_que_la_cambio_sigue_vivo():
    session, token, u = abrir()
    run(DeviceSessionService.keep_session_alive(FakeDB(FakeResult([session])), session.id, 1, 4))
    assert session.token_version == 4
    # una sesión ajena o inexistente no se toca
    ajena = abrir(user(id=2))[0]
    run(DeviceSessionService.keep_session_alive(FakeDB(FakeResult([])), ajena.id, 1, 4))
    assert ajena.token_version == 0
    run(DeviceSessionService.keep_session_alive(FakeDB(), None, 1, 4))  # sin sid: no consulta nada


# ── Rutas ─────────────────────────────────────────────────────────────────────────

def peticion(ip="7.7.7.7"):
    return SimpleNamespace(headers={}, url=SimpleNamespace(scheme="http"), client=SimpleNamespace(host=ip))


class FakeResponse:
    def __init__(self):
        self.headers, self.cookies = {}, []

    def set_cookie(self, **kw):
        self.cookies.append(kw)


def test_login_con_datos_del_dispositivo_abre_sesion_movil_sin_cookie(monkeypatch):
    u = user()

    async def autenticar(*_a, **_k):
        return u

    monkeypatch.setattr(AuthService, "authenticate_user", autenticar)
    resp = FakeResponse()
    datos = SimpleNamespace(email="a@b.co", password="x", client=client())
    salida = run(auth_ep.login(datos, peticion(), resp, FakeDB(FakeResult([]), FakeResult([]))))
    assert salida["refresh_token"] and salida["expires_in"] == settings.MOBILE_ACCESS_TOKEN_MINUTES * 60
    assert resp.cookies == [] and resp.headers["Cache-Control"] == "no-store"


def test_login_normal_no_cambia_ni_da_refresco(monkeypatch):
    u = user()

    async def autenticar(*_a, **_k):
        return u

    monkeypatch.setattr(AuthService, "authenticate_user", autenticar)
    resp = FakeResponse()
    datos = SimpleNamespace(email="a@b.co", password="x", client=None)
    salida = run(auth_ep.login(datos, peticion(), resp, FakeDB()))
    claims = jwt.decode(salida["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert "refresh_token" not in salida and "sid" not in claims           # igual que antes
    assert len(resp.cookies) == 1                                          # la web sigue usando la cookie
    assert abs((claims["exp"] - claims["iat"]) - settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60) <= 2


def test_la_ruta_de_refresco_devuelve_tokens_nuevos_y_limita_los_fallos():
    refresh_failure_limiter.attempts.clear()
    refresh_failure_limiter.blocked_ips.clear()
    session, token, u = abrir()
    resp = FakeResponse()
    datos = SimpleNamespace(refresh_token=token)
    salida = run(auth_ep.refresh_session(datos, peticion(), resp, FakeDB(FakeResult([session]), FakeResult([u]))))
    assert salida["refresh_token"] != token and resp.headers["Cache-Control"] == "no-store"

    malo = SimpleNamespace(refresh_token="1.token-falso-largo")
    for _ in range(20):
        with pytest.raises(HTTPException) as exc:
            run(auth_ep.refresh_session(malo, peticion(), FakeResponse(), FakeDB(FakeResult([]))))
        assert exc.value.status_code == 401
    with pytest.raises(HTTPException) as exc:
        run(auth_ep.refresh_session(malo, peticion(), FakeResponse(), FakeDB(FakeResult([]))))
    assert exc.value.status_code == 429
    refresh_failure_limiter.attempts.clear()
    refresh_failure_limiter.blocked_ips.clear()


def test_cerrar_sesion_del_dispositivo_responde_200_aunque_el_token_no_coincida():
    out = run(auth_ep.revoke_device_session(SimpleNamespace(refresh_token="1.no-coincide-nada"), FakeDB(FakeResult([]))))
    assert "message" in out


def test_cerrar_una_sesion_ajena_da_404():
    with pytest.raises(HTTPException) as exc:
        run(auth_ep.revoke_own_device_session(5, user(), FakeDB(FakeResult([]))))
    assert exc.value.status_code == 404
