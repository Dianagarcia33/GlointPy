"""H-65: reversión de la auditoría atómica en los flujos de nivel 1 ya publicados.

Por flujo: (1) si todo va bien hay UN solo commit y la fila de auditoría viaja en la misma transacción;
(2) si no se puede auditar, la operación NO se confirma y el error de la auditoría sube sin ocultarse.
Además, una prueba estructural comprueba que en cada punto de auditoría atómico la auditoría va antes del commit.
"""
import ast
import asyncio
import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

for _k, _v in {"DB_USER": "u", "DB_PASSWORD": "p", "DB_HOST": "localhost", "DB_PORT": "3306", "DB_NAME": "x"}.items():
    os.environ.setdefault(_k, _v)

import pytest

from src.models.audit_log import AuditLog

ADMIN = SimpleNamespace(id=1, name="Admin", email="admin@gloint.co")


class Res:
    def __init__(self, obj=None, many=None):
        self.obj, self.many = obj, many if many is not None else ([] if obj is None else [obj])

    def scalars(self):
        return self

    def first(self):
        return self.obj

    def all(self):
        return self.many

    def scalar_one_or_none(self):
        return self.obj

    def scalar(self):
        return self.obj


class Db:
    def __init__(self, *results, fail_audit=False):
        self.results, self.fail_audit = list(results), fail_audit
        self.events, self.added = [], []

    async def execute(self, *_a, **_k):
        return self.results.pop(0) if self.results else Res(None)

    def add(self, o):
        self.added.append(o)

    async def flush(self):
        if self.fail_audit and any(isinstance(o, AuditLog) for o in self.added):
            raise RuntimeError("audit_logs no disponible")
        self.events.append("flush")

    async def commit(self):
        self.events.append("commit")

    async def rollback(self):
        self.events.append("rollback")

    async def refresh(self, _o):
        pass

    async def delete(self, _o):
        self.events.append("delete")


def run(coro):
    return asyncio.run(coro)


def audit_rows(db):
    return [o for o in db.added if isinstance(o, AuditLog)]


def assert_atomic_ok(db, action):
    rows = audit_rows(db)
    assert [r.action for r in rows] == [action]
    # La auditoría se vacía (flush) ANTES del primer commit, que confirma operación + auditoría juntas.
    # (Las notificaciones posteriores al commit pueden hacer su propio commit: no son parte de la operación.)
    assert db.events.index("flush") < db.events.index("commit")
    assert "rollback" not in db.events


def assert_rolled_back(db, call):
    with pytest.raises(RuntimeError, match="audit_logs no disponible"):
        call()
    assert "commit" not in db.events


# ---------------------------------------------------------------- recargas de billetera
def _recharge(status="pending", amount="5000"):
    return SimpleNamespace(id=3, user_id=9, wallet_id=4, amount=Decimal(amount), status=status,
                           payment_method="Nequi", created_at=datetime(2026, 1, 1), admin_notes=None, reviewed_by=None, reviewed_at=None)


def test_rechazar_recarga():
    from src.api.v1.endpoints import wallets
    pay = wallets.RejectRechargeRequest(reason="Comprobante ilegible")
    db = Db(Res(_recharge()))
    run(wallets.reject_wallet_recharge_admin(3, pay, ADMIN, db))
    assert_atomic_ok(db, "WALLET_RECHARGE_REJECT")
    bad = Db(Res(_recharge()), fail_audit=True)
    assert_rolled_back(bad, lambda: run(wallets.reject_wallet_recharge_admin(3, pay, ADMIN, bad)))


def test_cancelar_recarga_propia():
    from src.api.v1.endpoints import wallets
    db = Db(Res(_recharge()))
    run(wallets.cancel_my_recharge(3, ADMIN, db))
    assert_atomic_ok(db, "WALLET_RECHARGE_CANCEL")
    bad = Db(Res(_recharge()), fail_audit=True)
    assert_rolled_back(bad, lambda: run(wallets.cancel_my_recharge(3, ADMIN, bad)))


