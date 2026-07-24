import { fetchApi } from './api';

export interface SystemEvent {
  id: number;
  type: string;
  is_recurring: number;
  recurrence_start_day: number | null;
  recurrence_end_day: number | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  is_active: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface SystemEventCreate {
  type: string;
  is_recurring: number;
  recurrence_start_day?: number | null;
  recurrence_end_day?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  is_active: number;
}

export const systemEventsService = {
  getAllEvents: async (): Promise<SystemEvent[]> => {
    return await fetchApi('/admin-system-events');
  },
  
  createEvent: async (data: SystemEventCreate): Promise<SystemEvent> => {
    return await fetchApi('/admin-system-events', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateEvent: async (id: number, data: Partial<SystemEventCreate>): Promise<SystemEvent> => {
    return await fetchApi(`/admin-system-events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteEvent: async (id: number): Promise<void> => {
    await fetchApi(`/admin-system-events/${id}`, {
      method: 'DELETE'
    });
  }
};
