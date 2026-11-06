"""
Vigencia de los contratos de inversión: regla única para todo el sistema (H-140).

    días del contrato = días del periodo - días acelerados (bonos por referido antiguos)
    fecha de fin      = fecha de ingreso + días del contrato (redondeado hacia arriba)

Es la base con la que el motor calcula el rendimiento diario (rendimiento total / días del
periodo) y con la que se calcularon los bonos por aceleración, así que la vigencia mostrada,
el estado "Finalizado", la liquidación y la liberación de capital cuadran con lo que se paga.

Los días acelerados pueden tener decimales (p. ej. 47,4): el contrato dura 134,6 días, termina
en el día 135 y el motor paga solo la fracción (0,6) del rendimiento del último día.
"""
import math
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import inspect as sa_inspect

from src.core.timezone import get_colombia_today


def applied_accelerations(investor) -> List:
    """Aceleraciones aplicadas ya cargadas en memoria (nunca dispara una carga perezosa en async)."""
    try:
        if "accelerations" in sa_inspect(investor).unloaded:
            return []
    except Exception:
        pass  # objetos que no son modelos (p. ej. esquemas Pydantic)
    return [a for a in (getattr(investor, "accelerations", None) or []) if getattr(a, "applied", False)]


def reduced_days(investor) -> Decimal:
    return sum((Decimal(str(a.days_to_reduce or 0)) for a in applied_accelerations(investor)), Decimal("0"))


def exact_contract_days(investor) -> Decimal:
    """Días de vigencia con decimales (días del periodo - días acelerados), nunca negativos."""
    period = getattr(investor, "period", None)
    if not period or not period.days:
        return Decimal("0")
    return max(Decimal("0"), Decimal(str(period.days)) - reduced_days(investor))


def contract_days(investor) -> int:
    """Días de vigencia completos: el último día puede ser parcial, por eso se redondea hacia arriba."""
    return math.ceil(exact_contract_days(investor))


def last_day_fraction(investor) -> Decimal:
    """Parte del último día que corresponde al contrato (1 si no hay fracción)."""
    exact = exact_contract_days(investor)
    frac = exact - Decimal(math.floor(exact))
    return frac if frac > 0 else Decimal("1")


def contract_start(investor) -> Optional[date]:
    start = getattr(investor, "start_date", None)
    if isinstance(start, datetime):
        return start.date()
    return start


def contract_end(investor) -> Optional[date]:
    start = contract_start(investor)
    if not start:
        return None
    return start + timedelta(days=contract_days(investor))


def is_contract_finished(investor, today: Optional[date] = None) -> bool:
    """Finalizado desde su fecha de fin, evaluado con la fecha de Colombia (no UTC, H-156)."""
    end = contract_end(investor)
    if not end:
        return False
    return (today or get_colombia_today()) >= end


def is_contract_active(investor, today: Optional[date] = None) -> bool:
    """Vigente = no finalizado. Única definición para Dashboard, Estado de Cuenta e Inversionistas (H-180)."""
    return not is_contract_finished(investor, today)
