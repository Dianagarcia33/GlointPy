import { fetchApi } from './api';

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
}

export interface PublicRsvpPayload {
  full_name: string;
  email: string;
  phone?: string;
  document_id?: string;
  city?: string;
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
