import { fetchApi, API_URL } from './api';

export interface EventData {
  id: number;
  title: string;
  slug: string;
  description?: string;
  event_date?: string;
  location?: string;
  virtual_url?: string;
  capacity_in_person: number;
  occupied_in_person: number;
  available_in_person: number;
  is_full_in_person: boolean;
  is_active: boolean;
  banner_active: boolean;
  promo_banner_active?: boolean;
  promo_banner_url?: string;
  promo_banner_title?: string;
  promo_banner_text?: string;
}

export interface AttendeeData {
  id: number;
  event_id: number;
  user_id?: number | null;
  attendee_type: 'investor' | 'external';
  full_name: string;
  email: string;
  phone?: string | null;
  document_id?: string | null;
  city?: string | null;
  is_company: boolean;
  company_name?: string | null;
  company_nit?: string | null;
  job_title?: string | null;
  interests?: string[] | string | null;
  attendance_mode: 'in_person' | 'virtual';
  has_companion: boolean;
  companion_name?: string | null;
  seats_reserved: number;
  status: 'confirmed' | 'cancelled';
  created_at?: string;
  access_token?: string | null; // solo la respuesta del admin lo incluye
}

export interface AdminEventSummary {
  event: EventData;
  total_attendees: number;
  investor_attendees: number;
  external_attendees: number;
  in_person_attendees: number;
  virtual_attendees: number;
  attendees: AttendeeData[];
}

export interface InvestorRsvpPayload {
  attendance_mode: 'in_person' | 'virtual';
  has_companion: boolean;
  companion_name?: string;
  phone?: string;
  is_company?: boolean;
  company_name?: string;
  company_nit?: string;
  job_title?: string;
  interests?: string[];
}

export interface PublicRsvpPayload {
  full_name: string;
  email: string;
  phone: string;
  document_id?: string;
  city?: string;
  is_company?: boolean;
  company_name?: string;
  company_nit?: string;
  job_title?: string;
  interests?: string[];
  attendance_mode: 'in_person' | 'virtual';
  has_companion: boolean;
  companion_name?: string;
}

export interface EventConfigPayload {
  title?: string;
  description?: string;
  event_date?: string;
  location?: string;
  virtual_url?: string;
  capacity_in_person?: number;
  is_active?: boolean;
  banner_active?: boolean;
  promo_banner_active?: boolean;
  promo_banner_url?: string;
  promo_banner_title?: string;
  promo_banner_text?: string;
}

export const getActiveEvent = async (): Promise<EventData> => {
  return await fetchApi('/events/active');
};

