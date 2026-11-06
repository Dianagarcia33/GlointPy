"""Endurecimiento de la recuperación de contraseña: política en el servidor, OTP con propósito/intentos y límites."""
import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from src.api.v1.endpoints import auth as auth_ep
from src.core.password_policy import POLICY_MESSAGE, is_valid_password
from src.core.rate_limiter import password_recovery_rate_limiter, password_reset_failure_limiter
from src.core.security import create_password_reset_token, get_password_hash
from src.schemas.auth import ForceChangePasswordRequest
from src.services import auth_service
from src.services.auth_service import AuthService, FORCE_PASSWORD_PURPOSE, MAX_OTP_ATTEMPTS
from src.services.user_service import UserService


def run(coro):
    return asyncio.run(coro)


class FakeResult:
    def __init__(self, obj=None):
        self._obj = obj

    def scalars(self):
        return self

    def first(self):
        return self._obj


class FakeDB:
    def __init__(self, *results):
        self.results, self.commits, self.added = list(results), 0, []

    async def execute(self, *_a, **_k):
        return self.results.pop(0)

    async def commit(self):
        self.commits += 1

    async def refresh(self, _o):
        pass

    def add(self, obj):
        self.added.append(obj)


def user(**kw):
    base = dict(id=1, email="a@b.co", is_active=True, token_version=0, roles=[], is_superuser=False,
                must_change_password=True, password_hash=get_password_hash("Temporal1!"), name="Ana")
    base.update(kw)
    return SimpleNamespace(**base)


# ── Política de contraseña ────────────────────────────────────────────────────────

@pytest.mark.parametrize("clave", ["1", "abcdefgh", "ABCDEFG1!", "abcdefg1!", "Abcdefgh1", "Ab1!"])
def test_claves_que_incumplen_la_politica(clave):
    assert not is_valid_password(clave)


def test_clave_que_cumple_la_politica():
    assert is_valid_password("Nueva456!")


def test_restablecer_con_clave_debil_se_rechaza_antes_de_tocar_el_token():
    token = create_password_reset_token("a@b.co", "hash")
    with pytest.raises(HTTPException) as exc:
        run(AuthService.reset_password(FakeDB(), token, "1234"))  # FakeDB vacío: no debe consultar nada
    assert exc.value.status_code == 400 and exc.value.detail == POLICY_MESSAGE


def test_cambio_propio_con_clave_debil_se_rechaza_sin_revocar():
    u = user(must_change_password=False)
    with pytest.raises(HTTPException) as exc:
        run(UserService.change_password(FakeDB(FakeResult(u)), 1, "Temporal1!", "debil"))
    assert exc.value.detail == POLICY_MESSAGE and u.token_version == 0


# ── Cambio obligatorio: OTP con propósito e intentos ──────────────────────────────

def force_data(code="123456", nueva="Nueva456!"):
    return ForceChangePasswordRequest(email="a@b.co", current_password="Temporal1!", new_password=nueva, code=code)


def verificacion(code="123456", attempts="0", minutos=10):
    return SimpleNamespace(code=code, attempts=attempts, used_at=None, purpose=FORCE_PASSWORD_PURPOSE,
                           expires_at=datetime.utcnow() + timedelta(minutes=minutos))


def test_clave_debil_en_cambio_obligatorio_no_quema_el_codigo():
    v = verificacion()
    with pytest.raises(HTTPException) as exc:
        run(AuthService.force_change_password(FakeDB(FakeResult(user())), force_data(nueva="debil")))
    assert exc.value.detail == POLICY_MESSAGE and v.used_at is None  # ni siquiera se consultó el OTP


def test_codigo_incorrecto_cuenta_el_intento_y_avisa_cuantos_quedan():
    v = verificacion()
    db = FakeDB(FakeResult(user()), FakeResult(v))
    with pytest.raises(HTTPException) as exc:
        run(AuthService.force_change_password(db, force_data(code="000000")))
    assert v.attempts == "1" and db.commits == 1 and v.used_at is None
    assert "Te quedan 4 intentos" in exc.value.detail


