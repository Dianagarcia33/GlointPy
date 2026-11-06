"""Estado SARLAFT de un usuario a partir de su último chequeo. Mismas reglas que usa la plataforma para bloquear inversiones."""
from typing import Dict, Optional

PENDING_STATES = {"pending", "processing", "procesando"}
FAILED_STATES = {"failed", "error"}
DONE_STATES = {"finalizado", "completed"}


def sarlaft_state(check) -> Dict[str, Optional[str]]:
    """
    - none:     nunca se ha verificado.
    - pending:  la verificación está en proceso o sin resolver.
    - rejected: falló, o tiene riesgo alto de listas restrictivas sin corregir por un oficial de cumplimiento.
    - approved: terminó y no quedó rechazada (incluye lo aprobado administrativamente).
    """
    if check is None:
        return {"status": "none", "risk_level": None}
    raw = str(check.tusdatos_status or "").lower()
    risk = check.risk_level
    if raw in PENDING_STATES:
        state = "pending"
    elif raw in FAILED_STATES or (risk == "HIGH" and not check.tusdatos_hallazgos_corregidos):
        state = "rejected"
    elif raw in DONE_STATES:
        state = "approved"
    else:
        state = "pending"
    return {"status": state, "risk_level": risk}