export const registerPublicAttendee = async (payload: PublicRsvpPayload): Promise<AttendeeData> => {
  return await fetchApi('/events/register-public', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const registerInvestorAttendee = async (payload: InvestorRsvpPayload): Promise<AttendeeData> => {
  return await fetchApi('/events/register-investor', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

// Inscripción del propio usuario + enlace personal y estado de la sala (para entrar al evento desde el dashboard).
export interface MyEventRegistration extends AttendeeData {
  access_token?: string | null;
  live_open: boolean;
  questions_open: boolean;
  survey_open: boolean;
  coupon_active: boolean;
}

export const getMyEventRegistration = async (): Promise<MyEventRegistration | null> => {
  return await fetchApi('/events/my-registration');
};

export const getAdminEventSummary = async (): Promise<AdminEventSummary> => {
  return await fetchApi('/events/admin/summary');
};

export const updateAdminEventConfig = async (payload: EventConfigPayload): Promise<EventData> => {
  return await fetchApi('/events/admin/config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

export const cancelAttendeeRegistration = async (attendeeId: number): Promise<{ message: string }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}`, {
    method: 'DELETE',
  });
};

// ---------------------------------------------------------------------------
// Confirmación de asistencia presencial (enlace personal del correo, sin sesión)
// ---------------------------------------------------------------------------

export interface AttendanceStatus {
  full_name: string;
  attendance_mode: 'in_person' | 'virtual';
  status: 'confirmed' | 'cancelled';
  seats_reserved: number;
  companion_name?: string | null;
  attendance_confirmed_at?: string | null;
  event_title: string;
  event_date?: string | null;
  location?: string | null;
}

export interface AttendanceEmailsResult {
  send: boolean;
  recipients: number;
  emails: string[];
}

export const getAttendanceStatus = async (token: string): Promise<AttendanceStatus> => {
  return await fetchApi(`/events/attendance/${encodeURIComponent(token)}`);
};

export const confirmAttendance = async (token: string): Promise<AttendanceStatus> => {
  return await fetchApi(`/events/attendance/${encodeURIComponent(token)}/confirm`, { method: 'POST' });
};

export const switchAttendanceToVirtual = async (token: string): Promise<AttendanceStatus> => {
  return await fetchApi(`/events/attendance/${encodeURIComponent(token)}/virtual`, { method: 'POST' });
};

export const getAttendanceQrUrl = (token: string): string => {
  return `${API_URL}/events/attendance/${encodeURIComponent(token)}/qr.png`;
};

// Admin: send=false solo devuelve la lista de destinatarios; send=true encola el envío real.
export const sendAttendanceConfirmationEmails = async (send: boolean): Promise<AttendanceEmailsResult> => {
  return await fetchApi('/events/admin/attendance-emails', {
    method: 'POST',
    body: JSON.stringify({ send }),
  });
};

// Admin: corrige el correo de un inscrito (virtual o presencial).
export const updateAttendeeEmail = async (attendeeId: number, email: string): Promise<{ id: number; email: string }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/email`, {
    method: 'PUT',
    body: JSON.stringify({ email }),
  });
};

// Admin: reenvío del QR de acceso («Tu QR de acceso») a todos los presenciales vigentes.
// send=false solo devuelve la lista de destinatarios; send=true encola el envío real.
export const sendAccessQrEmails = async (send: boolean): Promise<AttendanceEmailsResult> => {
  return await fetchApi('/events/admin/access-qr-emails', {
    method: 'POST',
    body: JSON.stringify({ send }),
  });
};

// Admin: reenvía el QR de acceso a un solo inscrito presencial.
export const sendAccessQrEmailToAttendee = async (attendeeId: number): Promise<{ sent: boolean; email: string }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/access-qr-email`, { method: 'POST' });
};

// Admin: envía el correo de confirmación a un solo inscrito (pruebas o reenvíos).
export const sendAttendanceEmailToAttendee = async (attendeeId: number): Promise<{ sent: boolean; email: string }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/attendance-email`, { method: 'POST' });
};


// ---------------------------------------------------------------------------
// Sala en vivo (transmisión Mux incrustada, acceso por enlace personal)
// ---------------------------------------------------------------------------

export interface LiveStatus {
  full_name: string;
  event_title: string;
  event_date?: string | null;
  live_open: boolean;
  coupon_active: boolean;
}

export interface LiveJoin {
  session_id: string;
  playback_id: string;
  playback_token: string | null;
  heartbeat_seconds: number;
}

export interface LiveAttendeeRow {
  attendee_id: number;
  full_name: string;
  email: string;
  attendee_type: 'investor' | 'external';
  invited_at?: string | null;
  first_joined_at?: string | null;
  last_seen_at?: string | null;
  watch_minutes: number;
  joins: number;
  online: boolean;
}

export interface LiveOverview {
  live_open: boolean;
  live_playback_id: string | null;
  signing_configured: boolean;
  total_virtual: number;
  invited: number;
  joined: number;
  online_now: number;
  attendees: LiveAttendeeRow[];
}

export const getLiveStatus = async (token: string): Promise<LiveStatus> => {
  return await fetchApi(`/events/live/${encodeURIComponent(token)}`);
};

export const joinLive = async (token: string): Promise<LiveJoin> => {
  return await fetchApi(`/events/live/${encodeURIComponent(token)}/join`, { method: 'POST' });
};

export const liveHeartbeat = async (token: string, sessionId: string): Promise<{ live_open: boolean; coupon_active: boolean }> => {
  return await fetchApi(`/events/live/${encodeURIComponent(token)}/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
};

export const getLiveOverview = async (): Promise<LiveOverview> => {
  return await fetchApi('/events/admin/live');
};

// Prueba de la transmisión solo para el equipo: no abre la sala ni registra entradas
export const previewLive = async (): Promise<{ playback_id: string; playback_token: string | null; live_open: boolean }> => {
  return await fetchApi('/events/admin/live/preview', { method: 'POST' });
};

export const updateLiveConfig = async (payload: { live_playback_id?: string; live_open?: boolean }): Promise<LiveOverview> => {
  return await fetchApi('/events/admin/live/config', { method: 'PUT', body: JSON.stringify(payload) });
};

// send=false solo devuelve la lista de destinatarios; send=true encola el envío real.
export const sendLiveInvitations = async (send: boolean): Promise<AttendanceEmailsResult> => {
  return await fetchApi('/events/admin/live/invitations', { method: 'POST', body: JSON.stringify({ send }) });
};

export const sendLiveInvitationToAttendee = async (attendeeId: number): Promise<{ sent: boolean; email: string }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/live-invitation`, { method: 'POST' });
};

// ---------------------------------------------------------------------------
// Preguntas moderadas (presenciales y virtuales)
// ---------------------------------------------------------------------------

export type QuestionStatus = 'pending' | 'approved' | 'answered' | 'rejected';

export interface AttendeeQuestion {
  id: number;
  text: string;
  status: QuestionStatus;
  author: string;
  mine: boolean;
  votes: number;
  voted: boolean;
  created_at?: string | null;
}

export interface AttendeeQuestions {
  questions_open: boolean;
  attendee_name: string;
  questions: AttendeeQuestion[];
}

export interface AdminQuestion {
  id: number;
  text: string;
  status: QuestionStatus;
  votes: number;
  author: string;
  email?: string | null;
  attendee_type?: 'investor' | 'external' | null;
  attendance_mode?: 'in_person' | 'virtual' | null;
  created_at?: string | null;
}

export interface AdminQuestions {
  questions_open: boolean;
  counts: Record<QuestionStatus, number>;
  questions: AdminQuestion[];
}

export const getMyQuestions = async (token: string): Promise<AttendeeQuestions> => {
  return await fetchApi(`/events/questions/${encodeURIComponent(token)}`);
};

export const submitQuestion = async (token: string, text: string): Promise<{ ok: boolean }> => {
  return await fetchApi(`/events/questions/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ text }) });
};

export const voteQuestion = async (token: string, questionId: number): Promise<{ voted: boolean }> => {
  return await fetchApi(`/events/questions/${encodeURIComponent(token)}/${questionId}/vote`, { method: 'POST' });
};

export const getAdminQuestions = async (): Promise<AdminQuestions> => {
  return await fetchApi('/events/admin/questions');
};

export const setQuestionsOpen = async (isOpen: boolean): Promise<AdminQuestions> => {
  return await fetchApi('/events/admin/questions/open', { method: 'PUT', body: JSON.stringify({ is_open: isOpen }) });
};

export const moderateQuestion = async (questionId: number, status: QuestionStatus): Promise<AdminQuestions> => {
  return await fetchApi(`/events/admin/questions/${questionId}`, { method: 'PUT', body: JSON.stringify({ status }) });
};

// URL del WebSocket de eventos (mismo criterio que el chat: ws/wss según el origen de la API).
export const getEventsWebSocketUrl = (path: string): string => {
  let base = API_URL;
  if (base.startsWith('/')) {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    base = `${protocol}//${host}${base}`;
  } else {
    base = base.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  }
  return `${base}/events${path}`;
};

// ---------------------------------------------------------------------------
// Control de entrada presencial (QR) y lista unificada de asistencia
// ---------------------------------------------------------------------------

export interface CheckInEntry {
  id: number;
  full_name: string;
  email: string;
  attendee_type: 'investor' | 'external';
  seats_reserved: number;
  companion_name?: string | null;
  checked_in_at?: string | null;
}

export interface CheckInResult {
  result: 'checked_in' | 'already_checked_in';
  attendee: CheckInEntry;
}

export interface UnifiedAttendeeRow {
  id: number;
  full_name: string;
  email: string;
  phone?: string | null;
  attendee_type: 'investor' | 'external';
  attendance_mode: 'in_person' | 'virtual';
  seats_reserved: number;
  attended: boolean;
  checked_in_at?: string | null;
  live_first_joined_at?: string | null;
  live_watch_minutes: number;
}

export interface UnifiedAttendance {
  groups: Record<string, { registered: number; attended: number }>;
  in_person_registered: number;
  in_person_checked_in: number;
  seats_expected: number;
  seats_checked_in: number;
  attendees: UnifiedAttendeeRow[];
}

export const checkInByCode = async (code: string): Promise<CheckInResult> => {
  return await fetchApi('/events/admin/checkin', { method: 'POST', body: JSON.stringify({ code }) });
};

export const checkInAttendee = async (attendeeId: number): Promise<CheckInResult> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/checkin`, { method: 'POST' });
};

export const undoCheckIn = async (attendeeId: number): Promise<{ ok: boolean }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/checkin`, { method: 'DELETE' });
};

