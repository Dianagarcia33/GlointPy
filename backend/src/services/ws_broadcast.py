"""
Envío a muchas conexiones WebSocket a la vez, sin que una lenta o caída frene a las demás.

Antes el envío era uno por uno: con 200 asistentes el tiempo crecía con cada conexión y un cliente con la red mala
retrasaba a todos. Ahora se envía en paralelo y cada envío tiene un tiempo máximo; la conexión que no responde se descarta
(el cliente se reconecta solo y vuelve a pedir lo que se perdió).
"""
import asyncio
from typing import Callable, Iterable, Tuple

SEND_TIMEOUT_SECONDS = 2.0


async def _send_one(ws, payload: dict, on_fail: Callable) -> None:
    try:
        await asyncio.wait_for(ws.send_json(payload), SEND_TIMEOUT_SECONDS)
    except Exception:
        on_fail(ws)


async def send_many(targets: Iterable[Tuple[object, dict]], on_fail: Callable) -> None:
    """Envía a cada (conexión, mensaje) en paralelo."""
    jobs = [_send_one(ws, payload, on_fail) for ws, payload in targets]
    if jobs:
        await asyncio.gather(*jobs)
