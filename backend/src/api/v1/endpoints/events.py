from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.event import (
    EventPublicResponse,
    EventConfigUpdate,
    InvestorRsvpRequest,
    PublicRsvpRequest,
    AttendeeResponse,
    AdminEventSummaryResponse,
    EventAuthorizedDomainCreate,
    EventAuthorizedDomainUpdate,
    EventAuthorizedDomainResponse,
    DomainCheckResponse
)
from src.services.event_service import EventService
from fastapi import Request, Response

router = APIRouter()

@router.get("/active", response_model=EventPublicResponse)
async def get_active_event(db: AsyncSession = Depends(get_db)):
    """
    Ruta pública para consultar los datos del evento activo y la disponibilidad de cupos en tiempo real.
    """
    return await EventService.get_event_public_details(db)

@router.post("/register-public", response_model=AttendeeResponse)
async def register_public_attendee(
    rsvp_data: PublicRsvpRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ruta pública para registrar asistentes externos (no inversionistas) desde la página principal.
    """
    return await EventService.register_public(db, rsvp_data)

@router.post("/register-investor", response_model=AttendeeResponse)
async def register_investor_attendee(
    rsvp_data: InvestorRsvpRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta autenticada para que los inversionistas confirmen su asistencia en 1 clic
    utilizando la información ya almacenada en su cuenta.
    """
    return await EventService.register_investor(db, current_user, rsvp_data)

@router.get("/my-registration", response_model=Optional[AttendeeResponse])
async def get_my_event_registration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta autenticada para verificar si el usuario actual ya confirmó su asistencia.
    """
    return await EventService.get_my_registration(db, current_user.id)

@router.get("/admin/summary", response_model=AdminEventSummaryResponse)
async def get_admin_event_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para que administradores vean métricas de aforo y listado completo de asistentes.
    """
    return await EventService.get_admin_summary(db)

@router.put("/admin/config", response_model=EventPublicResponse)
async def update_event_configuration(
    config: EventConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para que administradores actualicen el aforo, fechas, ubicación y estado del banner.
    """
    return await EventService.update_event_config(db, config)

@router.delete("/admin/attendees/{attendee_id}")
async def cancel_attendee_registration(
    attendee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para cancelar un registro de asistencia y liberar el cupo.
    """
    await EventService.cancel_attendee(db, attendee_id)
    return {"message": "Registro de asistencia cancelado correctamente."}

# ==========================================
# GESTIÓN DE DOMINIOS AUTORIZADOS (ECOSISTEMA GLOINT)
# ==========================================

@router.get("/domains", response_model=List[EventAuthorizedDomainResponse])
async def get_authorized_domains(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Listar los dominios autorizados para desplegar el banner interactivo y registros de Gloint Power Tech.
    """
    return await EventService.get_authorized_domains(db)

@router.post("/domains", response_model=EventAuthorizedDomainResponse)
async def create_authorized_domain(
    data: EventAuthorizedDomainCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registrar un nuevo dominio autorizado en el ecosistema (ej. glointech.com.co).
    """
    return await EventService.create_authorized_domain(db, data)

@router.put("/domains/{domain_id}", response_model=EventAuthorizedDomainResponse)
async def update_authorized_domain(
    domain_id: int,
    data: EventAuthorizedDomainUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Actualizar permisos o estado de un dominio autorizado.
    """
    return await EventService.update_authorized_domain(db, domain_id, data)

@router.delete("/domains/{domain_id}")
async def delete_authorized_domain(
    domain_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Eliminar un dominio autorizado del ecosistema.
    """
    await EventService.delete_authorized_domain(db, domain_id)
    return {"message": "Dominio eliminado correctamente del ecosistema."}

@router.get("/domains/check", response_model=DomainCheckResponse)
async def check_domain_authorization(
    request: Request,
    domain: Optional[str] = None,
    api_key: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint público de handshake para widgets y aplicaciones externas.
    Valida si el origen, referer, dominio o API Key están autorizados para mostrar el banner o registro.
    """
    # Detect domain from origin or referer if not explicitly passed
    detected = domain
    if not detected:
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        detected = origin or referer or request.client.host

    return await EventService.check_domain_authorization(
        db=db,
        domain_or_origin=detected,
        api_key=api_key
    )

@router.get("/embed/banner.js")
async def get_embed_banner_script(request: Request):
    """
    Script JS dinámico para embeber el banner oficial de Gloint Power Tech
    en cualquier sitio web autorizado con solo insertar:
    <script src="https://api.gloint.com.co/api/v1/events/embed/banner.js" async></script>
    """
    base_url = str(request.base_url).rstrip("/")
    js_content = f"""/**
 * Gloint Power Tech - Official Embeddable Banner Widget
 * (c) Gloint Colombia. Todos los derechos reservados.
 */
(function() {{
  if (window.__gloint_banner_loaded) return;
  window.__gloint_banner_loaded = true;

  var API_BASE = "{base_url}/api/v1/events";
  var currentOrigin = window.location.hostname;

  fetch(API_BASE + "/domains/check?domain=" + encodeURIComponent(currentOrigin))
    .then(function(res) {{ return res.json(); }})
    .then(function(data) {{
      if (!data.authorized || !data.banner_authorized || !data.event) {{
        console.info("[Gloint Power Tech] Banner no autorizado o inactivo para: " + currentOrigin);
        return;
      }}
      var ev = data.event;
      var bannerDiv = document.createElement("div");
      bannerDiv.id = "gloint-power-tech-embed-banner";
      bannerDiv.innerHTML = `
        <div style="background: linear-gradient(135deg, #090e17 0%, #0d1e3a 50%, #0f3d64 100%); color: #ffffff; padding: 12px 20px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; position: sticky; top: 0; z-index: 99999; border-bottom: 1px solid rgba(0, 180, 216, 0.3);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="background: linear-gradient(135deg, #00b4d8, #0077b6); color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 0 10px rgba(0,180,216,0.5);">Power Tech</span>
            <div>
              <strong style="font-size: 14px; font-weight: 700; color: #fff;">${{ev.title}}</strong>
              <span style="margin-left: 8px; font-size: 12px; color: #94a3b8;">${{ev.location || 'Evento Oficial'}} • Cupos Presenciales: <strong style="color: #38bdf8;">${{ev.available_in_person}} disponibles</strong></span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <a href="https://gloint.com.co/#power-tech" target="_blank" style="background: linear-gradient(135deg, #00b4d8, #0096c7); color: #090e17; font-weight: 700; font-size: 12px; padding: 7px 16px; border-radius: 8px; text-decoration: none; transition: transform 0.15s ease;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'">
              Reservar Cupo
            </a>
            <button onclick="document.getElementById('gloint-power-tech-embed-banner').remove()" style="background: transparent; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 4px 8px;" title="Cerrar">&times;</button>
          </div>
        </div>
      `;
      document.body.prepend(bannerDiv);
    }})
    .catch(function(err) {{
      console.warn("[Gloint Power Tech] Handshake error:", err);
    }});
}})();
"""
    return Response(content=js_content, media_type="application/javascript")

