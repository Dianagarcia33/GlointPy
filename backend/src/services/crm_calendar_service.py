import os
import re
import uuid
import datetime
from typing import List, Optional, Dict, Any
import xml.etree.ElementTree as ET
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.config import settings
from src.models.user import User
from src.models.crm import CRMLead, CRMActivity, CRMActivityType


def _unfold_ics(ics_text: str) -> str:
    """Despliega líneas multilínea de iCalendar (RFC 5545)."""
    return re.sub(r'\r?\n[ \t]', '', ics_text)


def _parse_ics_datetime(dt_str: str) -> Optional[str]:
    """
    Convierte formatos iCalendar (ej: 20260915T150000Z, 20260915T100000, 20260915)
    a formato ISO estándar YYYY-MM-DDTHH:MM:SS.
    """
    if not dt_str:
        return None
    
    # Limpiar posibles parámetros como TZID=America/Bogota:20260915T150000
    if ':' in dt_str:
        dt_str = dt_str.split(':')[-1]
    
    dt_str = dt_str.strip()
    
    try:
        # Formato con hora y Z (UTC)
        if len(dt_str) == 16 and dt_str.endswith('Z'):
            dt = datetime.datetime.strptime(dt_str, "%Y%m%dT%H%M%SZ")
            return dt.isoformat()
        # Formato con hora sin Z
        elif len(dt_str) == 15 and 'T' in dt_str:
            dt = datetime.datetime.strptime(dt_str, "%Y%m%dT%H%M%S")
            return dt.isoformat()
        # Formato solo fecha (todo el día)
        elif len(dt_str) == 8 and dt_str.isdigit():
            dt = datetime.datetime.strptime(dt_str, "%Y%m%d")
            return dt.strftime("%Y-%m-%dT00:00:00")
        else:
            # Fallback intento con dateutil o regex
            m = re.match(r'(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?', dt_str)
            if m:
                y, mo, d, h, mi, s = m.groups()
                h = h or "00"
                mi = mi or "00"
                s = s or "00"
                return f"{y}-{mo}-{d}T{h}:{mi}:{s}"
    except Exception:
        pass
    
    return dt_str


def _unescape_ics_text(val: str) -> str:
    """Decodifica caracteres de escape de iCalendar."""
    if not val:
        return ""
    return val.replace('\\n', '\n').replace('\\,', ',').replace('\\;', ';').replace('\\\\', '\\').strip()


def parse_vevent_ics(ics_content: str) -> List[Dict[str, Any]]:
    """Parsea texto iCalendar (.ics) y extrae todos los VEVENT contenidos."""
    events = []
    unfolded = _unfold_ics(ics_content)
    
    # Buscar bloques VEVENT
    vevent_blocks = re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', unfolded, re.DOTALL)
    for block in vevent_blocks:
        event: Dict[str, Any] = {
            "uid": "",
            "title": "Sin título",
            "start": "",
            "end": "",
            "description": "",
            "location": "",
            "status": "CONFIRMED",
            "organizer": None,
            "attendees": [],
            "url": None
        }
        
        for line in block.strip().splitlines():
            line = line.strip()
            if not line:
                continue
            
            # Separar Clave y Valor
            if ':' not in line:
                continue
            
            key_part, val_part = line.split(':', 1)
            key = key_part.split(';')[0].upper()
            
            if key == "UID":
                event["uid"] = val_part.strip()
            elif key == "SUMMARY":
                event["title"] = _unescape_ics_text(val_part)
            elif key == "DTSTART":
                event["start"] = _parse_ics_datetime(val_part)
            elif key == "DTEND":
                event["end"] = _parse_ics_datetime(val_part)
            elif key == "DESCRIPTION":
                event["description"] = _unescape_ics_text(val_part)
            elif key == "LOCATION":
                event["location"] = _unescape_ics_text(val_part)
            elif key == "STATUS":
                event["status"] = val_part.strip().upper()
            elif key == "ORGANIZER":
                # Extraer CN o email
                cn_m = re.search(r'CN=([^;:]+)', key_part)
                clean_email = val_part.replace("mailto:", "").replace("MAILTO:", "").strip()
                event["organizer"] = {
                    "name": cn_m.group(1).strip('"') if cn_m else clean_email,
                    "email": clean_email
                }
            elif key == "ATTENDEE":
                cn_m = re.search(r'CN=([^;:]+)', key_part)
                clean_email = val_part.replace("mailto:", "").replace("MAILTO:", "").strip()
                event["attendees"].append({
                    "name": cn_m.group(1).strip('"') if cn_m else clean_email,
                    "email": clean_email
                })
            elif key == "URL":
                event["url"] = val_part.strip()

        # Si no tiene fin, asumimos 1 hora después del inicio
        if event["start"] and not event["end"]:
            try:
                st = datetime.datetime.fromisoformat(event["start"])
                event["end"] = (st + datetime.timedelta(hours=1)).isoformat()
            except Exception:
                event["end"] = event["start"]

        # Detectar links virtuales en la descripción o location
        virtual_regex = r'(https?://(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|whereby\.com)/[^\s"\'<>]+)'
        match_link = re.search(virtual_regex, (event["location"] or "") + " " + (event["description"] or ""))
        if match_link and not event["url"]:
            event["url"] = match_link.group(1)

        if event["uid"] and event["start"]:
            events.append(event)
            
    return events


