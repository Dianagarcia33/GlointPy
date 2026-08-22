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
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
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

  uploadFile: async (roomId: number, file: File, content?: string): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('room_id', roomId.toString());
    formData.append('file', file);
    if (content) formData.append('content', content);
    return fetchApi('/chat/upload', {
      method: 'POST',
      body: formData
    });
  },

  markAsRead: async (roomId: number): Promise<{ message: string }> => {
    return fetchApi(`/chat/rooms/${roomId}/read`, {
      method: 'POST'
    });
  },

  getWebSocketUrl: (roomId: number): string => {
    const token = useAuthStore.getState().accessToken;
    let wsBaseUrl = API_URL.replace(/^http/, 'ws');
    return `${wsBaseUrl}/chat/ws/${roomId}?token=${encodeURIComponent(token || '')}`;
  }
};
