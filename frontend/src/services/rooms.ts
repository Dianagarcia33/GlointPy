import { fetchApi } from './api';

export interface MeetingRoom {
  id: number;
  name: string;
  description?: string | null;
  capacity: number;
  location?: string | null;
  equipment?: string | null;
  color: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface RoomReservationUser {
  id: number;
  name: string;
  email: string;
}

export interface RoomReservation {
  id: number;
  room_id: number;
  user_id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  attendees_count: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  cancelled_reason?: string | null;
  created_at?: string;
  updated_at?: string;
  room?: MeetingRoom;
  user?: RoomReservationUser;
}

export interface CreateRoomPayload {
  name: string;
  description?: string;
  capacity: number;
  location?: string;
  equipment?: string;
  color?: string;
  is_active?: boolean;
}

export interface UpdateRoomPayload {
  name?: string;
  description?: string;
  capacity?: number;
  location?: string;
  equipment?: string;
  color?: string;
  is_active?: boolean;
}

export interface CreateReservationPayload {
  room_id: number;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  attendees_count?: number;
}

export const roomsService = {
  // Salas
  getRooms: async (activeOnly: boolean = false): Promise<MeetingRoom[]> => {
    return await fetchApi(`/rooms?active_only=${activeOnly}`);
  },

  getRoomById: async (id: number): Promise<MeetingRoom> => {
    return await fetchApi(`/rooms/${id}`);
  },

  createRoom: async (payload: CreateRoomPayload): Promise<MeetingRoom> => {
    return await fetchApi('/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRoom: async (id: number, payload: UpdateRoomPayload): Promise<MeetingRoom> => {
    return await fetchApi(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteRoom: async (id: number): Promise<{ detail: string }> => {
    return await fetchApi(`/rooms/${id}`, {
      method: 'DELETE',
    });
  },

  // Reservas
  getReservations: async (params?: {
    room_id?: number;
    user_id?: number;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<RoomReservation[]> => {
    const searchParams = new URLSearchParams();
    if (params?.room_id) searchParams.append('room_id', params.room_id.toString());
    if (params?.user_id) searchParams.append('user_id', params.user_id.toString());
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);
    if (params?.status) searchParams.append('status', params.status);

    const query = searchParams.toString();
    return await fetchApi(`/rooms/reservations/calendar${query ? `?${query}` : ''}`);
  },

  getMyReservations: async (status?: string): Promise<RoomReservation[]> => {
    const query = status ? `?status=${status}` : '';
    return await fetchApi(`/rooms/reservations/my${query}`);
  },

  createReservation: async (payload: CreateReservationPayload): Promise<RoomReservation> => {
    return await fetchApi('/rooms/reservations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelReservation: async (id: number, reason?: string): Promise<RoomReservation> => {
    return await fetchApi(`/rooms/reservations/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