def test_aprobar_recarga_acredita_saldo_y_audita_antes_del_commit():
    from src.api.v1.endpoints import wallets
    wallet = SimpleNamespace(id=4, user_id=9, balance=Decimal("1000"))
    db = Db(Res(_recharge()), Res(wallet), Res(None))
    run(wallets.approve_wallet_recharge_admin(3, None, ADMIN, db))
    assert wallet.balance == Decimal("6000")  # el resultado de la operación no cambia
    rows = audit_rows(db)
    assert [r.action for r in rows] == ["WALLET_RECHARGE_APPROVE"] and rows[0].details["saldo_despues"] == 6000.0
    assert db.events.index("commit") > db.events.index("flush")
    wallet2 = SimpleNamespace(id=4, user_id=9, balance=Decimal("1000"))
    bad = Db(Res(_recharge()), Res(wallet2), Res(None), fail_audit=True)
    assert_rolled_back(bad, lambda: run(wallets.approve_wallet_recharge_admin(3, None, ADMIN, bad)))


# ---------------------------------------------------------------- retiros masivos
def _withdrawal(estado):
    return SimpleNamespace(id=11, user_id=9, user=None, estado=estado, monto=Decimal("100000"), monto_neto=Decimal("96800"),
                           impuesto=Decimal("3200"), metodo_pago="Transferencia", banco="X", numero_cuenta="123", tipo_cuenta="A",
                           procesado_por=None, fecha_procesamiento=None, aprobado_por=None, fecha_aprobacion=None)


def test_retiros_masivos_procesar_y_aprobar():
    from src.models.withdrawal import WithdrawalStatus
    from src.services.withdrawal_service import WithdrawalService
    w = _withdrawal(WithdrawalStatus.PENDING)
    db = Db(Res(many=[w]))
    out = run(WithdrawalService.bulk_process_withdrawals(db, [11], 1, actor=ADMIN))
    assert out["processed_count"] == 1 and w.estado == WithdrawalStatus.PROCESSED
    assert_atomic_ok(db, "WITHDRAWAL_BULK_PROCESS")
    bad = Db(Res(many=[_withdrawal(WithdrawalStatus.PENDING)]), fail_audit=True)
    assert_rolled_back(bad, lambda: run(WithdrawalService.bulk_process_withdrawals(bad, [11], 1, actor=ADMIN)))

    w2 = _withdrawal(WithdrawalStatus.PENDING)
    db2 = Db(Res(many=[w2]))
    out2 = run(WithdrawalService.bulk_approve_withdrawals(db2, [11], 1, actor=ADMIN))
    assert out2["approved_count"] == 1 and w2.estado == WithdrawalStatus.APPROVED
    assert_atomic_ok(db2, "WITHDRAWAL_BULK_APPROVE")
    bad2 = Db(Res(many=[_withdrawal(WithdrawalStatus.PENDING)]), fail_audit=True)
    assert_rolled_back(bad2, lambda: run(WithdrawalService.bulk_approve_withdrawals(bad2, [11], 1, actor=ADMIN)))


# ---------------------------------------------------------------- solicitudes de inversión
def test_rechazar_solicitud_de_inversion_reembolsa_y_audita():
    from src.models.investment_request import InvestmentRequestStatus
    from src.services.investment_request_service import InvestmentRequestService

    def req():
        return SimpleNamespace(id=2, user_id=9, monto=Decimal("1000000"), status=InvestmentRequestStatus.pending,
                               extra_data={"monto_billetera_usado": 50000}, rejection_reason=None, reviewed_by=None, reviewed_at=None)

    wallet = SimpleNamespace(id=4, user_id=9, balance=Decimal("0"))
    db = Db(Res(req()), Res(wallet))
    run(InvestmentRequestService.reject_request(db, 2, 1, "Documentos incompletos", actor=ADMIN))
    assert wallet.balance == Decimal("50000.0")
    assert_atomic_ok(db, "INVESTMENT_REQUEST_REJECT")
    assert audit_rows(db)[0].details["reembolso_billetera"] == 50000.0
    bad = Db(Res(req()), Res(SimpleNamespace(id=4, user_id=9, balance=Decimal("0"))), fail_audit=True)
    assert_rolled_back(bad, lambda: run(InvestmentRequestService.reject_request(bad, 2, 1, "x", actor=ADMIN)))