export const getUnifiedAttendance = async (): Promise<UnifiedAttendance> => {
  return await fetchApi('/events/admin/attendance');
};

// ---------------------------------------------------------------------------
// Encuesta de satisfacción en vivo
// ---------------------------------------------------------------------------

export const RATING_FIELDS = ['overall_rating', 'content_rating', 'speakers_rating', 'organization_rating'] as const;
export type RatingField = (typeof RATING_FIELDS)[number];

export interface SurveyStatus {
  full_name: string;
  event_title: string;
  survey_open: boolean;
  already_answered: boolean;
}

export interface SurveyAnswers extends Record<RatingField, number> {
  nps: number;
  comment?: string;
}

export interface SurveyStats {
  total: number;
  averages: Record<RatingField, number | null>;
  nps: { score: number | null; promoters: number; passives: number; detractors: number };
}

export interface SurveyResults {
  survey_open: boolean;
  eligible_attendees: number;
  overall: SurveyStats;
  groups: Record<string, SurveyStats>;
  distributions: Record<RatingField, Record<string, number>>;
  recent_comments: { comment: string; group: string; created_at?: string | null }[];
  event_title?: string;
}

export const getSurveyStatus = async (token: string): Promise<SurveyStatus> => {
  return await fetchApi(`/events/survey/${encodeURIComponent(token)}`);
};

