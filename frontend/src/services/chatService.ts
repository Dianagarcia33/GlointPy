import { fetchApi, API_URL } from './api';
import { useAuthStore } from '../store/authStore';

export interface ChatUser {
  id: number;
  name: string;
  email: string;
  is_online?: boolean;
}

export interface MessageReactionUser {
  id: number;
  name: string;
}

export interface MessageReactionGroup {
  emoji: string;
  count: number;
  users: MessageReactionUser[];
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
  reply_to?: {
    id: number;
    sender_id: number;
    sender_name: string;
    content: string;
    file_name?: string | null;
    file_type?: string | null;
  } | null;
  reactions?: MessageReactionGroup[];
  is_read: boolean;
  created_at: string;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'direct' | 'support' | 'group';
  avatar_url?: string | null;
  other_participant?: ChatUser;
  participants?: ChatUser[];
  participants_count?: number;
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

  createGroupRoom: async (name: string, participantIds: number[], avatar?: File | null): Promise<{ room_id: number; name: string; avatar_url?: string | null }> => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('participant_ids', JSON.stringify(participantIds));
    if (avatar) {
      formData.append('avatar', avatar);
    }
    return fetchApi('/chat/rooms/group', {
      method: 'POST',
      body: formData
    });
  },

  getRoomMessages: async (roomId: number): Promise<ChatMessage[]> => {
    return fetchApi(`/chat/rooms/${roomId}/messages`);
  },

  uploadFile: async (roomId: number, file: File, content?: string, replyToId?: number | null): Promise<ChatMessage> => {
    const formData = new FormData();
    formData.append('room_id', roomId.toString());
    formData.append('file', file);
    if (content) formData.append('content', content);
    if (replyToId) formData.append('reply_to_id', replyToId.toString());
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

  toggleReaction: async (messageId: number, emoji: string): Promise<{ room_id: number; message_id: number; reactions: MessageReactionGroup[] }> => {
    return fetchApi(`/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  },

  getWebSocketUrl: (roomId: number): string => {
    const token = useAuthStore.getState().accessToken;
    let wsBaseUrl = API_URL.replace(/^http/, 'ws');
    return `${wsBaseUrl}/chat/ws/${roomId}?token=${encodeURIComponent(token || '')}`;
  },

  getGlobalWebSocketUrl: (): string => {
    const token = useAuthStore.getState().accessToken;
    let wsBaseUrl = API_URL.replace(/^http/, 'ws');
    return `${wsBaseUrl}/chat/ws/notifications/global?token=${encodeURIComponent(token || '')}`;
  }
};