# ---------------------------------------------------------------- precio de la acción
def test_cambio_de_precio_oficial(monkeypatch):
    from src.services.share_market_service import ShareMarketService

    async def price(_db):
        return 1000.0

    async def shares(_db):
        return 500

    monkeypatch.setattr(ShareMarketService, "get_current_price", staticmethod(price))
    monkeypatch.setattr(ShareMarketService, "get_current_available_shares", staticmethod(shares))
    db = Db()
    run(ShareMarketService.update_official_price(db, 1200.0, "Ajuste por valoración", 1, actor=ADMIN))
    assert_atomic_ok(db, "SHARE_PRICE_UPDATE")
    d = audit_rows(db)[0].details
    assert d["precio_antes"] == 1000.0 and d["precio_despues"] == 1200.0
    bad = Db(fail_audit=True)
    assert_rolled_back(bad, lambda: run(ShareMarketService.update_official_price(bad, 1200.0, "Ajuste por valoración", 1, actor=ADMIN)))


# ---------------------------------------------------------------- ventas comerciales
def test_anular_venta_comercial(monkeypatch):
    from src.api.v1.endpoints import commercial_sales as cs
    from src.models.commercial_sale import CommercialSaleStatus

    async def purge(*_a, **_k):
        return None

    monkeypatch.setattr(cs, "purge_ghost_bonuses", purge)

    def sale():
        return SimpleNamespace(id=5, commercial_id=7, amount=Decimal("1000"), commission_amount=Decimal("50"),
                               status=CommercialSaleStatus.pendiente, investor_id=None, sale_date="2026-01-01")

    db = Db(Res(sale()))
    run(cs.delete_commercial_sale(5, ADMIN, db))
    assert_atomic_ok(db, "COMMERCIAL_SALE_DELETE") and "delete" in db.events
    bad = Db(Res(sale()), fail_audit=True)
    assert_rolled_back(bad, lambda: run(cs.delete_commercial_sale(5, ADMIN, bad)))


# ---------------------------------------------------------------- usuarios
def _user(**kw):
    base = dict(id=5, email="ana.lopez@gloint.co", is_active=True, parent_user_id=None, roles=[], must_update_profile=False)
    base.update(kw)
    return SimpleNamespace(**base)


def test_editar_usuario_audita_antes_y_despues_sin_correo_completo(monkeypatch):
    from src.services.user_service import UserService
    user = _user()

    async def get(_db, _id):
        return user

    monkeypatch.setattr(UserService, "get_user_by_id", staticmethod(get))
    db = Db()
    run(UserService.update_user_admin(db, 5, {"is_active": True, "name": "Ana"}, actor=ADMIN))
    assert_atomic_ok(db, "USER_UPDATE")
    d = audit_rows(db)[0].details
    assert d["antes"]["email"] == "a***@gloint.co" and "ana.lopez" not in str(d)
    bad = Db(fail_audit=True)
    assert_rolled_back(bad, lambda: run(UserService.update_user_admin(bad, 5, {"name": "Ana"}, actor=ADMIN)))


def test_crear_usuario_no_guarda_la_contrasena_temporal(monkeypatch):
    from src.services.user_service import UserService
    created = _user(id=8)

    async def get(_db, _id):
        return created

    monkeypatch.setattr(UserService, "get_user_by_id", staticmethod(get))
    data = {"name": "Ana", "email": "ana.lopez@gloint.co"}
    db = Db(Res(None))
    run(UserService.create_user_admin(db, dict(data), actor=ADMIN))
    assert_atomic_ok(db, "USER_CREATE")
    text = str(audit_rows(db)[0].details)
    assert "ana.lopez" not in text and "password" not in text.lower().replace("contrasena_temporal", "")
    bad = Db(Res(None), fail_audit=True)
    assert_rolled_back(bad, lambda: run(UserService.create_user_admin(bad, dict(data), actor=ADMIN)))


