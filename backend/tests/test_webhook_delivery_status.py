"""H-206: el resultado del envío del webhook se clasifica sin llamar a ningún servicio real."""
import asyncio
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from src.models.external_app import ExternalPaymentStatus
from src.services import external_app_service as svc


class _FakeResponse:
    def __init__(self, status_code, text=""):
        self.status_code = status_code
        self.text = text


def _client_returning(status_code, text=""):
    class _Client:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def post(self, *a, **k):
            return _FakeResponse(status_code, text)

    return _Client


def _order():
    app = SimpleNamespace(webhook_url="https://merchant.example/hook", webhook_secret="s")
    return SimpleNamespace(
        payment_token="glt_pay_x", order_reference="R1", amount=100, currency="COP",
        status=ExternalPaymentStatus.COMPLETED, description=None, user_id=None, user=None,
        metadata_json=None, completed_at=datetime.utcnow(), webhook_attempts=0,
        webhook_status="pending", webhook_response=None, app=app,
    )


async def _safe(_url):
    return True, "OK"


def _run(status_code, text=""):
    order = _order()
    with patch.object(svc, "verify_webhook_destination_safety", _safe), \
         patch.object(svc.httpx, "AsyncClient", _client_returning(status_code, text)):
        ok, permanent = asyncio.run(svc.ExternalAppService._execute_webhook_attempt(order))
    return order, ok, permanent


def test_2xx_es_entregado():
    order, ok, _ = _run(200, "ok")
    assert ok and order.webhook_status == "sent" and order.webhook_attempts == 1


@pytest.mark.parametrize("code", [301, 302, 405, 500])
def test_redireccion_o_error_no_cuenta_como_entregado(code):
    order, ok, permanent = _run(code, "<html>")
    assert not ok and not permanent
    assert order.webhook_status == "failed"
    assert order.webhook_response.startswith(f"HTTP {code}")
