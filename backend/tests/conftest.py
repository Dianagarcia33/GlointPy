"""Fixtures compartidas de las pruebas."""
import sys

import pytest


def _reiniciar_hubs_en_vivo() -> None:
    """
    Los hubs del evento en vivo (avisos y chat) son globales del proceso. Cada prueba corre en su propio bucle de eventos,
    así que lo que una deja pendiente (un aviso agrupado sin enviar, conexiones simuladas) no debe filtrarse a la siguiente.
    Solo se tocan si ya están cargados: las pruebas que no usan el evento no importan nada de más.
    """
    questions = sys.modules.get("src.services.event_question_service")
    if questions is not None:
        hub = questions.questions_hub
        hub.attendees.clear()
        hub.admins.clear()
        hub._pending.clear()
        hub._task = None
    chat = sys.modules.get("src.services.event_chat_service")
    if chat is not None:
        chat.chat_hub.attendees.clear()
        chat.chat_hub.admins.clear()
        chat.chat_hub._tasks.clear()
        chat._last_sent.clear()


@pytest.fixture(autouse=True)
def _aislar_hubs_en_vivo():
    _reiniciar_hubs_en_vivo()
    yield
    _reiniciar_hubs_en_vivo()
