"""H-65: registro genérico automático de toda petición autenticada que modifica datos.

Middleware ASGI puro (no BaseHTTPMiddleware): no lee el cuerpo ni la cadena de consulta, no
rompe subidas/streaming y escribe en `audit_logs` DESPUÉS de responder, con cola en memoria y
sesión propia. Un fallo del registro nunca afecta a la petición.
Guarda solo: actor, método, plantilla de ruta, código, IP, user agent. Nunca cuerpo ni cabeceras.
"""
import asyncio
import logging
import os
import re
import time
from typing import Dict, List, Optional, Tuple

from jose import jwt

from src.core.audit_context import audit_request_ctx
from src.core.config import settings

logger = logging.getLogger("src.audit")

WRITE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
API_PREFIX = "/api/v1"
QUEUE_MAX = 5000
BATCH_SIZE = 50
BATCH_SECONDS = 1.0
USER_CACHE_TTL = 600
USER_CACHE_MAX = 2000

# (método, plantilla de ruta SIN el prefijo /api/v1): ruido o consultas disfrazadas de POST.
# Las plantillas con "*" al final excluyen por prefijo.
EXCLUDED_ROUTES = {
    ("POST", "/rooms/{room_id}/read"),
    ("POST", "/register-token"), ("POST", "/unregister-token"),
    ("POST", "/notifications/register-token"), ("POST", "/notifications/unregister-token"),
    ("POST", "/notifications/devices"), ("POST", "/notifications/devices/register"),
    ("POST", "/notifications/devices/unregister"),
    ("POST", "/notifications/mark-read/{notification_id}"), ("POST", "/notifications/mark-all-read"),
    ("POST", "/crm/emails/{email_id}/read"), ("POST", "/crm/emails/{email_id}/toggle-read"),
    ("POST", "/crm/emails/read-all"), ("POST", "/crm/emails/{email_id}/star"),
    ("POST", "/crm/emails/sync"), ("POST", "/crm/calendar/sync"),
    ("POST", "/audit/investments/{investment_id}/calculate-yield"),
    ("POST", "/audit/users/{user_id}/calculate-yields"),
    ("POST", "/audit/bulk-calculate-yields"),
    ("POST", "/wallets/transfer/verify-recipient"),
    ("POST", "/commercial/check-client"),
    ("POST", "/sarlaft/check"),
    ("POST", "/technical-test/run"),
    ("POST", "/webhooks/*"), ("POST", "/auth/public/*"), ("POST", "/tickets/webhook"),
}
# Fragmentos de plantilla por prefijo (rutas cuyo prefijo del router varía): se comparan por sufijo.
EXCLUDED_SUFFIXES = (
    "/rooms/{room_id}/read",
    "/{email_id}/read", "/{email_id}/toggle-read", "/read-all", "/{email_id}/star",
    "/mark-read/{notification_id}", "/mark-all-read",
    "/register-token", "/unregister-token", "/devices", "/devices/register", "/devices/unregister",
    "/calculate-yield", "/calculate-yields", "/bulk-calculate-yields",
    "/transfer/verify-recipient", "/check-client", "/check-variables", "/preview", "/sarlaft/check",
    "/technical-test/run", "/public/contact-form", "/public/chatbot-lead", "/public/chatbot-message",
    "/public/external-form", "/register-public",
)

_ID_SEGMENT = re.compile(r"^(?:\d+|[0-9a-fA-F-]{16,}|[A-Za-z0-9_\-]{32,})$")

_queue: Optional["asyncio.Queue"] = None
_worker: Optional["asyncio.Task"] = None
_dropped = 0
_user_cache: Dict[int, Tuple[float, Optional[str], Optional[str]]] = {}


def is_enabled() -> bool:
    return os.getenv("AUDIT_HTTP_WRITES_ENABLED", "true").strip().lower() not in ("0", "false", "no", "off")


def _is_excluded(method: str, route: str) -> bool:
    if (method, route) in EXCLUDED_ROUTES:
        return True
    for m, tpl in EXCLUDED_ROUTES:
        if m == method and tpl.endswith("*") and route.startswith(tpl[:-1]):
            return True
    return method == "POST" and route.endswith(EXCLUDED_SUFFIXES)


def _headers(scope) -> Dict[bytes, bytes]:
    return {k.lower(): v for k, v in scope.get("headers", [])}


def _actor(scope) -> Optional[Tuple[int, Optional[str]]]:
    """(user_id, imp_by) del JWT firmado de la cookie `access_token` o `Authorization: Bearer`."""
    h = _headers(scope)
    token = None
    for part in h.get(b"cookie", b"").decode("latin-1").split(";"):
        k, _, v = part.strip().partition("=")
        if k == "access_token" and v:
            token = v
            break
    if not token:
        auth = h.get(b"authorization", b"").decode("latin-1")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        uid = int(payload.get("sub"))
    except Exception:
        return None
    imp = payload.get("imp_by")
    return uid, (str(imp) if imp is not None else None)


