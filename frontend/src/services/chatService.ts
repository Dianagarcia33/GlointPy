import { fetchApi, API_URL } from './api';
import { useAuthStore } from '../store/authStore';

export interface ChatUser {
  id: number;
  name: string;
  email: string;
  is_online?: boolean;
}


export interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'direct' | 'support' | 'group';
  other_participant?: ChatUser;
  unread_count: number;
  last_message?: ChatMessage | null;
}

export const chatService = {
  getRooms: async (): Promise<ChatRoom[]> => {
    return fetchApi('/chat/rooms');
  },

  getUsers: async (): Promise<ChatUser[]> => {
    return fetchApi('/chat/users');
  },

  getOrCreateDirectRoom: async (targetUserId: number): Promise<{ room_id: number }> => {
    return fetchApi(`/chat/rooms/direct?target_user_id=${targetUserId}`, {
      method: 'POST'
    });
  },

  getRoomMessages: async (roomId: number): Promise<ChatMessage[]> => {
    return fetchApi(`/chat/rooms/${roomId}/messages`);
  },

  getWebSocketUrl: (roomId: number): string => {
    const token = useAuthStore.getState().accessToken;
    let wsBaseUrl = API_URL.replace(/^http/, 'ws');
    return `${wsBaseUrl}/chat/ws/${roomId}?token=${encodeURIComponent(token || '')}`;
  }
};
