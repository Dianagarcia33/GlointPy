"""H-192: acciones congeladas por compra y regla del paquete de $50.000 (sin base real)."""
import asyncio
import importlib.util
import os
from datetime import datetime
from types import SimpleNamespace

from src.models.share_market import ShareMovement
from src.services.share_market_service import ShareMarketService
from src.services.package_service import normalize_package_shares


class Res:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return SimpleNamespace(all=lambda: self.rows)


class FakeDB:
    """Responde por orden: investors, movimientos del contrato (uno por contrato), y vacíos para el resto."""
    def __init__(self, investors, movements_by_inv):
        self.investors = investors
        self.mov = movements_by_inv
        self.added = []
        self.deleted = []
        self.calls = 0

    async def execute(self, q):
        sql = str(q)
        if "FROM investors" in sql:
            return Res(self.investors)
        if "share_movements" in sql and "investor_id" in sql and "package_grant" in str(q.compile(compile_kwargs={"literal_binds": True})):
            lit = str(q.compile(compile_kwargs={"literal_binds": True}))
            for inv in self.investors:
                if "investor_id = %d" % inv.id in lit:
                    return Res(self.mov.get(inv.id, []))
        return Res([])

    def add(self, o):
        self.added.append(o)

    async def delete(self, o):
        self.deleted.append(o)

    async def flush(self):
        pass


def inv(id_, frozen, live_shares):
    return SimpleNamespace(id=id_, assigned_code="C%d" % id_, shares_granted_frozen=frozen, package_id=1,
                           package=SimpleNamespace(granted_shares=live_shares, value=100000),
                           start_date=datetime(2026, 1, 1), created_at=datetime(2026, 1, 1))


def mov(q):
    return SimpleNamespace(shares_quantity=q, created_at=datetime(2026, 1, 1))


def run_sync(db, allow=False):
    disc = []

    async def go():
        # corta antes de los pasos 2-4 (mercado y recalibrado): solo interesa el bloque de contratos
        class Stop(Exception):
            pass
        try:
            await ShareMarketService.sync_legacy_shares_for_user(db, 1, allow_reductions=allow, discrepancies=disc)
        except Exception:
            pass
    asyncio.run(go())
    return disc


def test_frozen_ignora_edicion_del_paquete():
    # Se otorgaron 20; el paquete hoy dice 2 (editado): no se resta ni se borra, ni con allow_reductions
    db = FakeDB([inv(1, 20, 2)], {1: [mov(20)]})
    run_sync(db)
    assert db.deleted == [] and not [a for a in db.added if isinstance(a, ShareMovement)]
    run_sync(db, allow=True)
    assert db.deleted == []  # 20 == frozen: nada que ajustar aunque el paquete diga 2


def test_frozen_desconocido_con_asientos_nunca_resta():
    db = FakeDB([inv(1, None, 2)], {1: [mov(20)]})
    disc = run_sync(db, allow=True)
    assert db.deleted == []
    assert disc and disc[0]["kind"] == "frozen_unknown"


def test_frozen_desconocido_sin_asientos_acredita_y_estampa():
    i = inv(1, None, 18)
    db = FakeDB([i], {1: []})
    disc = run_sync(db)
    added = [a for a in db.added if isinstance(a, ShareMovement)]
    assert len(added) == 1 and added[0].shares_quantity == 18
    assert i.shares_granted_frozen == 18
    assert disc[0]["kind"] == "legacy_credit"


def test_frozen_con_faltante_solo_acredita_la_diferencia():
    db = FakeDB([inv(1, 20, 2)], {1: [mov(15)]})
    run_sync(db)
    added = [a for a in db.added if isinstance(a, ShareMovement)]
    assert [a.shares_quantity for a in added] == [5] and db.deleted == []


def test_sync_no_reescribe_paquetes():
    import inspect
    src = inspect.getsource(ShareMarketService.sync_all_users_legacy_shares)
    assert "UPDATE packages" not in src


def test_regla_paquete_50k():
    assert normalize_package_shares(50000, 25) == 0
    assert normalize_package_shares(100000, 25) == 25
    assert normalize_package_shares(50000, 0) == 0


def test_backfill_plan_idempotente_y_sin_adivinar():
    spec = importlib.util.spec_from_file_location(
        "bf", os.path.join(os.path.dirname(__file__), "..", "scripts", "backfill_shares_granted_frozen.py"))
    bf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bf)
    rows = bf.plan_backfill([(1, None), (2, None), (3, 5), (4, None)], {1: 20, 3: 99, 4: 7}, {1: 2, 2: 2, 3: 2, 4: 7}, exclude=[4])
    acc = {r["investor_id"]: r["accion"] for r in rows}
    assert acc == {1: "congelar", 2: "sin_asientos_queda_NULL", 3: "ya_congelado", 4: "excluido"}
    assert rows[0]["valor_congelado"] == 20 and rows[0]["deriva"] is True