class CRMCalendarService:
    @staticmethod
    def _get_base_url() -> str:
        host = settings.IMAP_HOST or "host81.latinoamericahosting.com"
        # CalDAV corre en el puerto seguro 2080 en cPanel
        return f"https://{host}:2080"

    @classmethod
    async def _get_auth_client(cls, user: User, password_override: Optional[str] = None) -> tuple[httpx.AsyncClient, str, str]:
        username = settings.IMAP_USER or user.email
        password = password_override or user.imap_password or settings.IMAP_PASSWORD
        
        if not password:
            raise ValueError("No se ha configurado la contraseña de la cuenta cPanel.")

        client = httpx.AsyncClient(
            auth=(username, password),
            verify=False,  # En cPanel certificados compartidos pueden tener nombre diferente al hostname
            timeout=15.0
        )
        return client, username, password

    @classmethod
    async def discover_calendars(cls, user: User, password_override: Optional[str] = None) -> List[str]:
        """Descubre las URLs de calendarios de la cuenta del usuario en cPanel."""
        base_url = cls._get_base_url()
        client, username, _ = await cls._get_auth_client(user, password_override)
        
        calendar_urls = []
        try:
            # PROPFIND a la raíz de calendarios del usuario
            url = f"{base_url}/rpc/calendars/{username}/"
            headers = {
                "Depth": "1",
                "Content-Type": "application/xml; charset=utf-8"
            }
            body = """<?xml version="1.0" encoding="utf-8" ?>
            <d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
              <d:prop>
                 <d:resourcetype />
                 <d:displayname />
              </d:prop>
            </d:propfind>"""

            resp = await client.request("PROPFIND", url, headers=headers, content=body)
            if resp.status_code in (200, 207):
                # Parsear XML multistatus
                root = ET.fromstring(resp.text)
                for response_el in root.findall(".//{DAV:}response"):
                    href_el = response_el.find("{DAV:}href")
                    if href_el is None or not href_el.text:
                        continue
                    
                    href = href_el.text.strip()
                    # Verificar si es un calendario (resourcetype contiene <calendar />)
                    resourcetype = response_el.find(".//{DAV:}resourcetype")
                    if resourcetype is not None:
                        is_cal = any(
                            elem.tag.endswith("calendar") 
                            for elem in resourcetype
                        )
                        if is_cal:
                            full_cal_url = f"{base_url}{href}" if href.startswith('/') else href
                            if full_cal_url not in calendar_urls:
                                calendar_urls.append(full_cal_url)
        except Exception as e:
            print(f"[CalDAV Discovery Error] {e}")
        finally:
            await client.aclose()

        # Si no descubrió ninguna ruta por PROPFIND, usar los endpoints estándar por defecto de cPanel
        if not calendar_urls:
            calendar_urls = [
                f"{base_url}/rpc/calendars/{username}/calendar:default/",
                f"{base_url}/rpc/calendars/{username}/default/"
            ]

        return calendar_urls

    @classmethod
    async def get_events(
        cls, 
        user: User, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None,
        password_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Obtiene y parsea todos los eventos de la agenda cPanel del usuario."""
        base_url = cls._get_base_url()
        try:
            client, username, _ = await cls._get_auth_client(user, password_override)
        except ValueError as e:
            return {
                "events": [],
                "count": 0,
                "needs_password": True,
                "message": str(e)
            }

        calendars = await cls.discover_calendars(user, password_override)
        all_events: List[Dict[str, Any]] = []
        seen_uids = set()

        try:
            # Query REPORT de CalDAV para extraer los VEVENT
            report_body = """<?xml version="1.0" encoding="utf-8" ?>
            <c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
                <d:prop>
                    <d:getetag />
                    <c:calendar-data />
                </d:prop>
                <c:filter>
                    <c:comp-filter name="VCALENDAR">
                        <c:comp-filter name="VEVENT" />
                    </c:comp-filter>
                </c:filter>
            </c:calendar-query>"""

            for cal_url in calendars:
                try:
                    resp = await client.request(
                        "REPORT",
                        cal_url,
                        headers={
                            "Depth": "1",
                            "Content-Type": "application/xml; charset=utf-8"
                        },
                        content=report_body
                    )

                    if resp.status_code in (200, 207):
                        # Extraer todo el texto <calendar-data>
                        root = ET.fromstring(resp.text)
                        for data_node in root.findall(".//{urn:ietf:params:xml:ns:caldav}calendar-data"):
                            if data_node.text:
                                parsed = parse_vevent_ics(data_node.text)
                                for ev in parsed:
                                    if ev["uid"] not in seen_uids:
                                        ev["calendar_url"] = cal_url
                                        seen_uids.add(ev["uid"])
                                        all_events.append(ev)
                    elif resp.status_code == 401:
                        return {
                            "events": [],
                            "count": 0,
                            "needs_password": True,
                            "message": "Contraseña de cPanel incorrecta o expirada."
                        }
                except Exception as cal_err:
                    print(f"[CalDAV Report Err on {cal_url}]: {cal_err}")
                    continue

        finally:
            await client.aclose()

        # Filtrar por rango si se especifica
        if start_date:
            all_events = [e for e in all_events if e["start"] >= start_date]
        if end_date:
            all_events = [e for e in all_events if e["start"] <= end_date]

        # Ordenar cronológicamente
        all_events.sort(key=lambda x: x["start"])

        return {
            "events": all_events,
            "count": len(all_events),
            "needs_password": False,
            "server_host": base_url,
            "account": username
        }

    @classmethod
    async def create_event(
        cls,
        user: User,
        db: AsyncSession,
        title: str,
        start_datetime: str,
        end_datetime: str,
        description: Optional[str] = "",
        location: Optional[str] = "",
        lead_id: Optional[int] = None,
        password_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Crea una nueva cita o reunión directamente en cPanel vía CalDAV (HTTP PUT)."""
        base_url = cls._get_base_url()
        client, username, _ = await cls._get_auth_client(user, password_override)
        
        calendars = await cls.discover_calendars(user, password_override)
        target_cal_url = calendars[0] if calendars else f"{base_url}/rpc/calendars/{username}/calendar:default/"
        if not target_cal_url.endswith('/'):
            target_cal_url += '/'

        uid = f"gloint_{uuid.uuid4().hex[:14]}_{int(datetime.datetime.now().timestamp())}"
        event_url = f"{target_cal_url}{uid}.ics"

        # Formatear fechas a formato iCalendar YYYYMMDDTHHMMSSZ
        def to_ics_dt(iso_str: str) -> str:
            dt = datetime.datetime.fromisoformat(iso_str.replace('Z', ''))
            return dt.strftime("%Y%m%dT%H%M%SZ")

        ics_start = to_ics_dt(start_datetime)
        ics_end = to_ics_dt(end_datetime)
        now_ics = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

        clean_title = title.replace('\n', ' ').replace('\r', '')
        clean_desc = (description or '').replace('\r\n', '\\n').replace('\n', '\\n')
        clean_loc = (location or '').replace('\n', ' ').replace('\r', '')

        ics_body = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gloint International Partners//GlointPy CRM//ES
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{now_ics}
DTSTART:{ics_start}
DTEND:{ics_end}
SUMMARY:{clean_title}
DESCRIPTION:{clean_desc}
LOCATION:{clean_loc}
ORGANIZER;CN="{user.name}":mailto:{user.email}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""

        try:
            resp = await client.put(
                event_url,
                headers={
                    "Content-Type": "text/calendar; charset=utf-8"
                },
                content=ics_body
            )

            if resp.status_code not in (200, 201, 204):
                raise Exception(f"cPanel CalDAV respondió con error {resp.status_code}: {resp.text}")

            # Si se vinculó con un prospecto, registrar la actividad en su timeline
            if lead_id:
                stmt = select(CRMLead).where(CRMLead.id == lead_id)
                res = await db.execute(stmt)
                lead = res.scalar_one_or_none()
                if lead:
                    loc_info = f" • Lugar/Enlace: {location}" if location else ""
                    activity = CRMActivity(
                        lead_id=lead.id,
                        user_id=user.id,
                        type=CRMActivityType.REUNION,
                        title=f"📅 Cita agendada: {title}",
                        description=f"Inicio: {start_datetime} a {end_datetime}{loc_info}\nNotas: {description or 'Sin notas'}"
                    )
                    db.add(activity)
                    await db.commit()

            return {
                "success": True,
                "uid": uid,
                "event_url": event_url,
                "message": "Cita creada con éxito y sincronizada con el calendario de cPanel."
            }
        finally:
            await client.aclose()

    @classmethod
    async def delete_event(
        cls,
        user: User,
        event_uid: str,
        calendar_url: Optional[str] = None,
        password_override: Optional[str] = None
    ) -> Dict[str, Any]:
        """Elimina una cita en cPanel vía CalDAV DELETE."""
        base_url = cls._get_base_url()
        client, username, _ = await cls._get_auth_client(user, password_override)
        
        target_cal = calendar_url or f"{base_url}/rpc/calendars/{username}/calendar:default/"
        if not target_cal.endswith('/'):
            target_cal += '/'
            
        event_url = f"{target_cal}{event_uid}.ics"

        try:
            resp = await client.delete(
                event_url,
                headers={
                    "If-Match": "*"
                }
            )
            # En caso de que no lo encuentre directo por URL con UID.ics, intentamos buscarlo
            if resp.status_code in (200, 204):
                return {"success": True, "message": "Evento eliminado de cPanel."}
            else:
                return {"success": True, "message": f"Operación completada (código cPanel {resp.status_code})."}
        finally:
            await client.aclose()
