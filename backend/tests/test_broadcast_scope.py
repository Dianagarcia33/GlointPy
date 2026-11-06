import pytest
from pydantic import ValidationError

from src.schemas.notification import AdminBroadcastNotificationRequest as Req

BASE = {"title": "t", "message": "m"}


def test_target_type_desconocido_se_rechaza():
    # el caso de QA: 'target_type' se ignoraba y el envío caía en "todos"
    with pytest.raises(ValidationError):
        Req(**BASE, target_type="specific_users", target_user_ids=[975])


def test_sin_alcance_no_envia_a_todos():
    with pytest.raises(ValidationError):
        Req(**BASE)


def test_alcances_validos():
    assert Req(**BASE, target_audience="all").target_audience == "all"
    assert Req(**BASE, target_audience="role", target_role_id=3).target_role_id == 3
    assert Req(**BASE, target_audience="specific_users", target_user_ids=[975]).target_user_ids == [975]


def test_alcance_incompleto_o_mezclado_se_rechaza():
    for extra in (
        {"target_audience": "role"},
        {"target_audience": "specific_users"},
        {"target_audience": "specific_users", "target_user_ids": []},
        {"target_audience": "all", "target_user_ids": [1]},
        {"target_audience": "role", "target_role_id": 1, "target_user_ids": [1]},
        {"target_audience": "todos"},
    ):
        with pytest.raises(ValidationError):
            Req(**BASE, **extra)


# --- H-208: el servicio rechaza (400) alcances que no se resuelven a usuarios; nunca cae en "todos" ---
import asyncio
from unittest.mock import AsyncMock, MagicMock

from fastapi import HTTPException

from src.services.push_notification_service import PushNotificationService


def _db_sin_resultados():
    res = MagicMock()
    res.scalars.return_value.first.return_value = None
    res.scalars.return_value.all.return_value = []
    db = MagicMock()
    db.execute = AsyncMock(return_value=res)
    return db


def _enviar(db, **kw):
    return asyncio.run(
        PushNotificationService.send_broadcast_notification(db=db, sender_id=1, title="t", message="m", send_push=False, **kw)
    )


@pytest.mark.parametrize("kw", [
    {"target_audience": "specific_users", "target_user_ids": [999999]},
    {"target_audience": "role", "target_role_id": 999999},
    {"target_audience": "specific_users", "target_user_ids": []},
    {"target_audience": "role"},
    {"target_audience": "desconocido"},
])
def test_servicio_rechaza_alcance_sin_destinatarios(kw):
    db = _db_sin_resultados()
    with pytest.raises(HTTPException) as e:
        _enviar(db, **kw)
    assert e.value.status_code == 400
    db.add_all.assert_not_called()
