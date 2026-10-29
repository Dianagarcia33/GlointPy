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
