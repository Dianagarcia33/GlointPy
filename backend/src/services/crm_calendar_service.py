import os
import re
import uuid
import html
import asyncio
import datetime
from typing import List, Optional, Dict, Any
import xml.etree.ElementTree as ET
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.core.config import settings
from src.models.user import User
from src.models.crm import CRMLead, CRMActivity, CRMActivityType
from src.core.timezone import BOGOTA_TZ, get_colombia_now

EMAIL_RE = re.compile(r"^[^@\s<>\"',;:]+@[^@\s<>\"',;:]+\.[^@\s<>\"',;:]+$")
MAX_ATTENDEES = 50

_DAYS_ES = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
_MONTHS_ES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
              "septiembre", "octubre", "noviembre", "diciembre"]

# Colombia no tiene horario de verano: una sola regla fija UTC-5
_VTIMEZONE_BOGOTA = """BEGIN:VTIMEZONE
TZID:America/Bogota
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:-0500
TZOFFSETTO:-0500
TZNAME:-05
END:STANDARD
END:VTIMEZONE"""


def _escape_ics_text(val: Optional[str]) -> str:
    """Escapa texto libre para iCalendar (RFC 5545 §3.3.11)."""
    if not val:
        return ""
    return (
        val.replace('\\', '\\\\')
        .replace(';', '\\;')
        .replace(',', '\\,')
        .replace('\r\n', '\\n')
        .replace('\n', '\\n')
        .replace('\r', '')
    )


def _clean_cn(name: Optional[str]) -> str:
    """Nombre apto para el parámetro CN: sin comillas ni separadores de iCalendar."""
    return re.sub(r'[";:,\r\n\\]', ' ', name or '').strip()


def _fold_ics_line(line: str) -> str:
    """Parte las líneas largas (máx. 75 octetos por RFC 5545) sin cortar caracteres multibyte."""
    out, current, size = [], "", 0
    for ch in line:
        ch_size = len(ch.encode("utf-8"))
        if size + ch_size > 73:
            out.append(current)
            current, size = " ", 1
        current += ch
        size += ch_size
    out.append(current)
    return "\r\n".join(out)


def _to_bogota_naive(iso_str: str) -> datetime.datetime:
    """Interpreta una fecha ISO como hora Colombia. Si trae zona, la convierte; si no, se asume local."""
    raw = (iso_str or "").strip()
    try:
        # Una 'Z' final se ignora: las citas de este módulo siempre viajan en hora local Colombia
        dt = datetime.datetime.fromisoformat(raw[:-1] if raw.endswith('Z') else raw)
    except ValueError:
        raise ValueError("La fecha u hora de la cita no es válida.")
    if dt.tzinfo is not None:
        dt = dt.astimezone(BOGOTA_TZ).replace(tzinfo=None)
    return dt


def normalize_attendees(raw: Optional[List[Any]], exclude_email: Optional[str] = None) -> List[Dict[str, str]]:
    """Valida y deduplica invitados. Cada uno queda como {"name", "email"}; el organizador se excluye."""
    result: List[Dict[str, str]] = []
    seen = set()
    if exclude_email:
        seen.add(exclude_email.strip().lower())
    for item in raw or []:
        if isinstance(item, dict):
            email, name = item.get("email"), item.get("name")
        else:
            email, name = getattr(item, "email", None), getattr(item, "name", None)
        email = (email or "").strip().lower()
        if not email:
            continue
        if not EMAIL_RE.match(email) or len(email) > 254:
            raise ValueError(f"El correo «{email}» no es válido.")
        if email in seen:
            continue
        seen.add(email)
        result.append({"name": (_clean_cn(name) or email)[:120], "email": email})
    if len(result) > MAX_ATTENDEES:
        raise ValueError(f"Una cita admite máximo {MAX_ATTENDEES} invitados.")
    return result