export const submitSurvey = async (token: string, answers: SurveyAnswers): Promise<{ ok: boolean }> => {
  return await fetchApi(`/events/survey/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify(answers) });
};

export const getSurveyResults = async (): Promise<SurveyResults> => {
  return await fetchApi('/events/admin/survey/results');
};

// Enlace secreto de solo lectura para quien presenta: ve los resultados en vivo sin iniciar sesión
export const getSurveyViewerResults = async (token: string): Promise<SurveyResults> => {
  return await fetchApi(`/events/survey-viewer/${encodeURIComponent(token)}`);
};

export const getSurveyViewerLink = async (): Promise<{ token: string | null }> => {
  return await fetchApi('/events/admin/survey/viewer-link');
};

export const rotateSurveyViewerLink = async (): Promise<{ token: string | null }> => {
  return await fetchApi('/events/admin/survey/viewer-link', { method: 'POST' });
};

export const revokeSurveyViewerLink = async (): Promise<{ token: string | null }> => {
  return await fetchApi('/events/admin/survey/viewer-link', { method: 'DELETE' });
};

export const setSurveyOpen = async (isOpen: boolean): Promise<SurveyResults> => {
  return await fetchApi('/events/admin/survey/open', { method: 'PUT', body: JSON.stringify({ is_open: isOpen }) });
};

// ---------------------------------------------------------------------------
// Chat en vivo de la sala (solo virtuales; moderación posterior)
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: number;
  author: string;
  text: string;
  created_at?: string | null;
  mine?: boolean;
}

export interface ChatHistory {
  chat_open: boolean;
  muted: boolean;
  messages: ChatMessage[];
}

export interface AdminChatMessage extends ChatMessage {
  attendee_id: number;
  muted?: boolean;
  is_question?: boolean;
}

export interface AdminChat {
  chat_open: boolean;   // interruptor del equipo
  live_open: boolean;   // el chat solo funciona con la sala abierta
  messages: AdminChatMessage[];
}

export const getChatHistory = async (token: string): Promise<ChatHistory> => {
  return await fetchApi(`/events/chat/${encodeURIComponent(token)}`);
};

export const sendChatMessage = async (token: string, text: string): Promise<{ ok: boolean; id: number }> => {
  return await fetchApi(`/events/chat/${encodeURIComponent(token)}`, { method: 'POST', body: JSON.stringify({ text }) });
};

export const getAdminChat = async (): Promise<AdminChat> => {
  return await fetchApi('/events/admin/chat');
};

export const deleteChatMessage = async (messageId: number): Promise<{ ok: boolean }> => {
  return await fetchApi(`/events/admin/chat/${messageId}`, { method: 'DELETE' });
};

export const muteChatAttendee = async (attendeeId: number, muted: boolean): Promise<{ ok: boolean; muted: boolean }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/chat-mute`, { method: 'PUT', body: JSON.stringify({ muted }) });
};