def test_cambio_de_contrasena_sin_auditoria_no_cierra_sesiones(monkeypatch):
    from src.core.security import get_password_hash
    from src.services import chat_service
    from src.services.user_service import UserService
    cerrados = []

    async def registrar(user_id, reason="x"):
        cerrados.append(user_id)

    monkeypatch.setattr(chat_service.manager, "close_user_connections", registrar)
    u = SimpleNamespace(id=42, is_active=True, token_version=0, roles=[], is_superuser=False, name="Ana", email="a@x.co",
                        password_hash=get_password_hash("Actual123!"), must_change_password=False,
                        failed_login_attempts=0, locked_until=None)
    bad = Db(Res(u), fail_audit=True)
    assert_rolled_back(bad, lambda: run(UserService.change_password(bad, 42, "Actual123!", "Nueva456!")))
    assert cerrados == []  # no se cierran websockets si la operación no se confirmó


# ---------------------------------------------------------------- estructural: la auditoría va antes del commit
AUDITED = {
    "src/api/v1/endpoints/wallets.py": ["request_withdrawal", "cancel_my_withdrawal", "admin_adjust_wallet", "transfer_wallet_funds",
                                        "create_wallet_recharge", "cancel_my_recharge", "approve_wallet_recharge_admin", "reject_wallet_recharge_admin"],
    "src/api/v1/endpoints/investments.py": ["withdraw_investment_capital"],
    "src/api/v1/endpoints/investors.py": ["admin_withdraw_capital"],
    "src/api/v1/endpoints/audit.py": ["pay_investment_yield", "pay_user_yields", "create_user_wallet"],
    "src/api/v1/endpoints/commercial_sales.py": ["delete_commercial_sale", "settle_commissions"],
    "src/services/withdrawal_service.py": ["sync_wallet_debits", "bulk_process_withdrawals", "bulk_approve_withdrawals"],
    "src/services/investment_request_service.py": ["approve_request", "reject_request"],
    "src/services/investor_service.py": ["create_investor", "update_investor", "delete_investor"],
    "src/services/share_market_service.py": ["update_official_price", "buy_shares_instant", "create_surplus_trade_order", "admin_decide_trade",
                                             "create_issuance", "sync_all_users_legacy_shares", "manual_share_grant"],
    "src/services/commercial_sale_service.py": ["register_commercial_sale"],
    "src/services/purchase_order_service.py": ["approve_purchase_order"],
    "src/api/v1/endpoints/bank_accounts.py": ["create_my_bank_account", "update_my_bank_account", "delete_my_bank_account"],
    "src/api/v1/endpoints/sarlaft.py": ["set_user_sarlaft_status"],
    "src/api/v1/endpoints/auth.py": ["switch_to_child_account", "switch_back_to_parent"],
    "src/services/security_service.py": ["create_role", "delete_role", "sync_all_system_permissions"],
    "src/services/external_app_service.py": ["create_app", "update_app", "regenerate_api_key", "delete_app"],
    "src/services/user_service.py": ["create_user_admin", "update_user_admin", "change_password", "force_profile_update",
                                     "toggle_force_profile_update", "create_wallet_for_user"],
}


@pytest.mark.parametrize("path,names", AUDITED.items())
def test_la_auditoria_atomica_va_antes_del_commit(path, names):
    root = Path(__file__).resolve().parents[1]
    tree = ast.parse((root / path).read_text())
    funcs = {n.name: n for n in ast.walk(tree) if isinstance(n, (ast.AsyncFunctionDef, ast.FunctionDef))}
    for name in names:
        fn = funcs[name]
        audit_lines = [c.lineno for c in ast.walk(fn) if isinstance(c, ast.Await) and isinstance(c.value, ast.Call)
                       and getattr(c.value.func, "id", "") == "audit_in_tx"]
        commit_lines = [c.lineno for c in ast.walk(fn) if isinstance(c, ast.Await) and isinstance(c.value, ast.Call)
                        and getattr(c.value.func, "attr", "") == "commit"]
        assert audit_lines, f"{name}: no audita con audit_in_tx"
        assert commit_lines, f"{name}: no tiene commit"
        # cada commit posterior a la primera auditoría confirma también la auditoría; ninguno la precede sin auditar
        assert min(audit_lines) < max(commit_lines), f"{name}: la auditoría va después del último commit"