def test_al_agotar_los_intentos_el_codigo_se_invalida():
    v = verificacion(attempts=str(MAX_OTP_ATTEMPTS - 1))
    with pytest.raises(HTTPException) as exc:
        run(AuthService.force_change_password(FakeDB(FakeResult(user()), FakeResult(v)), force_data(code="000000")))
    assert v.used_at is not None and "Solicita un nuevo código" in exc.value.detail


def test_codigo_correcto_cambia_la_clave_revoca_y_consume_el_codigo():
    v, u = verificacion(), user()
    db = FakeDB(FakeResult(u), FakeResult(v))
    run(AuthService.force_change_password(db, force_data()))
    assert v.used_at is not None and u.must_change_password is False and u.token_version == 1


def test_codigo_vencido_se_rechaza():
    v = verificacion(minutos=-1)
    with pytest.raises(HTTPException) as exc:
        run(AuthService.force_change_password(FakeDB(FakeResult(user()), FakeResult(v)), force_data()))
    assert "expirado" in exc.value.detail


def test_sin_codigo_con_el_proposito_correcto_se_rechaza():
    with pytest.raises(HTTPException) as exc:
        run(AuthService.force_change_password(FakeDB(FakeResult(user()), FakeResult(None)), force_data()))
    assert exc.value.status_code == 400


def test_el_otp_se_emite_con_proposito_propio_y_de_seis_digitos(monkeypatch):
    enviados = []
    monkeypatch.setattr(auth_service.EmailService, "send_html_email", lambda **kw: enviados.append(kw))
    db = FakeDB(FakeResult(user()), FakeResult())  # usuario y el UPDATE que invalida códigos previos
    run(AuthService.send_force_password_otp(db, "a@b.co", "Temporal1!"))
    nuevo = db.added[0]
    assert nuevo.purpose == FORCE_PASSWORD_PURPOSE and len(nuevo.code) == 6 and nuevo.code.isdigit()
    assert len(enviados) == 1


# ── Límites ───────────────────────────────────────────────────────────────────────

def limpiar():
    for lim in (password_recovery_rate_limiter, password_reset_failure_limiter):
        lim.attempts.clear()
        lim.blocked_ips.clear()


def peticion(ip="9.9.9.9"):
    return SimpleNamespace(headers={}, client=SimpleNamespace(host=ip))


def test_forgot_password_limita_las_solicitudes_por_ip(monkeypatch):
    limpiar()

    async def nada(*_a, **_k):
        return True

    monkeypatch.setattr(AuthService, "request_password_reset", nada)
    data = SimpleNamespace(email="x@y.co")
    for _ in range(5):
        assert "message" in run(auth_ep.forgot_password(data, peticion(), None, None))
    with pytest.raises(HTTPException) as exc:
        run(auth_ep.forgot_password(data, peticion(), None, None))
    assert exc.value.status_code == 429
    # otra IP no se ve afectada
    assert "message" in run(auth_ep.forgot_password(data, peticion("8.8.8.8"), None, None))
    limpiar()


def test_reset_password_bloquea_tras_demasiados_fallos(monkeypatch):
    limpiar()

    async def falla(*_a, **_k):
        raise HTTPException(status_code=400, detail="Token inválido o expirado.")

    monkeypatch.setattr(AuthService, "reset_password", falla)
    data = SimpleNamespace(token="x", new_password="Nueva456!")
    for _ in range(10):
        with pytest.raises(HTTPException) as exc:
            run(auth_ep.reset_password(data, peticion(), None))
        assert exc.value.status_code == 400
    with pytest.raises(HTTPException) as exc:
        run(auth_ep.reset_password(data, peticion(), None))
    assert exc.value.status_code == 429
    limpiar()


def test_correos_de_recuperacion_limitados_por_direccion(monkeypatch):
    auth_service._reset_email_log.clear()
    enviados = []
    monkeypatch.setattr(auth_service.EmailService, "send_password_reset_email", lambda email, token: enviados.append(email))
    u = user(is_active=True)
    for _ in range(5):
        assert run(AuthService.request_password_reset(FakeDB(FakeResult(u)), "a@b.co", None)) is True
    assert len(enviados) == auth_service.RESET_EMAIL_MAX  # la respuesta es igual, pero no se sigue enviando
    auth_service._reset_email_log.clear()
