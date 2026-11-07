from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from src.core.database import get_db
from src.api.deps import get_current_user, RequirePermission
from src.models.user import User
from src.schemas.event import (
    EventPublicResponse,
    MyRegistrationResponse,
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
from src.services.event_attendance_service import EventAttendanceService
from src.services.event_live_service import EventLiveService
from src.services.event_coupon_service import EventCouponService
from src.services.event_chat_service import EventChatService, chat_hub
from src.services.event_survey_service import EventSurveyService
from src.services.event_game_service import EventGameService, game_hub
from src.services.event_checkin_service import EventCheckinService
from src.services.event_question_service import EventQuestionService, questions_hub
from pydantic import BaseModel
from fastapi import Request, Response

router = APIRouter()

# H-183: las rutas administrativas de eventos exigen el permiso ANTES de tocar la base de datos
EVENT_ADMIN_PERMISSIONS = ["admin.events.manage", "admin.roles.manage"]
event_admin = [Depends(RequirePermission(EVENT_ADMIN_PERMISSIONS))]

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

@router.get("/my-registration", response_model=Optional[MyRegistrationResponse])
async def get_my_event_registration(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Inscripción del usuario con sesión iniciada (incluida la del formulario externo, por email o documento),
    con su enlace personal y el estado de la transmisión, las preguntas y la encuesta.
    """
    return await EventAttendanceService.get_my_access(db, current_user)

@router.get("/admin/summary", response_model=AdminEventSummaryResponse, dependencies=event_admin)
async def get_admin_event_summary(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para que administradores vean métricas de aforo y listado completo de asistentes.
    """
    return await EventService.get_admin_summary(db)

@router.put("/admin/config", response_model=EventPublicResponse, dependencies=event_admin)
async def update_event_configuration(
    config: EventConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ruta protegida para que administradores actualicen el aforo, fechas, ubicación y estado del banner.
    """
    return await EventService.update_event_config(db, config)

@router.delete("/admin/attendees/{attendee_id}", dependencies=event_admin)
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
# CONFIRMACIÓN DE ASISTENCIA PRESENCIAL (enlace personal del correo, sin sesión)
# ==========================================

class AttendanceEmailsRequest(BaseModel):
    send: bool = False  # False = solo vista previa de destinatarios; True = encola el envío real

@router.post("/admin/attendance-emails", dependencies=event_admin)
async def send_attendance_confirmation_emails(
    body: AttendanceEmailsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Envía el correo de confirmación de asistencia presencial (con QR único) a los inscritos presenciales
    que aún no han confirmado. Con send=false devuelve únicamente la lista de destinatarios.
    """
    return await EventAttendanceService.send_confirmation_emails(db, body.send)

@router.post("/admin/attendees/{attendee_id}/attendance-email", dependencies=event_admin)
async def send_attendance_confirmation_email_to_attendee(
    attendee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Envía el correo de confirmación de asistencia a un solo inscrito (pruebas o reenvíos)."""
    return await EventAttendanceService.send_confirmation_email_to_attendee(db, attendee_id)

@router.get("/attendance/{token}")
async def get_attendance_status(token: str, db: AsyncSession = Depends(get_db)):
    """Estado de la inscripción identificada por el enlace personal del correo."""
    return await EventAttendanceService.get_public_status(db, token)

@router.post("/attendance/{token}/confirm")
async def confirm_attendance(token: str, db: AsyncSession = Depends(get_db)):
    """El inscrito confirma que asistirá de forma presencial."""
    return await EventAttendanceService.confirm_in_person(db, token)

@router.post("/attendance/{token}/virtual")
async def switch_attendance_to_virtual(token: str, db: AsyncSession = Depends(get_db)):
    """El inscrito cambia a modalidad virtual y libera su cupo presencial."""
    return await EventAttendanceService.switch_to_virtual(db, token)

@router.get("/attendance/{token}/qr.png")
async def get_attendance_qr(token: str, db: AsyncSession = Depends(get_db)):
    """QR único del inscrito (PNG)."""
    png = await EventAttendanceService.get_qr(db, token)
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})

# ==========================================
# SALA EN VIVO (transmisión Mux incrustada, acceso por enlace personal)
# ==========================================

class LiveHeartbeatRequest(BaseModel):
    session_id: str

class LiveConfigRequest(BaseModel):
    live_playback_id: Optional[str] = None
    live_open: Optional[bool] = None

class LiveInvitationsRequest(BaseModel):
    send: bool = False  # False = solo vista previa de destinatarios

@router.get("/live/{token}")
async def get_live_status(token: str, db: AsyncSession = Depends(get_db)):
    """Estado de la sala para el inscrito virtual identificado por su enlace personal."""
    return await EventLiveService.get_status(db, token)

@router.post("/live/{token}/join")
async def join_live(token: str, db: AsyncSession = Depends(get_db)):
    """Registra la entrada a la sala y entrega el permiso de reproducción. Toma la sesión activa del enlace."""
    return await EventLiveService.join(db, token)

@router.post("/live/{token}/heartbeat")
async def live_heartbeat(token: str, body: LiveHeartbeatRequest, db: AsyncSession = Depends(get_db)):
    """Latido de presencia: suma permanencia y avisa si el enlace se abrió en otro dispositivo (409)."""
    return await EventLiveService.heartbeat(db, token, body.session_id)

@router.get("/admin/live", dependencies=event_admin)
async def get_live_overview(db: AsyncSession = Depends(get_db)):
    """Quién está conectado ahora, quién entró y cuánto tiempo estuvo."""
    return await EventLiveService.get_overview(db)

@router.post("/admin/live/preview", dependencies=event_admin)
async def preview_live(response: Response, db: AsyncSession = Depends(get_db)):
    """Prueba de la transmisión solo para el equipo: no abre la sala ni registra entradas."""
    response.headers["Cache-Control"] = "private, no-store"
    return await EventLiveService.admin_preview(db)

@router.put("/admin/live/config", dependencies=event_admin)
async def update_live_config(body: LiveConfigRequest, db: AsyncSession = Depends(get_db)):
    """Playback ID de Mux y apertura/cierre de la sala."""
    return await EventLiveService.update_config(db, body.live_playback_id, body.live_open)

@router.post("/admin/live/invitations", dependencies=event_admin)
async def send_live_invitations(body: LiveInvitationsRequest, db: AsyncSession = Depends(get_db)):
    """Invita a los virtuales que aún no tienen invitación. send=false devuelve solo la lista de destinatarios."""
    return await EventLiveService.send_invitations(db, body.send)

@router.post("/admin/attendees/{attendee_id}/live-invitation", dependencies=event_admin)
async def send_live_invitation_to_attendee(attendee_id: int, db: AsyncSession = Depends(get_db)):
    """Envía la invitación a la sala en vivo a un solo inscrito virtual (pruebas o reenvíos)."""
    return await EventLiveService.send_invitation_to_attendee(db, attendee_id)

# ==========================================
# PREGUNTAS MODERADAS (presenciales y virtuales)
# ==========================================

class QuestionRequest(BaseModel):
    text: str

class QuestionStatusRequest(BaseModel):
    status: str  # pending | approved | answered | rejected

class QuestionsOpenRequest(BaseModel):
    is_open: bool

@router.get("/questions/{token}")
async def list_my_questions(token: str, db: AsyncSession = Depends(get_db)):
    """Preguntas aprobadas de todos y las propias, con votos."""
    return await EventQuestionService.list_for_attendee(db, token)

@router.post("/questions/{token}")
async def submit_question(token: str, body: QuestionRequest, db: AsyncSession = Depends(get_db)):
    """Envía una pregunta: queda pendiente hasta que el equipo la apruebe."""
    return await EventQuestionService.submit(db, token, body.text)

@router.post("/questions/{token}/{question_id}/vote")
async def vote_question(token: str, question_id: int, db: AsyncSession = Depends(get_db)):
    """Vota (o quita el voto) de una pregunta aprobada."""
    return await EventQuestionService.toggle_vote(db, token, question_id)

@router.get("/admin/questions", dependencies=event_admin)
async def admin_list_questions(db: AsyncSession = Depends(get_db)):
    return await EventQuestionService.admin_list(db)

@router.put("/admin/questions/open", dependencies=event_admin)
async def admin_set_questions_open(body: QuestionsOpenRequest, db: AsyncSession = Depends(get_db)):
    """Abre o cierra la recepción de preguntas."""
    return await EventQuestionService.set_open(db, body.is_open)

@router.put("/admin/questions/{question_id}", dependencies=event_admin)
async def admin_moderate_question(question_id: int, body: QuestionStatusRequest, db: AsyncSession = Depends(get_db)):
    """Aprueba, rechaza o marca como respondida una pregunta."""
    return await EventQuestionService.set_status(db, question_id, body.status)

@router.websocket("/questions/{token}/ws")
async def questions_attendee_ws(websocket: WebSocket, token: str):
    """Aviso en vivo de cambios en las preguntas para un asistente (el token del enlace lo identifica)."""
    from src.core.database import async_session_maker
    from src.api.v1.endpoints.chat import ws_origin_ok

    await websocket.accept()
    if not ws_origin_ok(websocket):
        return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Origen no permitido")
    async with async_session_maker() as db:
        try:
            await EventQuestionService._attendee(db, token)
        except HTTPException:
            return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Enlace no válido")
    questions_hub.connect(websocket, admin=False)
    try:
        while True:
            await websocket.receive_text()  # mantiene la conexión; el cliente puede enviar pings
    except WebSocketDisconnect:
        pass
    finally:
        questions_hub.disconnect(websocket)

@router.websocket("/survey-viewer/{token}/ws")
async def survey_viewer_ws(websocket: WebSocket, token: str):
    """Aviso en vivo de nuevas respuestas de la encuesta para quien presenta (lo identifica su enlace secreto)."""
    from src.core.database import async_session_maker
    from src.api.v1.endpoints.chat import ws_origin_ok

    await websocket.accept()
    if not ws_origin_ok(websocket):
        return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Origen no permitido")
    async with async_session_maker() as db:
        try:
            await EventSurveyService.get_results_for_viewer(db, token)
        except HTTPException:
            return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Enlace no válido")
    questions_hub.connect_viewer(websocket)
    try:
        while True:
            await websocket.receive_text()  # mantiene la conexión; el cliente puede enviar pings
    except WebSocketDisconnect:
        pass
    finally:
        questions_hub.disconnect(websocket)

async def authenticate_event_admin_ws(websocket: WebSocket) -> bool:
    """
    Acepta el WebSocket y valida que sea un administrador de eventos (misma autenticación que el chat:
    cookie/token JWT, usuario activo, sesión vigente y permiso de eventos). Si no, lo cierra y devuelve False.
    """
    from jose import jwt, JWTError
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from src.core.database import async_session_maker
    from src.core.config import settings
    from src.core.pbac import PBACEngine
    from src.core.session_revocation import is_session_current
    from src.models.security import Role
    from src.api.v1.endpoints.chat import ws_origin_ok

    await websocket.accept()

    async def deny(reason: str) -> bool:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=reason)
        return False

    if not ws_origin_ok(websocket):
        return await deny("Origen no permitido")
    auth_token = websocket.cookies.get("access_token") or websocket.query_params.get("token")
    if not auth_token:
        return await deny("Token de autenticación no proporcionado")
    try:
        payload = jwt.decode(auth_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        return await deny("Token inválido")

    async with async_session_maker() as db:
        user = (await db.execute(
            select(User).options(selectinload(User.roles).selectinload(Role.permissions)).where(User.id == user_id)
        )).scalars().first()
        if not user or not user.is_active or not any(PBACEngine.has_permission(user, p) for p in EVENT_ADMIN_PERMISSIONS):
            return await deny("Acceso denegado")
        if not await is_session_current(db, payload, user):
            return await deny("Sesión revocada o expirada")
    return True

@router.websocket("/admin/questions/ws")
async def questions_admin_ws(websocket: WebSocket):
    """Aviso en vivo para el panel de moderación de preguntas y la encuesta."""
    if not await authenticate_event_admin_ws(websocket):
        return
    questions_hub.connect(websocket, admin=True)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        questions_hub.disconnect(websocket)

# ==========================================
# CONTROL DE ENTRADA PRESENCIAL (QR) Y LISTA UNIFICADA DE ASISTENCIA
# ==========================================

class CheckInRequest(BaseModel):
    code: str  # contenido del QR (GLT-PT:<token>), el token suelto o el enlace del correo

@router.post("/admin/checkin", dependencies=event_admin)
async def check_in_by_qr(
    body: CheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra la entrada presencial al escanear el QR del inscrito. Un segundo escaneo avisa que ya ingresó."""
    return await EventCheckinService.check_in_by_code(db, body.code, current_user.id)

@router.post("/admin/attendees/{attendee_id}/checkin", dependencies=event_admin)
async def check_in_attendee(
    attendee_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registra la entrada de un inscrito elegido en la lista (sin QR: celular sin batería, etc.)."""
    return await EventCheckinService.check_in_by_id(db, attendee_id, current_user.id)

@router.delete("/admin/attendees/{attendee_id}/checkin", dependencies=event_admin)
async def undo_attendee_check_in(attendee_id: int, db: AsyncSession = Depends(get_db)):
    """Deshace una entrada registrada por error."""
    return await EventCheckinService.undo_check_in(db, attendee_id)

@router.get("/admin/attendance", dependencies=event_admin)
async def get_unified_attendance(db: AsyncSession = Depends(get_db)):
    """Lista unificada de asistencia de los cuatro grupos (inversionista/externo × presencial/virtual)."""
    return await EventCheckinService.get_attendance(db)

# ==========================================
# ENCUESTA DE SATISFACCIÓN EN VIVO
# ==========================================

class SurveyAnswers(BaseModel):
    overall_rating: int
    content_rating: int
    speakers_rating: int
    organization_rating: int
    nps: int
    comment: Optional[str] = None

class SurveyOpenRequest(BaseModel):
    is_open: bool

@router.get("/survey/{token}")
async def get_survey_status(token: str, db: AsyncSession = Depends(get_db)):
    """Estado de la encuesta para el inscrito identificado por su enlace personal."""
    return await EventSurveyService.get_public_status(db, token)

@router.post("/survey/{token}")
async def submit_survey(token: str, body: SurveyAnswers, db: AsyncSession = Depends(get_db)):
    """Registra la respuesta del inscrito (una sola) y avisa en vivo al panel de administración."""
    return await EventSurveyService.submit(db, token, body.model_dump())

@router.get("/admin/survey/results", dependencies=event_admin)
async def get_survey_results(db: AsyncSession = Depends(get_db)):
    """Resultados en conjunto y por los cuatro grupos (anónimos)."""
    return await EventSurveyService.get_results(db)

@router.get("/survey-viewer/{token}")
async def get_survey_results_for_presenter(token: str, response: Response, db: AsyncSession = Depends(get_db)):
    """Resultados de la encuesta para quien presenta, con su enlace secreto (sin sesión, solo lectura)."""
    response.headers["Cache-Control"] = "private, no-store"
    return await EventSurveyService.get_results_for_viewer(db, token)

@router.get("/admin/survey/viewer-link", dependencies=event_admin)
async def get_survey_viewer_link(db: AsyncSession = Depends(get_db)):
    """Enlace secreto vigente para el presentador (token nulo si no hay)."""
    return await EventSurveyService.get_viewer_link(db)

@router.post("/admin/survey/viewer-link", dependencies=event_admin)
async def rotate_survey_viewer_link(db: AsyncSession = Depends(get_db)):
    """Crea un enlace nuevo para el presentador e invalida el anterior."""
    return await EventSurveyService.rotate_viewer_link(db)

@router.delete("/admin/survey/viewer-link", dependencies=event_admin)
async def revoke_survey_viewer_link(db: AsyncSession = Depends(get_db)):
    """Desactiva el enlace del presentador."""
    return await EventSurveyService.revoke_viewer_link(db)

@router.put("/admin/survey/open", dependencies=event_admin)
async def set_survey_open(body: SurveyOpenRequest, db: AsyncSession = Depends(get_db)):
    """Abre o cierra la encuesta durante el evento."""
    return await EventSurveyService.set_open(db, body.is_open)

# ==========================================
# DINÁMICA EN VIVO: «¿quién respondió primero?» (URL pública con QR, sin sesión)
# ==========================================

class GameAnswerRequest(BaseModel):
    token: str
    round_id: int
    option_index: int

class GameRoundCreateRequest(BaseModel):
    question: str
    options: List[str]
    correct_index: int

@router.post("/game/join")
async def game_join(db: AsyncSession = Depends(get_db)):
    """Entrega un código corto anónimo (ej. «Colibrí 47») a quien escanea el QR. El navegador guarda el token."""
    return await EventGameService.join(db)

@router.get("/game/state")
async def game_state(response: Response, token: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    """Estado público de la dinámica (pantalla del presentador y celulares). La respuesta correcta solo sale al cerrar la ronda."""
    response.headers["Cache-Control"] = "no-store"
    return await EventGameService.get_state(db, token)

@router.post("/game/answer")
async def game_answer(body: GameAnswerRequest, db: AsyncSession = Depends(get_db)):
    """Responde la ronda abierta (una vez por persona). La primera respuesta correcta gana y cierra la ronda."""
    return await EventGameService.answer(db, body.token, body.round_id, body.option_index)

@router.get("/game/qr.png")
async def game_qr():
    """QR que lleva a la página pública de la dinámica (PNG)."""
    import io
    import segno
    from src.core.config import settings
    buffer = io.BytesIO()
    segno.make(f"{settings.FRONTEND_URL.rstrip('/')}/dinamica", error="m").save(buffer, kind="png", scale=10, border=2)
    return Response(content=buffer.getvalue(), media_type="image/png", headers={"Cache-Control": "public, max-age=3600"})

@router.websocket("/game/ws")
async def game_ws(websocket: WebSocket):
    """Aviso en vivo (pública) para que la pantalla y los celulares vuelvan a pedir el estado."""
    from src.api.v1.endpoints.chat import ws_origin_ok

    await websocket.accept()
    if not ws_origin_ok(websocket):
        return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Origen no permitido")
    game_hub.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # mantiene la conexión; el cliente puede enviar pings
    except WebSocketDisconnect:
        pass
    finally:
        game_hub.disconnect(websocket)

@router.get("/admin/game", dependencies=event_admin)
async def admin_game_list(db: AsyncSession = Depends(get_db)):
    """Rondas de la dinámica (con la respuesta correcta y el ganador de cada una)."""
    return await EventGameService.admin_list(db)

@router.post("/admin/game/rounds", dependencies=event_admin)
async def admin_game_create(body: GameRoundCreateRequest, db: AsyncSession = Depends(get_db)):
    """Crea una pregunta (opción múltiple, una correcta)."""
    return await EventGameService.create_round(db, body.question, body.options, body.correct_index)

@router.put("/admin/game/rounds/{round_id}/open", dependencies=event_admin)
async def admin_game_open(round_id: int, db: AsyncSession = Depends(get_db)):
    """Abre la ronda (cierra la que estuviera abierta)."""
    return await EventGameService.open_round(db, round_id)

@router.put("/admin/game/rounds/{round_id}/close", dependencies=event_admin)
async def admin_game_close(round_id: int, db: AsyncSession = Depends(get_db)):
    """Cierra la ronda sin esperar ganador."""
    return await EventGameService.close_round(db, round_id)

@router.delete("/admin/game/rounds/{round_id}", dependencies=event_admin)
async def admin_game_delete(round_id: int, db: AsyncSession = Depends(get_db)):
    """Elimina una ronda (no puede estar abierta)."""
    return await EventGameService.delete_round(db, round_id)

# ==========================================
# CHAT EN VIVO (solo inscritos virtuales; moderación posterior)
# ==========================================

class ChatMessageRequest(BaseModel):
    text: str

class ChatMuteRequest(BaseModel):
    muted: bool

class ChatOpenRequest(BaseModel):
    is_open: bool

@router.get("/chat/{token}")
async def get_chat_history(token: str, db: AsyncSession = Depends(get_db)):
    """Últimos mensajes del chat para el inscrito virtual identificado por su enlace personal."""
    return await EventChatService.history(db, token)

@router.post("/chat/{token}")
async def send_chat_message(token: str, body: ChatMessageRequest, db: AsyncSession = Depends(get_db)):
    """Envía un mensaje al chat (sale al instante, con límite de ritmo)."""
    return await EventChatService.send(db, token, body.text)

@router.websocket("/chat/{token}/ws")
async def chat_attendee_ws(websocket: WebSocket, token: str):
    """Mensajes del chat en vivo para un inscrito virtual (el token del enlace lo identifica)."""
    from src.core.database import async_session_maker
    from src.api.v1.endpoints.chat import ws_origin_ok

    await websocket.accept()
    if not ws_origin_ok(websocket):
        return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Origen no permitido")
    async with async_session_maker() as db:
        try:
            attendee = await EventChatService._virtual_attendee(db, token)
        except HTTPException:
            return await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Enlace no válido")
        attendee_id = attendee.id
    chat_hub.connect(websocket, attendee_id=attendee_id)
    try:
        while True:
            await websocket.receive_text()  # mantiene la conexión; los mensajes se envían por POST
    except WebSocketDisconnect:
        pass
    finally:
        chat_hub.disconnect(websocket)

@router.get("/admin/chat", dependencies=event_admin)
async def admin_list_chat(db: AsyncSession = Depends(get_db)):
    return await EventChatService.admin_list(db)

@router.put("/admin/chat/open", dependencies=event_admin)
async def admin_set_chat_open(body: ChatOpenRequest, db: AsyncSession = Depends(get_db)):
    """Enciende o apaga el chat en vivo (apagado por defecto)."""
    return await EventChatService.set_open(db, body.is_open)

@router.post("/admin/chat/{message_id}/promote", dependencies=event_admin)
async def admin_promote_chat_message(message_id: int, db: AsyncSession = Depends(get_db)):
    """Convierte un mensaje del chat en pregunta oficial (aprobada) para los presentadores."""
    return await EventChatService.promote_to_question(db, message_id)

@router.delete("/admin/chat/{message_id}", dependencies=event_admin)
async def admin_delete_chat_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Borra un mensaje del chat (desaparece en vivo para todos)."""
    return await EventChatService.delete_message(db, message_id, current_user.id)

@router.put("/admin/attendees/{attendee_id}/chat-mute", dependencies=event_admin)
async def admin_mute_chat_attendee(attendee_id: int, body: ChatMuteRequest, db: AsyncSession = Depends(get_db)):
    """Silencia o devuelve la palabra a un asistente en el chat."""
    return await EventChatService.set_muted(db, attendee_id, body.muted)

@router.websocket("/admin/chat/ws")
async def chat_admin_ws(websocket: WebSocket):
    """Mensajes del chat en vivo para el panel de moderación."""
    if not await authenticate_event_admin_ws(websocket):
        return
    chat_hub.connect(websocket, admin=True)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        chat_hub.disconnect(websocket)

# ==========================================
# CUPONES DE DESCUENTO PARA GLOINT PLACE
# ==========================================

class CouponConfigRequest(BaseModel):
    percent: int
    hours: int
    store_url: str

class CouponActiveRequest(BaseModel):
    active: bool

class CouponRecipientsRequest(BaseModel):
    attendee_ids: List[int]

@router.get("/coupon/{token}")
async def get_my_coupon(token: str, db: AsyncSession = Depends(get_db)):
    """Cupón personal del asistente (solo con los cupones activados por el equipo)."""
    return await EventCouponService.get_for_attendee(db, token)

@router.get("/admin/coupons", dependencies=event_admin)
async def admin_get_coupons(db: AsyncSession = Depends(get_db)):
    """Configuración de los cupones y a quién se le dio cada uno (con su estado)."""
    return await EventCouponService.admin_overview(db)

@router.put("/admin/coupons/config", dependencies=event_admin)
async def admin_update_coupon_config(body: CouponConfigRequest, db: AsyncSession = Depends(get_db)):
    """Descuento, vigencia y enlace de la tienda (solo con los cupones desactivados)."""
    return await EventCouponService.update_config(db, body.percent, body.hours, body.store_url)

@router.post("/admin/coupons/assign", dependencies=event_admin)
async def admin_assign_coupons(body: CouponRecipientsRequest, db: AsyncSession = Depends(get_db)):
    """Da cupón a los asistentes elegidos por el equipo."""
    return await EventCouponService.assign(db, body.attendee_ids)

@router.post("/admin/coupons/revoke", dependencies=event_admin)
async def admin_revoke_coupons(body: CouponRecipientsRequest, db: AsyncSession = Depends(get_db)):
    """Quita el cupón a los asistentes elegidos (los ya usados se conservan)."""
    return await EventCouponService.revoke(db, body.attendee_ids)

@router.post("/admin/coupons/activate", dependencies=event_admin)
async def admin_set_coupons_active(body: CouponActiveRequest, db: AsyncSession = Depends(get_db)):
    """Activa los cupones (genera los códigos y arranca la vigencia) o los desactiva."""
    return await EventCouponService.set_active(db, body.active)

# ==========================================
# GESTIÓN DE DOMINIOS AUTORIZADOS (ECOSISTEMA GLOINT)
# ==========================================

@router.get("/domains", response_model=List[EventAuthorizedDomainResponse], dependencies=event_admin)
async def get_authorized_domains(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Listar los dominios autorizados para desplegar el banner interactivo y registros de Gloint Power Tech.
    """
    return await EventService.get_authorized_domains(db)

@router.post("/domains", response_model=EventAuthorizedDomainResponse, dependencies=event_admin)
async def create_authorized_domain(
    data: EventAuthorizedDomainCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registrar un nuevo dominio autorizado en el ecosistema (ej. glointech.com.co).
    """
    return await EventService.create_authorized_domain(db, data)

@router.put("/domains/{domain_id}", response_model=EventAuthorizedDomainResponse, dependencies=event_admin)
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

@router.delete("/domains/{domain_id}", dependencies=event_admin)
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