def build_event_ics(
    uid: str,
    title: str,
    start: datetime.datetime,
    end: datetime.datetime,
    organizer_name: str,
    organizer_email: str,
    description: Optional[str] = "",
    location: Optional[str] = "",
    url: Optional[str] = None,
    attendees: Optional[List[Dict[str, str]]] = None,
    sequence: int = 0,
    method: Optional[str] = None,
    modality: Optional[str] = None,
    room_id: Optional[int] = None,
) -> str:
    """
    Arma el .ics de una cita. Sirve tanto para guardarla en CalDAV (method=None) como para
    adjuntarla a un correo de invitación (REQUEST) o de cancelación (CANCEL).
    Las horas van en America/Bogota con su VTIMEZONE, así Gmail/Outlook las convierten bien.
    """
    now_ics = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    fmt = "%Y%m%dT%H%M%S"
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Gloint Group//GlointPy CRM//ES",
        "CALSCALE:GREGORIAN",
    ]
    if method:
        lines.append(f"METHOD:{method}")
    lines.extend(_VTIMEZONE_BOGOTA.splitlines())
    lines.extend([
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now_ics}",
        f"DTSTART;TZID=America/Bogota:{start.strftime(fmt)}",
        f"DTEND;TZID=America/Bogota:{end.strftime(fmt)}",
        f"SEQUENCE:{int(sequence)}",
        f"SUMMARY:{_escape_ics_text(title.replace(chr(10), ' ').replace(chr(13), ''))}",
        f"DESCRIPTION:{_escape_ics_text(description)}",
        f"LOCATION:{_escape_ics_text((location or '').replace(chr(10), ' ').replace(chr(13), ''))}",
    ])
    if url:
        lines.append(f"URL:{url.strip()}")
    lines.append(f'ORGANIZER;CN="{_clean_cn(organizer_name) or organizer_email}":mailto:{organizer_email}')
    for att in attendees or []:
        lines.append(
            f'ATTENDEE;CN="{_clean_cn(att.get("name")) or att["email"]}";ROLE=REQ-PARTICIPANT;'
            f'PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:{att["email"]}'
        )
    if modality:
        lines.append(f"X-GLOINT-MODALITY:{modality}")
    if room_id:
        lines.append(f"X-GLOINT-ROOM-ID:{int(room_id)}")
    lines.append(f"STATUS:{'CANCELLED' if method == 'CANCEL' else 'CONFIRMED'}")
    lines.extend(["END:VEVENT", "END:VCALENDAR"])
    return "\r\n".join(_fold_ics_line(l) for l in lines) + "\r\n"


