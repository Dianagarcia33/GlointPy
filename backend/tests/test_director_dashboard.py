"""H-232: /analytics/director-dashboard no debe dar 500 para un SuperAdmin sin ventas propias."""
import asyncio
from datetime import datetime, timedelta
from types import SimpleNamespace as NS

from src.api.v1.endpoints.analytics import get_director_analytics_dashboard


class Res:
    def __init__(self, scalar=0, rows=None, items=None):
        self._scalar, self._rows, self._items = scalar, rows or [], items or []

    def scalar(self):
        return self._scalar

    def all(self):
        return self._rows

    def scalars(self):
        return self


class ItemsRes(Res):
    def all(self):
        return self._items


class FakeDb:
    def __init__(self, results):
        self._results = list(results)

    async def execute(self, *_a, **_k):
        return self._results.pop(0)


def test_superadmin_sin_ventas_propias_no_falla():
    from src.api.v1.endpoints import analytics

    today = analytics.get_colombia_today()
    sale = NS(
        client_document="123", commercial=NS(name="Asesor Uno"), commercial_id=7,
    )
    inv = NS(
        id=1, assigned_code="C-1", user=NS(name="Cliente", document_id="123"),
        package=NS(value=1000000), period=NS(days=60), accelerations=[],
        start_date=datetime.combine(today - timedelta(days=30), datetime.min.time()),
    )
    db = FakeDb([
        Res(0), Res(0), Res(0), Res(0),           # captación/comisiones/cierres/histórico
        Res(rows=[]),                              # ranking
        Res(rows=[]),                              # tipos de venta
        Res(rows=[]),                              # historial 6 meses
        ItemsRes(items=[]),                        # ventas propias (SuperAdmin: ninguna)
        ItemsRes(items=[sale]),                    # todas las ventas
        ItemsRes(items=[inv]),                     # inversionistas
    ])
    user = NS(id=1, is_superuser=True)

    out = asyncio.run(get_director_analytics_dashboard(db=db, current_user=user))

    assert len(out["expiring_contracts"]) == 1
    assert out["expiring_contracts"][0]["fecha_ingreso"] == (today - timedelta(days=30)).isoformat()