export const setChatOpen = async (isOpen: boolean): Promise<AdminChat> => {
  return await fetchApi('/events/admin/chat/open', { method: 'PUT', body: JSON.stringify({ is_open: isOpen }) });
};

// Convierte un mensaje del chat en pregunta oficial (aprobada) para los presentadores.
export const promoteChatMessage = async (messageId: number): Promise<{ ok: boolean; question_id: number }> => {
  return await fetchApi(`/events/admin/chat/${messageId}/promote`, { method: 'POST' });
};

// ---------------------------------------------------------------------------
// Cupones de descuento para Gloint Place
// ---------------------------------------------------------------------------

export type CouponStatus = 'valid' | 'redeemed' | 'expired' | 'inactive';
// Para el asistente: 'none' = no fue seleccionado para recibir cupón

export interface MyCoupon {
  full_name: string;
  assigned: boolean;            // el equipo lo seleccionó para recibir cupón
  active: boolean;
  status: CouponStatus | 'none';
  code?: string | null;
  percent: number;
  hours: number;
  expires_at?: string | null;
  store_link?: string;
  redeemed_at?: string | null;
}

export interface AdminCouponRow {
  attendee_id: number;
  full_name: string;
  email: string;
  attendee_type: 'investor' | 'external';
  attendance_mode: 'in_person' | 'virtual';
  code: string;
  status: CouponStatus;
  redeemed_at?: string | null;
  redeemed_order_ref?: string | null;
}

// Cada asistente vigente, con su cupón si el equipo se lo dio (code/status en null si no)
export interface AdminCouponCandidate {
  attendee_id: number;
  full_name: string;
  email: string;
  attendee_type: 'investor' | 'external';
  attendance_mode: 'in_person' | 'virtual';
  attended: boolean;            // entró por la puerta (presencial) o se conectó a la sala (virtual)
  code: string | null;
  status: CouponStatus | null;
  redeemed_at?: string | null;
  redeemed_order_ref?: string | null;
}

export interface AdminCoupons {
  active: boolean;
  live: boolean;
  percent: number;
  hours: number;
  store_url: string;
  starts_at?: string | null;
  expires_at?: string | null;
  counts: Record<CouponStatus, number>;
  total: number;                // cupones entregados
  eligible: number;             // inscritos vigentes que se pueden elegir
  candidates: AdminCouponCandidate[];
  coupons: AdminCouponRow[];
  result?: { assigned?: number; already_had?: number; ignored?: number; revoked?: number; kept_used?: number };
}

export const getMyCoupon = async (token: string): Promise<MyCoupon> => {
  return await fetchApi(`/events/coupon/${encodeURIComponent(token)}`);
};

export const getAdminCoupons = async (): Promise<AdminCoupons> => {
  return await fetchApi('/events/admin/coupons');
};

export const updateCouponConfig = async (percent: number, hours: number, storeUrl: string): Promise<AdminCoupons> => {
  return await fetchApi('/events/admin/coupons/config', {
    method: 'PUT',
    body: JSON.stringify({ percent, hours, store_url: storeUrl }),
  });
};