def _template(scope) -> str:
    route = scope.get("route")
    tpl = getattr(route, "path_format", None) or getattr(route, "path", None)
    if tpl:
        path = tpl
    else:
        path = scope.get("path", "")
    if path.startswith(API_PREFIX):
        path = path[len(API_PREFIX):]
    if not tpl:
        path = "/".join("{id}" if _ID_SEGMENT.match(seg) else seg for seg in path.split("/"))
    return path[:300] or "/"


def _client_ip(scope) -> Optional[str]:
    fwd = _headers(scope).get(b"x-forwarded-for", b"").decode("latin-1")
    if fwd:
        return fwd.split(",")[0].strip()[:50] or None
    client = scope.get("client")
    return str(client[0])[:50] if client else None


def build_entry(scope, actor: Tuple[int, Optional[str]], status_code: int) -> Optional[dict]:
    method = scope.get("method", "")
    route = _template(scope)
    if _is_excluded(method, route):
        return None
    segs = [s for s in route.split("/") if s]
    module = segs[0] if segs and not segs[0].startswith("{") else "general"
    params = [str(v) for k, v in (scope.get("path_params") or {}).items() if k.endswith("_id") or k == "id"]
    ua = _headers(scope).get(b"user-agent", b"").decode("latin-1")
    return {
        "user_id": actor[0],
        "action": "HTTP_WRITE",
        "module": module[:50],
        "entity_id": params[0][:100] if len(params) == 1 else None,
        "description": f"{method} {route} → {status_code}"[:500],
        "details": {
            "method": method, "route": route, "status_code": status_code,
            "impersonated_by": actor[1],
        },
        "ip_address": _client_ip(scope),
        "user_agent": ua[:300] or None,
        "status": "SUCCESS" if status_code < 400 else "FAILED",
    }


def enqueue(entry: dict) -> None:
    global _queue, _worker, _dropped
    try:
        if _queue is None:
            _queue = asyncio.Queue(maxsize=QUEUE_MAX)
        if _worker is None or _worker.done():
            _worker = asyncio.get_running_loop().create_task(_run_worker(_queue))
        _queue.put_nowait(entry)
    except asyncio.QueueFull:
        _dropped += 1
        if _dropped % 100 == 1:
            logger.warning("[Audit] cola llena, registros genéricos descartados: %s", _dropped)
    except Exception as e:  # nunca romper la petición
        logger.warning("[Audit] no se pudo encolar: %s", e)


async def _resolve_names(db, ids) -> None:
    from sqlalchemy import select
    from src.models.user import User
    now = time.time()
    missing = [i for i in ids if i is not None and (i not in _user_cache or now - _user_cache[i][0] > USER_CACHE_TTL)]
    if not missing:
        return
    if len(_user_cache) > USER_CACHE_MAX:
        _user_cache.clear()
    try:
        res = await db.execute(select(User.id, User.name, User.email).where(User.id.in_(missing)))
        for uid, name, email in res.all():
            _user_cache[uid] = (now, name, email)
    except Exception as e:
        logger.warning("[Audit] no se pudo resolver nombre de usuario: %s", e)


async def _write_batch(batch: List[dict]) -> None:
    from src.core.database import async_session_maker
    from src.models.audit_log import AuditLog
    try:
        async with async_session_maker() as db:
            await _resolve_names(db, {e["user_id"] for e in batch})
            rows = []
            for e in batch:
                cached = _user_cache.get(e["user_id"])
                rows.append(AuditLog(user_name=cached[1] if cached else None,
                                     user_email=cached[2] if cached else None, **e))
            db.add_all(rows)
            await db.commit()
    except Exception as e:
        logger.warning("[Audit] error escribiendo %s registros genéricos: %s", len(batch), e)


async def _run_worker(queue: "asyncio.Queue") -> None:
    while True:
        batch = [await queue.get()]
        deadline = time.time() + BATCH_SECONDS
        while len(batch) < BATCH_SIZE:
            timeout = deadline - time.time()
            if timeout <= 0:
                break
            try:
                batch.append(await asyncio.wait_for(queue.get(), timeout))
            except asyncio.TimeoutError:
                break
        await _write_batch(batch)


class AuditWriteMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if (scope["type"] != "http" or scope.get("method") not in WRITE_METHODS
                or not scope.get("path", "").startswith(API_PREFIX) or not is_enabled()):
            return await self.app(scope, receive, send)
        actor = _actor(scope)
        if actor is None:
            return await self.app(scope, receive, send)

        ctx: dict = {"detailed": False}
        token = audit_request_ctx.set(ctx)
        state = {"status": 500}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                state["status"] = message["status"]
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            audit_request_ctx.reset(token)
            try:
                code = state["status"]
                if code != 401 and not ctx["detailed"]:
                    entry = build_entry(scope, actor, code)
                    if entry:
                        enqueue(entry)
            except Exception as e:
                logger.warning("[Audit] fallo preparando registro genérico: %s", e)
