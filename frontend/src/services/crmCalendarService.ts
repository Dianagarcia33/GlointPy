import { fetchApi } from './api';

export interface CalendarEventAttendee {
  name: string;
  email: string;
}

export interface CalendarEvent {
  uid: string;
  title: string;
  start: string; // ISO string YYYY-MM-DDTHH:MM:SS
  end: string;
  description?: string;
  location?: string;
  status?: string;
  organizer?: CalendarEventAttendee;
  attendees?: CalendarEventAttendee[];
  url?: string;
  calendar_url?: string;
}

export interface GetCalendarEventsResponse {
  events: CalendarEvent[];
  count: number;
  needs_password?: boolean;
  message?: string;
  server_host?: string;
  account?: string;
}

export interface CreateCalendarEventPayload {
  title: string;
  start_datetime: string;
  end_datetime: string;
  description?: string;
  location?: string;
  lead_id?: number;
  imap_password?: string;
}

export const crmCalendarService = {
  getEvents: async (params?: {
    startDate?: string;
    endDate?: string;
    imapPassword?: string;
  }): Promise<GetCalendarEventsResponse> => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('start_date', params.startDate);
    if (params?.endDate) query.append('end_date', params.endDate);
    if (params?.imapPassword) query.append('imap_password', params.imapPassword);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/crm/calendar/events${qStr}`);
  },

  syncCalendar: async (payload: {
    imap_password?: string;
    save_password?: boolean;
  }): Promise<{ success: boolean; data: GetCalendarEventsResponse; has_saved_password: boolean }> => {
    return fetchApi('/crm/calendar/sync', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  createEvent: async (payload: CreateCalendarEventPayload): Promise<{
    success: boolean;
    uid: string;
    event_url: string;
    message: string;
  }> => {
    return fetchApi('/crm/calendar/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteEvent: async (
    eventUid: string,
    params?: { calendarUrl?: string; imapPassword?: string }
  ): Promise<{ success: boolean; message: string }> => {
    const query = new URLSearchParams();
    if (params?.calendarUrl) query.append('calendar_url', params.calendarUrl);
    if (params?.imapPassword) query.append('imap_password', params.imapPassword);
    const qStr = query.toString() ? `?${query.toString()}` : '';
    return fetchApi(`/crm/calendar/events/${encodeURIComponent(eventUid)}${qStr}`, {
      method: 'DELETE'
    });
  }
};