export const setCouponsActive = async (active: boolean): Promise<AdminCoupons> => {
  return await fetchApi('/events/admin/coupons/activate', { method: 'POST', body: JSON.stringify({ active }) });
};

// El equipo elige a quién se le da cupón (no es para todos los inscritos).
export const assignCoupons = async (attendeeIds: number[]): Promise<AdminCoupons> => {
  return await fetchApi('/events/admin/coupons/assign', { method: 'POST', body: JSON.stringify({ attendee_ids: attendeeIds }) });
};

export const revokeCoupons = async (attendeeIds: number[]): Promise<AdminCoupons> => {
  return await fetchApi('/events/admin/coupons/revoke', { method: 'POST', body: JSON.stringify({ attendee_ids: attendeeIds }) });
};

// ---------------------------------------------------------------------------
// Dinámica en vivo «¿quién respondió primero?» (URL pública con QR, sin sesión)
// ---------------------------------------------------------------------------

export interface GameRound {
  id: number;
  question: string;
  /** Solo llegan al celular de quien participa (con su código) y al panel del equipo; la pantalla recibe []. */
  options: string[];
  options_count: number;
  /** Cuántas personas eligieron cada opción (A, B, C…): solo con la ronda cerrada */
  distribution: number[] | null;
  status: 'draft' | 'open' | 'closed';
  /** Tiempo para responder desde que se abre la ronda, y segundos que le quedan (solo si está abierta) */
  duration_seconds: number;
  seconds_left: number | null;
  answers: number;
}

export interface GameState {
  round: GameRound | null;
  me: { answered: boolean; option_index: number | null } | null;
}

export interface GameAdminData {
  participants: number;
  rounds: GameRound[];
}

export const gameJoin = async (): Promise<{ token: string }> => {
  return await fetchApi('/events/game/join', { method: 'POST' });
};

export const getGameState = async (token?: string | null): Promise<GameState> => {
  return await fetchApi(`/events/game/state${token ? `?token=${encodeURIComponent(token)}` : ''}`);
};

export const gameAnswer = async (token: string, roundId: number, optionIndex: number): Promise<{ accepted: boolean }> => {
  return await fetchApi('/events/game/answer', {
    method: 'POST',
    body: JSON.stringify({ token, round_id: roundId, option_index: optionIndex }),
  });
};

