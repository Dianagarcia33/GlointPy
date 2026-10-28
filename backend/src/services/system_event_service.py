from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
from typing import List
import calendar
from datetime import datetime
from zoneinfo import ZoneInfo

from src.models.system_event import SystemEvent
from src.schemas.system_event import SystemEventCreate, SystemEventUpdate

LOCAL_TZ = ZoneInfo("America/Bogota")

# Tipos que entienden los motores de retiros y de venta de acciones (más alias históricos).
# Un tipo fuera de esta lista nunca abriría ninguna ventana (H-133).
WITHDRAWAL_EVENT_TYPES = ["retiro", "retiros", "withdrawal", "withdrawals", "fechas_retiro"]
SHARES_SALE_EVENT_TYPES = ["mercado_acciones", "venta_acciones", "shares_sale", "mercado_de_acciones", "venta_de_acciones"]
ALLOWED_EVENT_TYPES = set(WITHDRAWAL_EVENT_TYPES + SHARES_SALE_EVENT_TYPES + ["mantenimiento"])


def normalize_event_type(value: str) -> str:
    """Forma comparable de un tipo: sin tildes ni mayúsculas, con espacios y guiones como '_' (H-193).
    Así 'Mercado Acciones', 'mercado-acciones' o 'MERCADO_ACCIONES' abren la misma ventana."""
    import re
    import unicodedata
    text = unicodedata.normalize("NFKD", (value or "").strip().lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "_", text).strip("_")


def _to_local(dt: datetime) -> datetime:
    return dt.replace(tzinfo=LOCAL_TZ) if dt.tzinfo is None else dt.astimezone(LOCAL_TZ)


def validate_event_data(data: dict) -> dict:
    """
    Valida un evento completo (H-133) y devuelve los datos normalizados: tipo del catálogo,
    días obligatorios si es recurrente y fechas obligatorias con fin posterior al inicio si no lo es.
    Los campos de la otra modalidad se dejan en None para que el motor no los evalúe.
    """
    def fail(msg: str):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=msg)

    event_type = (data.get("type") or "").strip().lower()
    if event_type not in ALLOWED_EVENT_TYPES:
        fail("Tipo de evento no válido. Usa Retiro, Mercado de Acciones o Mantenimiento.")
    data["type"] = event_type

    if data.get("is_recurring"):
        if not data.get("recurrence_start_day") or not data.get("recurrence_end_day"):
            fail("Un evento recurrente necesita el día de inicio y el día de fin (entre 1 y 31).")
        data["start_date"] = None
        data["end_date"] = None
    else:
        start, end = data.get("start_date"), data.get("end_date")
        if not start or not end:
            fail("Un evento de fecha específica necesita la fecha y hora de inicio y de fin.")
        if _to_local(end) <= _to_local(start):
            fail("La fecha de fin debe ser posterior a la fecha de inicio.")
        data["recurrence_start_day"] = None
        data["recurrence_end_day"] = None
    return data

class SystemEventService:
    @staticmethod
    async def get_all_events(db: AsyncSession) -> List[SystemEvent]:
        result = await db.execute(select(SystemEvent))
        return result.scalars().all()

    @staticmethod
    async def create_event(db: AsyncSession, event_in: SystemEventCreate) -> SystemEvent:
        new_event = SystemEvent(**validate_event_data(event_in.model_dump()))
        db.add(new_event)
        await db.commit()
        await db.refresh(new_event)
        return new_event

    @staticmethod
    async def update_event(db: AsyncSession, event_id: int, event_in: SystemEventUpdate) -> SystemEvent:
        result = await db.execute(select(SystemEvent).where(SystemEvent.id == event_id))
        event = result.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
        
        # Se valida el evento tal como quedará (datos actuales + cambios), no solo los campos enviados
        fields = ["type", "is_recurring", "recurrence_start_day", "recurrence_end_day", "start_date", "end_date"]
        merged = {f: getattr(event, f) for f in fields}
        update_data = event_in.model_dump(exclude_unset=True)
        merged.update({k: v for k, v in update_data.items() if k in fields})
        update_data.update(validate_event_data(merged))
        for field, value in update_data.items():
            setattr(event, field, value)
            
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def delete_event(db: AsyncSession, event_id: int):
        result = await db.execute(select(SystemEvent).where(SystemEvent.id == event_id))
        event = result.scalar_one_or_none()
        if not event:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evento no encontrado")
            
        await db.delete(event)
        await db.commit()

    @staticmethod
    def is_event_instance_active(event: SystemEvent, now_local: datetime = None) -> bool:
        """
        Evalúa si una instancia de SystemEvent ya cargada en memoria está activa en el instante dado,
        sin realizar consultas adicionales a la base de datos.
        """
        if not event or not getattr(event, 'is_active', True):
            return False

        if now_local is None:
            now_local = datetime.now(LOCAL_TZ)
        current_day = now_local.day

        # 1. Evaluate Recurrence
        if event.is_recurring:
            if event.recurrence_start_day and event.recurrence_end_day:
                # Un día que no existe en el mes actual (p. ej. 30 en febrero) se toma como el último
                # día del mes; si no, la ventana del día 30 nunca abriría en febrero (H-135)
                last_day = calendar.monthrange(now_local.year, now_local.month)[1]
                start_day = min(event.recurrence_start_day, last_day)
                end_day = min(event.recurrence_end_day, last_day)
                if start_day <= end_day:
                    if start_day <= current_day <= end_day:
                        return True
                else:
                    if current_day >= start_day or current_day <= end_day:
                        return True

        # 2. Evaluate Specific Date Range
        if event.start_date and event.end_date:
            start = event.start_date
            if start.tzinfo is None:
                start = start.replace(tzinfo=LOCAL_TZ)
            else:
                start = start.astimezone(LOCAL_TZ)
                
            end = event.end_date
            if end.tzinfo is None:
                end = end.replace(tzinfo=LOCAL_TZ)
            else:
                end = end.astimezone(LOCAL_TZ)

            if start <= now_local <= end:
                return True

        return False

    @staticmethod
    async def is_any_event_active(db: AsyncSession, event_types: List[str]) -> bool:
        """True si alguno de los tipos indicados (p. ej. un tipo y sus alias) tiene una ventana activa."""
        for event_type in event_types:
            if await SystemEventService.is_event_active(db, event_type):
                return True
        return False

    @staticmethod
    async def is_event_active(db: AsyncSession, event_type: str) -> bool:
        """
        Check if a specific system event type is currently active, 
        evaluating recurrences and start/end dates using the local timezone.
        """
        result = await db.execute(
            select(SystemEvent).where(SystemEvent.is_active == True)
        )
        wanted = normalize_event_type(event_type)
        # H-193: se compara el tipo normalizado, para que eventos guardados con otra grafía también cuenten
        events = [e for e in result.scalars().all() if normalize_event_type(e.type) == wanted]
        if not events:
            return False

        now_local = datetime.now(LOCAL_TZ)
        for event in events:
            if SystemEventService.is_event_instance_active(event, now_local):
                return True

        return False
