"""H-226: el backend rechaza cancelar una reserva cuya hora de fin ya pasó."""
import asyncio
from datetime import timedelta
from types import SimpleNamespace as NS

import pytest
from fastapi import HTTPException

from src.core.timezone import get_colombia_now
from src.services.room_service import RoomService


class Res:
    def __init__(self, obj):
        self._o = obj

    def scalars(self):
        return self

    def first(self):
        return self._o


class Db:
    def __init__(self, reservation):
        self.r, self.committed = reservation, False

    async def execute(self, *_a, **_k):
        return Res(self.r)

    async def commit(self):
        self.committed = True

    async def refresh(self, _o):
        pass


def _reservation(end_delta):
    end = get_colombia_now().replace(tzinfo=None) + end_delta
    return NS(id=1, user_id=5, status="confirmed", end_time=end, cancelled_reason=None)


def _cancel(reservation):
    db = Db(reservation)
    out = asyncio.run(RoomService.cancel_reservation(db, 1, NS(id=5), reason=None, is_admin=False))
    return db, out


def test_reserva_terminada_no_se_cancela():
    r = _reservation(timedelta(minutes=-5))
    with pytest.raises(HTTPException) as e:
        _cancel(r)
    assert e.value.status_code == 400
    assert r.status == "confirmed"


def test_reserva_futura_si_se_cancela():
    db, out = _cancel(_reservation(timedelta(hours=1)))
    assert out.status == "cancelled" and db.committed