// El QR apunta al mismo sitio desde el que se abre la pantalla (staging o producción)
export const getGameQrUrl = (): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${API_URL}/events/game/qr.png${origin ? `?origin=${encodeURIComponent(origin)}` : ''}`;
};

export const getAdminGame = async (): Promise<GameAdminData> => {
  return await fetchApi('/events/admin/game');
};

export const createGameRound = async (question: string, options: string[]): Promise<GameAdminData> => {
  return await fetchApi('/events/admin/game/rounds', {
    method: 'POST',
    body: JSON.stringify({ question, options }),
  });
};

export const openGameRound = async (id: number): Promise<GameAdminData> => {
  return await fetchApi(`/events/admin/game/rounds/${id}/open`, { method: 'PUT' });
};

export const closeGameRound = async (id: number): Promise<GameAdminData> => {
  return await fetchApi(`/events/admin/game/rounds/${id}/close`, { method: 'PUT' });
};

export const resetGameRound = async (id: number): Promise<GameAdminData> => {
  return await fetchApi(`/events/admin/game/rounds/${id}/reset`, { method: 'PUT' });
};

export const resetGame = async (): Promise<GameAdminData> => {
  return await fetchApi('/events/admin/game/reset', { method: 'POST' });
};

export const deleteGameRound = async (id: number): Promise<GameAdminData> => {
  return await fetchApi(`/events/admin/game/rounds/${id}`, { method: 'DELETE' });
};

export const sendLiveInvitationToInvestor = async (email: string, forceVirtual = false): Promise<{ sent: boolean; email: string }> => {
  return await fetchApi('/events/admin/live/investor-invitation', {
    method: 'POST',
    body: JSON.stringify({ email, force_virtual: forceVirtual }),
  });
};
// ---------------------------------------------------------------------------
// Rifa por eliminación (presenciales que ya entraron; responden con su enlace personal)
// ---------------------------------------------------------------------------

export interface RaffleQuestion {
  id: number;
  question: string;
  /** Solo llegan al celular de quien sigue en juego y al panel del equipo; la pantalla recibe []. */
  options: string[];
  options_count: number;
  status: 'draft' | 'open' | 'closed';
  duration_seconds: number;
  seconds_left: number | null;
  answers: number;
  /** Con la pregunta cerrada: cuántos salieron y cuántos siguen */
  eliminated_count: number | null;
  survivors_count: number | null;
  /** Solo el equipo y, al cerrar, los participantes; la pantalla nunca la recibe */
  correct_index: number | null;
  correct_text: string | null;
}

export interface RafflePublic {
  id: number;
  title: string;
  status: 'draft' | 'running' | 'finished';
  total: number;
  remaining: number;
  /** Nombres cortos («Diana G.») de quienes siguen; null si son demasiados para la pantalla */
  names: string[] | null;
  last_eliminated: string[] | null;
  /** Última ronda al azar (sin pregunta): cuántos salieron y, si son pocos, sus nombres */
  last_round: { number: number; count: number; names: string[] | null } | null;
  question: RaffleQuestion | null;
  winner: string | null;
}

export interface RaffleMyState {
  full_name: string;
  in_person: boolean;
  raffle: RafflePublic | null;
  me: {
    in_raffle: boolean;
    status: 'active' | 'eliminated' | 'winner' | null;
    display_name: string | null;
    answered: boolean;
    option_index: number | null;
    passed: boolean | null;
    can_answer: boolean;
    eliminated_now?: boolean;
  } | null;
}

export interface RaffleAdminItem {
  id: number;
  title: string;
  status: 'draft' | 'running' | 'finished';
  total: number;
  remaining: number;
  winner: { full_name: string; email: string; phone: string | null; document_id: string | null; display_name: string } | null;
  questions: RaffleQuestion[];
}

export interface RaffleAdminData {
  eligible_now: number;
  raffles: RaffleAdminItem[];
}

export const getRaffleState = async (): Promise<{ raffle: RafflePublic | null }> => {
  return await fetchApi('/events/raffle/state');
};

export const getMyRaffleState = async (token: string): Promise<RaffleMyState> => {
  return await fetchApi(`/events/raffle/me/${encodeURIComponent(token)}`);
};

export const answerRaffle = async (token: string, questionId: number, optionIndex: number): Promise<{ accepted: boolean }> => {
  return await fetchApi(`/events/raffle/me/${encodeURIComponent(token)}/answer`, {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, option_index: optionIndex }),
  });
};

export const getAdminRaffle = async (): Promise<RaffleAdminData> => fetchApi('/events/admin/raffle');

export const createRaffle = async (title: string): Promise<RaffleAdminData> => {
  return await fetchApi('/events/admin/raffle', { method: 'POST', body: JSON.stringify({ title }) });
};

export const addRaffleQuestion = async (
  raffleId: number, question: string, options: string[], correctIndex: number, durationSeconds: number,
): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/${raffleId}/questions`, {
    method: 'POST',
    body: JSON.stringify({ question, options, correct_index: correctIndex, duration_seconds: durationSeconds }),
  });
};

export const deleteRaffleQuestion = async (questionId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/questions/${questionId}`, { method: 'DELETE' });
};

export const startRaffle = async (raffleId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/${raffleId}/start`, { method: 'PUT' });
};

export const openRaffleQuestion = async (questionId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/questions/${questionId}/open`, { method: 'PUT' });
};

export const closeRaffleQuestion = async (questionId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/questions/${questionId}/close`, { method: 'PUT' });
};

export const drawRaffle = async (raffleId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/${raffleId}/draw`, { method: 'PUT' });
};

export const eliminateRaffleRandom = async (raffleId: number, count: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/${raffleId}/eliminate`, { method: 'PUT', body: JSON.stringify({ count }) });
};

export const resetRaffle = async (raffleId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/${raffleId}/reset`, { method: 'PUT' });
};

export const deleteRaffle = async (raffleId: number): Promise<RaffleAdminData> => {
  return await fetchApi(`/events/admin/raffle/${raffleId}`, { method: 'DELETE' });
};
