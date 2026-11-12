from typing import Optional, Any, Dict
from pydantic import BaseModel

# Prioridades del módulo de tickets, en el orden en que se muestran.
# Las claves son los valores que entiende el sistema externo Glointtickeds.
TICKET_PRIORITIES: Dict[str, str] = {
    "low": "Baja",
    "medium": "Media (Normal)",
    "high": "Alta",
    "urgent": "Crítica",
}
DEFAULT_TICKET_PRIORITY = "medium"

# Valores que enviaban versiones anteriores del formulario (web o móvil).
_PRIORITY_ALIASES: Dict[str, str] = {
    "baja": "low",
    "normal": "medium",
    "media": "medium",
    "alta": "high",
    "critical": "urgent",
    "critica": "urgent",
    "crítica": "urgent",
    "urgente": "urgent",
}


def normalize_ticket_priority(raw: Optional[str]) -> str:
    """Devuelve una de las cuatro prioridades válidas o lanza ValueError."""
    cleaned = str(raw or "").strip().lower()
    if not cleaned:
        return DEFAULT_TICKET_PRIORITY
    cleaned = _PRIORITY_ALIASES.get(cleaned, cleaned)
    if cleaned not in TICKET_PRIORITIES:
        allowed = ", ".join(TICKET_PRIORITIES.values())
        raise ValueError(f"Prioridad inválida: '{raw}'. Opciones: {allowed}.")
    return cleaned

class TicketCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: str

class TicketResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None