def format_event_when(start: datetime.datetime, end: datetime.datetime) -> str:
    """Ej: «viernes 13 de noviembre de 2026, 10:00 a. m. – 11:00 a. m. (hora Colombia)»."""
    def hhmm(dt: datetime.datetime) -> str:
        hour12 = dt.hour % 12 or 12
        return f"{hour12}:{dt.minute:02d} {'a. m.' if dt.hour < 12 else 'p. m.'}"
    day = f"{_DAYS_ES[start.weekday()]} {start.day} de {_MONTHS_ES[start.month - 1]} de {start.year}"
    return f"{day}, {hhmm(start)} – {hhmm(end)} (hora Colombia)"


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
            "url": None,
            "sequence": 0,
            "modality": None,
            "room_id": None
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
            elif key == "SEQUENCE":
                event["sequence"] = int(val_part.strip()) if val_part.strip().isdigit() else 0
            elif key == "X-GLOINT-MODALITY":
                event["modality"] = val_part.strip().lower() or None
            elif key == "X-GLOINT-ROOM-ID":
                event["room_id"] = int(val_part.strip()) if val_part.strip().isdigit() else None

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
                                        ev["is_organizer"] = cls.is_organizer(user, ev)
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

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def is_organizer(user: User, event: Dict[str, Any]) -> bool:
        """
        El organizador es quien creó la cita y el único que puede editarla. Las citas sin
        organizador (creadas en el webmail) viven en el calendario propio y se tratan como propias.
        """
        organizer = event.get("organizer") or {}
        email = (organizer.get("email") or "").strip().lower()
        if not email:
            return True
        return email == (user.email or "").strip().lower()

    @classmethod
    def _resolve_event_url(cls, username: str, event_uid: str, calendar_url: Optional[str]) -> str:
        base_url = cls._get_base_url()
        target_cal = calendar_url or f"{base_url}/rpc/calendars/{username}/calendar:default/"
        # La URL llega del cliente: solo se aceptan calendarios del propio servidor CalDAV
        if not target_cal.startswith(f"{base_url}/"):
            raise ValueError("El calendario indicado no pertenece al servidor configurado.")
        if not target_cal.endswith('/'):
            target_cal += '/'
        if not re.match(r'^[A-Za-z0-9_.@-]+$', event_uid or ''):
            raise ValueError("Identificador de cita inválido.")
        return f"{target_cal}{event_uid}.ics"

    @staticmethod
    async def _fetch_event(client: httpx.AsyncClient, event_url: str) -> Optional[Dict[str, Any]]:
        """Lee una cita puntual del servidor CalDAV. None si no existe o no se puede leer."""
        try:
            resp = await client.get(event_url)
            if resp.status_code != 200:
                return None
            parsed = parse_vevent_ics(resp.text)
            return parsed[0] if parsed else None
        except Exception as e:
            print(f"[CalDAV Fetch Error] {e}")
            return None

    @staticmethod
    def _invitation_html(kind: str, organizer_name: str, title: str, when: str,
                         location: str, url: Optional[str], description: str) -> str:
        esc = html.escape
        heading, color, intro = {
            "invite": ("Invitación a reunión", "#0f766e", "te invitó a una reunión"),
            "update": ("Reunión actualizada", "#b45309", "actualizó los datos de la reunión"),
            "cancel": ("Reunión cancelada", "#be123c", "canceló la reunión"),
        }[kind]
        safe_url = url.strip() if url and re.match(r'^https?://', url.strip(), re.I) else None
        rows = [f'<p style="margin:4px 0;font-size:13px;color:#475569;">📅 {esc(when)}</p>']
        if location and location != safe_url:
            rows.append(f'<p style="margin:4px 0;font-size:13px;color:#475569;">📍 {esc(location)}</p>')
        if safe_url and kind != "cancel":
            rows.append(f'<p style="margin:4px 0;font-size:13px;color:#475569;">🎥 <a href="{esc(safe_url, quote=True)}" style="color:#0f766e;">{esc(safe_url)}</a></p>')
        button = ""
        if safe_url and kind != "cancel":
            button = (
                f'<p style="margin:20px 0 4px;"><a href="{esc(safe_url, quote=True)}" '
                f'style="display:inline-block;background:#059669;color:#ffffff;text-decoration:none;'
                f'font-weight:bold;font-size:14px;padding:11px 22px;border-radius:10px;">Unirse a la reunión</a></p>'
            )
        notes = ""
        if description and kind != "cancel":
            notes = (
                f'<p style="font-size:12px;font-weight:bold;color:#64748b;margin:16px 0 4px;">Notas</p>'
                f'<p style="font-size:13px;color:#334155;white-space:pre-wrap;margin:0;">{esc(description)}</p>'
            )
        footer = (
            "Adjuntamos el archivo de calendario para que la agregues a tu agenda."
            if kind != "cancel" else "Puedes eliminarla de tu agenda."
        )
        return f"""
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <h3 style="color: {color}; margin-top: 0; font-size: 18px;">{heading}</h3>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;"><strong>{esc(organizer_name)}</strong> {intro}:</p>
            <div style="background-color: #f8fafc; padding: 14px 18px; border-radius: 12px; border-left: 4px solid {color}; margin: 16px 0;">
                <p style="margin: 4px 0 8px; font-weight: bold; color: #0f172a; font-size: 15px;">{esc(title)}</p>
                {''.join(rows)}
            </div>
            {button}
            {notes}
            <p style="font-size: 12px; color: #94a3b8; margin: 20px 0 0;">{footer}</p>
        </div>
        """

    @classmethod
    async def _send_event_emails(
        cls,
        kind: str,
        user: User,
        recipients: List[Dict[str, str]],
        uid: str,
        title: str,
        start: datetime.datetime,
        end: datetime.datetime,
        description: str,
        location: str,
        url: Optional[str],
        all_attendees: List[Dict[str, str]],
        sequence: int,
        modality: Optional[str] = None,
    ) -> Dict[str, List[str]]:
        """Envía a cada destinatario el correo de invitación / actualización / cancelación con su .ics."""
        result: Dict[str, List[str]] = {"sent": [], "failed": []}
        if not recipients:
            return result
        from src.services.email_service import EmailService

        method = "CANCEL" if kind == "cancel" else "REQUEST"
        ics_text = build_event_ics(
            uid=uid, title=title, start=start, end=end,
            organizer_name=user.name, organizer_email=user.email,
            description=description, location=location, url=url,
            attendees=all_attendees, sequence=sequence, method=method, modality=modality,
        )
        subject_prefix = {"invite": "Invitación", "update": "Actualizada", "cancel": "Cancelada"}[kind]
        body = cls._invitation_html(
            kind, user.name, title, format_event_when(start, end), location or "", url, description or ""
        )
        attachment = {
            "filename": "invitacion.ics" if kind != "cancel" else "cancelacion.ics",
            "content": ics_text,
            "content_type": f"text/calendar; charset=utf-8; method={method}",
        }
        for rcpt in recipients:
            try:
                ok = await asyncio.to_thread(
                    EmailService.send_crm_custom_email,
                    to_email=rcpt["email"],
                    subject=f"{subject_prefix}: {title}",
                    html_content=body,
                    from_name=user.name,
                    reply_to_email=user.email,
                    attachments=[attachment],
                )
            except Exception as e:
                print(f"[Calendar Invitation Error] {rcpt['email']}: {e}")
                ok = False
            result["sent" if ok else "failed"].append(rcpt["email"])
        return result

    @classmethod
    async def _prepare_event_data(
        cls,
        user: User,
        db: AsyncSession,
        uid: str,
        title: str,
        start_datetime: str,
        end_datetime: str,
        description: Optional[str],
        location: Optional[str],
        attendees: Optional[List[Any]],
        meeting_url: Optional[str],
        room_id: Optional[int],
        organizer_email: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Valida los datos de la cita y deja lista (sin commit) la reserva de sala si es presencial.
        Devuelve lo necesario para armar el .ics.
        """
        from src.services.room_service import RoomService
        from src.schemas.room import RoomReservationCreate

        title = (title or "").strip()
        start = _to_bogota_naive(start_datetime)
        end = _to_bogota_naive(end_datetime)
        if end <= start:
            raise ValueError("La hora de fin debe ser posterior a la hora de inicio.")

        clean_attendees = normalize_attendees(attendees, exclude_email=organizer_email or user.email)
        meeting_url = (meeting_url or "").strip() or None
        location = (location or "").strip()
        description = (description or "").strip()

        if meeting_url and not re.match(r'^https?://\S+$', meeting_url, re.I):
            raise ValueError("El enlace de la reunión debe empezar por http:// o https://.")

        modality: Optional[str] = None
        if room_id:
            modality = "presencial"
            if len(title) < 3:
                raise ValueError("Para reservar una sala el título debe tener al menos 3 caracteres.")
            _, room = await RoomService.sync_calendar_reservation(
                db, user.id, uid,
                RoomReservationCreate(
                    room_id=room_id,
                    title=title[:150],
                    description=description or None,
                    start_time=start,
                    end_time=end,
                    attendees_count=len(clean_attendees) + 1,
                ),
            )
            location = f"{room.name} ({room.location})" if room.location else room.name
            meeting_url = None
        else:
            await RoomService.sync_calendar_reservation(db, user.id, uid, None)
            if meeting_url:
                modality = "virtual"
                location = location or meeting_url
            elif location:
                modality = "presencial"

        return {
            "title": title, "start": start, "end": end, "description": description,
            "location": location, "url": meeting_url, "attendees": clean_attendees,
            "modality": modality, "room_id": room_id or None,
        }

    # ------------------------------------------------------------------ crear / editar / eliminar

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
        password_override: Optional[str] = None,
        attendees: Optional[List[Any]] = None,
        meeting_url: Optional[str] = None,
        room_id: Optional[int] = None,
        organizer: Optional[Dict[str, Any]] = None,
        send_invitations: bool = True,
    ) -> Dict[str, Any]:
        """
        Crea una cita en cPanel vía CalDAV (HTTP PUT).
        - Si lleva sala (`room_id`), reserva la sala en el módulo de Salas; si la sala está ocupada no se crea nada.
        - Si lleva invitados, les envía la invitación por correo con el .ics (y el enlace si es virtual).
        - `organizer` solo se usa al aceptar una invitación ajena: conserva al organizador original,
          así quien fue invitado no puede editar la cita.
        """
        base_url = cls._get_base_url()
        client, username, _ = await cls._get_auth_client(user, password_override)

        try:
            calendars = await cls.discover_calendars(user, password_override)
            target_cal_url = calendars[0] if calendars else f"{base_url}/rpc/calendars/{username}/calendar:default/"
            if not target_cal_url.endswith('/'):
                target_cal_url += '/'

            uid = f"gloint_{uuid.uuid4().hex[:14]}_{int(datetime.datetime.now().timestamp())}"
            event_url = f"{target_cal_url}{uid}.ics"

            organizer_email = ((organizer or {}).get("email") or "").strip().lower() or user.email
            organizer_name = (organizer or {}).get("name") or (user.name if organizer_email == user.email else organizer_email)
            is_own = organizer_email.lower() == (user.email or "").lower()

            try:
                data = await cls._prepare_event_data(
                    user, db, uid, title, start_datetime, end_datetime, description, location,
                    attendees, meeting_url, room_id if is_own else None, organizer_email=organizer_email,
                )
                ics_body = build_event_ics(
                    uid=uid, title=data["title"], start=data["start"], end=data["end"],
                    organizer_name=organizer_name, organizer_email=organizer_email,
                    description=data["description"], location=data["location"], url=data["url"],
                    attendees=data["attendees"], modality=data["modality"], room_id=data["room_id"],
                )
                resp = await client.put(
                    event_url,
                    headers={"Content-Type": "text/calendar; charset=utf-8"},
                    content=ics_body.encode("utf-8"),
                )
                if resp.status_code not in (200, 201, 204):
                    raise Exception(f"cPanel CalDAV respondió con error {resp.status_code}: {resp.text}")
            except Exception:
                # Sin cita en el calendario no debe quedar la sala reservada
                await db.rollback()
                raise

            # Si se vinculó con un prospecto, registrar la actividad en su timeline
            if lead_id:
                stmt = select(CRMLead).where(CRMLead.id == lead_id)
                res = await db.execute(stmt)
                lead = res.scalar_one_or_none()
                if lead:
                    loc_info = f" • Lugar/Enlace: {data['location']}" if data["location"] else ""
                    activity = CRMActivity(
                        lead_id=lead.id,
                        user_id=user.id,
                        type=CRMActivityType.REUNION,
                        title=f"📅 Cita agendada: {data['title']}",
                        description=f"Inicio: {start_datetime} a {end_datetime}{loc_info}\nNotas: {data['description'] or 'Sin notas'}"
                    )
                    db.add(activity)
            await db.commit()

            invitations = {"sent": [], "failed": []}
            if send_invitations and is_own and data["attendees"]:
                invitations = await cls._send_event_emails(
                    "invite", user, data["attendees"], uid, data["title"], data["start"], data["end"],
                    data["description"], data["location"], data["url"], data["attendees"], 0, data["modality"],
                )

            message = "Cita creada con éxito y sincronizada con el calendario de cPanel."
            if data["room_id"]:
                message += " La sala quedó reservada."
            if invitations["failed"]:
                message += f" No se pudo enviar la invitación a: {', '.join(invitations['failed'])}."
            elif invitations["sent"]:
                message += f" Invitación enviada a {len(invitations['sent'])} persona(s)."

            return {
                "success": True,
                "uid": uid,
                "event_url": event_url,
                "calendar_url": target_cal_url,
                "location": data["location"],
                "url": data["url"],
                "modality": data["modality"],
                "room_id": data["room_id"],
                "attendees": data["attendees"],
                "invitations": invitations,
                "message": message,
            }
        finally:
            await client.aclose()

    @classmethod
    async def update_event(
        cls,
        user: User,
        db: AsyncSession,
        event_uid: str,
        title: str,
        start_datetime: str,
        end_datetime: str,
        description: Optional[str] = "",
        location: Optional[str] = "",
        calendar_url: Optional[str] = None,
        password_override: Optional[str] = None,
        attendees: Optional[List[Any]] = None,
        meeting_url: Optional[str] = None,
        room_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Edita una cita existente. Solo el organizador (quien la creó) puede hacerlo.
        Mueve o cancela la reserva de sala según corresponda y avisa a los invitados:
        invitación a los nuevos, actualización a los que siguen (si cambió fecha, lugar, enlace
        o título) y cancelación a los que se quitaron.
        """
        client, username, _ = await cls._get_auth_client(user, password_override)
        try:
            event_url = cls._resolve_event_url(username, event_uid, calendar_url)
            existing = await cls._fetch_event(client, event_url)
            if not existing:
                raise ValueError("No se encontró la cita en el calendario. Sincroniza e intenta de nuevo.")
            if not cls.is_organizer(user, existing):
                raise PermissionError("Solo quien creó la cita puede editarla.")

            sequence = int(existing.get("sequence") or 0) + 1
            try:
                data = await cls._prepare_event_data(
                    user, db, event_uid, title, start_datetime, end_datetime, description, location,
                    attendees, meeting_url, room_id,
                )
                ics_body = build_event_ics(
                    uid=event_uid, title=data["title"], start=data["start"], end=data["end"],
                    organizer_name=user.name, organizer_email=user.email,
                    description=data["description"], location=data["location"], url=data["url"],
                    attendees=data["attendees"], sequence=sequence,
                    modality=data["modality"], room_id=data["room_id"],
                )
                resp = await client.put(
                    event_url,
                    headers={"Content-Type": "text/calendar; charset=utf-8"},
                    content=ics_body.encode("utf-8"),
                )
                if resp.status_code not in (200, 201, 204):
                    raise Exception(f"cPanel CalDAV respondió con error {resp.status_code}: {resp.text}")
            except Exception:
                await db.rollback()
                raise
            await db.commit()

            # Avisos a invitados
            old_attendees = normalize_attendees(
                [a for a in (existing.get("attendees") or []) if EMAIL_RE.match((a.get("email") or "").strip().lower())],
                exclude_email=user.email,
            )
            old_emails = {a["email"] for a in old_attendees}
            new_emails = {a["email"] for a in data["attendees"]}
            added = [a for a in data["attendees"] if a["email"] not in old_emails]
            kept = [a for a in data["attendees"] if a["email"] in old_emails]
            removed = [a for a in old_attendees if a["email"] not in new_emails]

            relevant_change = (
                (existing.get("title") or "") != data["title"]
                or (existing.get("start") or "") != data["start"].isoformat()
                or (existing.get("end") or "") != data["end"].isoformat()
                or (existing.get("location") or "") != (data["location"] or "")
                or (data["url"] is not None and existing.get("url") != data["url"])
            )

            common = (event_uid, data["title"], data["start"], data["end"], data["description"],
                      data["location"], data["url"], data["attendees"], sequence, data["modality"])
            invitations = {"sent": [], "failed": []}
            batches = [("invite", added), ("cancel", removed)]
            if relevant_change:
                batches.append(("update", kept))
            for kind, rcpts in batches:
                res = await cls._send_event_emails(kind, user, rcpts, *common)
                invitations["sent"].extend(res["sent"])
                invitations["failed"].extend(res["failed"])

            message = "Cita actualizada."
            if invitations["failed"]:
                message += f" No se pudo avisar a: {', '.join(invitations['failed'])}."
            elif invitations["sent"]:
                message += f" Se avisó a {len(invitations['sent'])} persona(s)."

            return {
                "success": True,
                "uid": event_uid,
                "location": data["location"],
                "url": data["url"],
                "modality": data["modality"],
                "room_id": data["room_id"],
                "attendees": data["attendees"],
                "invitations": invitations,
                "message": message,
            }
        finally:
            await client.aclose()

    @classmethod
    async def delete_event(
        cls,
        user: User,
        event_uid: str,
        calendar_url: Optional[str] = None,
        password_override: Optional[str] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Elimina una cita en cPanel vía CalDAV DELETE.
        Si quien la elimina es el organizador, se cancela la reserva de sala ligada y se avisa a
        los invitados. Un invitado solo la quita de su propio calendario.
        """
        client, username, _ = await cls._get_auth_client(user, password_override)
        try:
            event_url = cls._resolve_event_url(username, event_uid, calendar_url)
            existing = await cls._fetch_event(client, event_url)

            resp = await client.delete(event_url, headers={"If-Match": "*"})
            if resp.status_code not in (200, 204):
                return {"success": True, "message": f"Operación completada (código cPanel {resp.status_code})."}

            message = "Evento eliminado de cPanel."
            if existing and cls.is_organizer(user, existing):
                if db is not None:
                    from src.services.room_service import RoomService
                    reservation = await RoomService.get_calendar_reservation(db, event_uid)
                    if reservation and reservation.user_id == user.id:
                        reservation.status = "cancelled"
                        reservation.cancelled_reason = "Cita cancelada desde el calendario"
                        await db.commit()
                        message += " Se liberó la sala reservada."

                attendees = normalize_attendees(
                    [a for a in (existing.get("attendees") or []) if EMAIL_RE.match((a.get("email") or "").strip().lower())],
                    exclude_email=user.email,
                )
                try:
                    start = datetime.datetime.fromisoformat(existing["start"])
                    end = datetime.datetime.fromisoformat(existing["end"])
                except Exception:
                    start = end = None
                # Solo se avisa si la reunión aún no ha pasado
                if attendees and start and end and end > get_colombia_now().replace(tzinfo=None):
                    res = await cls._send_event_emails(
                        "cancel", user, attendees, event_uid, existing.get("title") or "Reunión",
                        start, end, existing.get("description") or "", existing.get("location") or "",
                        existing.get("url"), attendees, int(existing.get("sequence") or 0) + 1,
                        existing.get("modality"),
                    )
                    if res["sent"]:
                        message += f" Se avisó de la cancelación a {len(res['sent'])} invitado(s)."
            return {"success": True, "message": message}
        finally:
            await client.aclose()
