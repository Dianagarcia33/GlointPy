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

export const getMyEventRegistration = async (): Promise<AttendeeData | null> => {
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

// Admin: envía el correo de confirmación a un solo inscrito (pruebas o reenvíos).
export const sendAttendanceEmailToAttendee = async (attendeeId: number): Promise<{ sent: boolean; email: string }> => {
  return await fetchApi(`/events/admin/attendees/${attendeeId}/attendance-email`, { method: 'POST' });
};

